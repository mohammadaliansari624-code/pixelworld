"""Copy the existing SQLite records into an empty PostgreSQL schema.

Run only after setting DATABASE_URL and applying Alembic migrations. The source
SQLite database is opened read-only and copied to a timestamped backup first.
"""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import Engine

from app.config import settings
from app.database import engine as postgres_engine
from app.models import Admin, Project, SiteSettings, TeamMember

BACKEND_DIR = Path(__file__).resolve().parent
SQLITE_PATH = BACKEND_DIR / "pixelwrld.db"
BACKUP_DIR = BACKEND_DIR / "backups"
MODELS = (Admin, Project, TeamMember, SiteSettings)


def make_sqlite_backup() -> Path:
    if not SQLITE_PATH.is_file():
        raise FileNotFoundError(f"SQLite source database not found: {SQLITE_PATH.name}")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"pixelwrld-pre-postgres-{timestamp}.db"
    with sqlite3.connect(f"file:{SQLITE_PATH.as_posix()}?mode=ro", uri=True) as source:
        with sqlite3.connect(backup_path) as backup:
            source.backup(backup)
    with sqlite3.connect(backup_path) as backup:
        result = backup.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok":
        backup_path.unlink(missing_ok=True)
        raise RuntimeError("SQLite backup integrity check failed")
    return backup_path


def ensure_target_is_empty(target: Engine):
    inspector = inspect(target)
    table_names = {model.__tablename__ for model in MODELS} | {"admin_access_requests"}
    missing = table_names - set(inspector.get_table_names())
    if missing:
        raise RuntimeError("PostgreSQL schema is not initialized; run alembic upgrade head first")
    with target.connect() as connection:
        counts = {name: connection.execute(text(f'SELECT count(*) FROM "{name}"')).scalar_one() for name in table_names}
    if any(counts.values()):
        raise RuntimeError("PostgreSQL application tables are not empty; refusing to overwrite or merge data")


def row_with_defaults(model, row):
    values = dict(row)
    for column in model.__table__.columns:
        if column.name not in values and column.default is not None:
            default = column.default.arg
            values[column.name] = default() if callable(default) else default
    return {column.name: values[column.name] for column in model.__table__.columns if column.name in values}


def copy_data(source_path: Path, target: Engine):
    source = create_engine(f"sqlite:///{source_path.as_posix()}")
    expected = {}
    try:
        with source.connect() as source_connection, target.begin() as target_connection:
            source_inspector = inspect(source)
            for model in MODELS:
                table_name = model.__tablename__
                source_columns = {column["name"] for column in source_inspector.get_columns(table_name)}
                shared_columns = [column for column in model.__table__.columns if column.name in source_columns]
                rows = source_connection.execute(select(*shared_columns)).mappings().all()
                expected[table_name] = len(rows)
                if rows:
                    target_connection.execute(model.__table__.insert(), [row_with_defaults(model, row) for row in rows])

            for model in MODELS:
                table_name = model.__tablename__
                max_id = target_connection.execute(text(f'SELECT max(id) FROM "{table_name}"')).scalar_one()
                if max_id is not None:
                    target_connection.execute(
                        text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :max_id, true)"),
                        {"table_name": table_name, "max_id": max_id},
                    )
    finally:
        source.dispose()

    with target.connect() as connection:
        actual = {
            model.__tablename__: connection.execute(select(func.count()).select_from(model.__table__)).scalar_one()
            for model in MODELS
        }
    if actual != expected:
        raise RuntimeError("Post-migration row counts did not match the SQLite source")
    return actual


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
