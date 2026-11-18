"""Copy SQLite records into an empty PostgreSQL schema.

Run only after configuring DATABASE_URL and applying Alembic migrations. The
SQLite source is opened with URI mode=ro and copied to a unique verified backup.

PostgreSQL sequence ``setval`` changes are not transactional: PostgreSQL does
not roll them back if a transaction later fails. This utility performs all row
verification before sequence updates, and rolls back application rows on any
failure. A partial sequence advance can leave harmless gaps, but never copied
or overwritten records.
"""
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
from typing import Iterator
from uuid import uuid4

from sqlalchemy import inspect, select, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.sql.sqltypes import Boolean

from app.config import settings
from app.database import engine as postgres_engine
from app.models import Admin, AdminAccessRequest, Project, SiteSettings, TeamMember

BACKEND_DIR = Path(__file__).resolve().parent
SQLITE_PATH = BACKEND_DIR / "pixelwrld.db"
BACKUP_DIR = BACKEND_DIR / "backups"
MODELS = (Admin, Project, TeamMember, SiteSettings)
ALL_MODELS = (*MODELS, AdminAccessRequest)
TARGET_TABLES = tuple(model.__tablename__ for model in ALL_MODELS)
REQUIRED_SOURCE_COLUMNS = {
    "admins": {"id", "email", "password_hash"},
    "projects": {"id", "title", "category", "description", "video_url", "thumbnail_url", "featured", "sort_order"},
    "team_members": {"id", "name", "role", "bio", "photo_url", "social_url", "sort_order"},
    "site_settings": {"id", "studio_name", "tagline", "bio", "email", "phone", "location", "whatsapp_number", "booking_message", "instagram_url", "facebook_url", "youtube_url"},
}
REQUIRED_ALEMBIC_REVISION = "20261117_0003"


def sqlite_read_only_uri(path: Path) -> str:
    """Return a SQLite file URI with all path characters correctly escaped.

    Path.as_uri() escapes spaces, percent signs, question marks, hashes, and
    non-ASCII characters. In particular, a literal ``%20`` in a Windows path
    is encoded as ``%2520`` instead of being mistaken for a space escape.
    """
    return f"{Path(path).resolve().as_uri()}?mode=ro"


def open_sqlite_read_only(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(sqlite_read_only_uri(path), uri=True)


@contextmanager
def read_only_sqlite(path: Path) -> Iterator[sqlite3.Connection]:
    connection = open_sqlite_read_only(path)
    try:
        yield connection
    finally:
        connection.close()


def _quote_sqlite_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def _check_sqlite_integrity(connection: sqlite3.Connection, label: str) -> None:
    result = connection.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok":
        raise RuntimeError(f"{label} SQLite integrity check failed")


def make_sqlite_backup(sqlite_path: Path = SQLITE_PATH, backup_dir: Path = BACKUP_DIR) -> Path:
    """Create a unique verified backup without ever writing to the source."""
    sqlite_path = Path(sqlite_path).resolve()
    backup_dir = Path(backup_dir).resolve()
    if not sqlite_path.is_file():
        raise FileNotFoundError(f"SQLite source database not found: {sqlite_path.name}")
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = backup_dir / f"pixelwrld-pre-postgres-{timestamp}-{uuid4().hex[:8]}.db"

    # Exclusive creation prevents even a timestamp/UUID collision from
    # truncating an existing backup. Keep a failed new backup for inspection.
    descriptor = os.open(backup_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(descriptor)
    with read_only_sqlite(sqlite_path) as source:
        _check_sqlite_integrity(source, "Source")
        with closing(sqlite3.connect(str(backup_path))) as backup:
            with backup:
                source.backup(backup)

    with read_only_sqlite(backup_path) as backup:
        _check_sqlite_integrity(backup, "Backup")
    return backup_path


def _validate_target_schema(connection: Connection) -> None:
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names())
    missing_tables = set(TARGET_TABLES) - existing_tables
    if missing_tables:
        raise RuntimeError("PostgreSQL schema is incomplete; run alembic upgrade head first")

    for model in ALL_MODELS:
        actual_columns = {column["name"] for column in inspector.get_columns(model.__tablename__)}
        expected_columns = {column.name for column in model.__table__.columns}
        if expected_columns - actual_columns:
            raise RuntimeError(f"PostgreSQL schema is missing columns for {model.__tablename__}")

    if "alembic_version" not in existing_tables:
        raise RuntimeError("Alembic schema revision is missing; run alembic upgrade head first")
    revisions = connection.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
    if len(revisions) != 1 or revisions[0] != REQUIRED_ALEMBIC_REVISION:
        raise RuntimeError(f"PostgreSQL schema must be at Alembic revision {REQUIRED_ALEMBIC_REVISION}")


def _lock_target_tables(connection: Connection) -> None:
    """Block concurrent app writes while checking emptiness and copying rows."""
    if connection.dialect.name != "postgresql":
        return
    preparer = connection.dialect.identifier_preparer
    names = ", ".join(preparer.quote(name) for name in sorted(TARGET_TABLES))
    connection.exec_driver_sql(f"LOCK TABLE {names} IN ACCESS EXCLUSIVE MODE")


def ensure_target_is_empty(target: Engine | Connection) -> None:
    """Require the full current schema and empty application tables."""
    if isinstance(target, Engine):
        with target.connect() as connection:
            _ensure_connection_is_empty(connection)
    else:
        _ensure_connection_is_empty(target)


def _ensure_connection_is_empty(connection: Connection) -> None:
    _validate_target_schema(connection)
    counts = {
        name: connection.execute(text(f"SELECT count(*) FROM {connection.dialect.identifier_preparer.quote(name)}")).scalar_one()
        for name in TARGET_TABLES
    }
    if any(counts.values()):
        raise RuntimeError("PostgreSQL application tables are not empty; refusing to overwrite or merge data")


def row_with_defaults(model, row):
    """Map source columns and explicit Python defaults into the current model."""
    values = dict(row)
    for column in model.__table__.columns:
        if column.name in values:
            continue
        if column.default is not None:
            default = column.default.arg
            values[column.name] = default() if callable(default) else default
        elif column.nullable:
            values[column.name] = None
        else:
            raise RuntimeError(f"SQLite source is missing required column {model.__tablename__}.{column.name}")
    return {column.name: values[column.name] for column in model.__table__.columns}


def _read_source_rows(source: sqlite3.Connection, model) -> list[dict]:
    table_name = model.__tablename__
    table = _quote_sqlite_identifier(table_name)
    source_columns = {row[1] for row in source.execute(f"PRAGMA table_info({table})")}
    required = REQUIRED_SOURCE_COLUMNS[table_name]
    if required - source_columns:
        raise RuntimeError(f"SQLite source is missing required columns for {table_name}")

    columns = [column.name for column in model.__table__.columns if column.name in source_columns]
    selected = ", ".join(_quote_sqlite_identifier(name) for name in columns)
    id_column = _quote_sqlite_identifier("id")
    rows = source.execute(f"SELECT {selected} FROM {table} ORDER BY {id_column}").fetchall()
    return [row_with_defaults(model, dict(zip(columns, row))) for row in rows]


def _normalize_for_comparison(column, value):
    if value is None:
        return None
    if isinstance(column.type, Boolean):
        return bool(value)
    return value


def verify_copied_data(connection: Connection, expected_rows: dict[str, list[dict]]) -> dict[str, int]:
    """Compare every copied field, including defaults, before commit."""
    counts: dict[str, int] = {}
    for model in MODELS:
        table_name = model.__tablename__
        columns = list(model.__table__.columns)
        statement = select(*columns).order_by(model.__table__.c.id)
        actual_rows = connection.execute(statement).mappings().all()
        expected = expected_rows[table_name]
        counts[table_name] = len(actual_rows)
        if len(actual_rows) != len(expected):
            raise RuntimeError(f"Post-copy row count verification failed for {table_name}")

        for expected_row, actual_row in zip(expected, actual_rows):
            for column in columns:
                left = _normalize_for_comparison(column, expected_row[column.name])
                right = _normalize_for_comparison(column, actual_row[column.name])
                if left != right:
                    # Never include field values in errors: this includes
                    # password hashes and user-managed portfolio content.
                    raise RuntimeError(f"Post-copy value verification failed for {table_name}.{column.name}")

    request_count = connection.execute(select(AdminAccessRequest.id)).all()
    if request_count:
        raise RuntimeError("New admin access-request table was unexpectedly populated")
    counts[AdminAccessRequest.__tablename__] = 0
    return counts


def _advance_postgres_sequences(connection: Connection) -> None:
    """Align serial IDs after successful row verification.

    PostgreSQL ``setval`` is not rolled back. Calls are therefore last, after
    all data checks; a later sequence error still rolls back rows, but sequence
    values already changed can remain advanced, causing harmless ID gaps.
    """
    if connection.dialect.name != "postgresql":
        return
    for model in MODELS:
        table_name = model.__tablename__
        max_id = connection.execute(text(f"SELECT max(id) FROM {connection.dialect.identifier_preparer.quote(table_name)}")).scalar_one()
        if max_id is not None:
            connection.execute(
                text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :max_id, true)"),
                {"table_name": table_name, "max_id": max_id},
            )


def copy_data(source_path: Path, target: Engine) -> dict[str, int]:
    """Copy validated rows atomically; any row/data check failure rolls back."""
    expected_rows: dict[str, list[dict]] = {}
    with read_only_sqlite(Path(source_path)) as source:
        with target.begin() as connection:
            _validate_target_schema(connection)
            _check_sqlite_integrity(source, "SQLite copy source")
            for model in MODELS:
                expected_rows[model.__tablename__] = _read_source_rows(source, model)

            # All data is ready before taking table locks. Recheck emptiness
            # under the same transaction/locks immediately before inserts.
            _lock_target_tables(connection)
            _ensure_connection_is_empty(connection)

            for model in MODELS:
                rows = expected_rows[model.__tablename__]
                if rows:
                    connection.execute(model.__table__.insert(), rows)

            counts = verify_copied_data(connection, expected_rows)
            _advance_postgres_sequences(connection)
    return counts


def main():
    if not settings.database_url.startswith("postgresql+psycopg://"):
        raise RuntimeError("DATABASE_URL must point to PostgreSQL using psycopg 3")
    ensure_target_is_empty(postgres_engine)
    backup_path = make_sqlite_backup()
    counts = copy_data(backup_path, postgres_engine)
    print(f"SQLite backup verified: {backup_path.relative_to(BACKEND_DIR)}")
    print("Copied and verified rows: " + ", ".join(f"{name}={count}" for name, count in counts.items()))
    print("The original SQLite database and upload files were left in place.")


if __name__ == "__main__":
    main()
