"""Tests for the guarded SQLite-to-PostgreSQL data-copy utility.

These tests use only temporary SQLite databases. They never use DATABASE_URL
or connect to Neon/PostgreSQL.
"""
import hashlib
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, select, text

import migrate_sqlite_to_postgres as migration
from app.database import Base
from app.models import Admin, AdminAccessRequest, Project, SiteSettings, TeamMember


class MigrationUtilityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="pixel %20 space # café ")
        self.root = Path(self.temporary.name)
        self.source_path = self.root / "source %20 # café.sqlite3"
        self._create_source(self.source_path)
        self.target = create_engine(f"sqlite:///{(self.root / 'target.sqlite3').as_posix()}")
        Base.metadata.create_all(self.target)
        with self.target.begin() as connection:
            connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": migration.REQUIRED_ALEMBIC_REVISION},
            )

    def tearDown(self):
        self.target.dispose()
        self.temporary.cleanup()

    @staticmethod
    def _create_source(path: Path):
        with closing(sqlite3.connect(path)) as connection:
            connection.executescript(
                """
                CREATE TABLE admins (id INTEGER PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL);
                CREATE TABLE projects (
                    id INTEGER PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
                    description TEXT NOT NULL, video_url TEXT NOT NULL, thumbnail_url TEXT NOT NULL,
                    featured INTEGER NOT NULL, sort_order INTEGER NOT NULL
                );
                CREATE TABLE team_members (
                    id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, bio TEXT NOT NULL,
                    photo_url TEXT NOT NULL, social_url TEXT NOT NULL, sort_order INTEGER NOT NULL
                );
                CREATE TABLE site_settings (
                    id INTEGER PRIMARY KEY, studio_name TEXT NOT NULL, tagline TEXT NOT NULL,
                    bio TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, location TEXT NOT NULL,
                    whatsapp_number TEXT NOT NULL, booking_message TEXT NOT NULL, instagram_url TEXT NOT NULL,
                    facebook_url TEXT NOT NULL, youtube_url TEXT NOT NULL
                );
                INSERT INTO admins VALUES (37, 'owner@example.test', 'bcrypt-hash-must-stay-private');
                INSERT INTO projects VALUES
                    (81, 'Night Drive', 'Commercial', 'Grade and motion edit', 'https://youtu.be/abc123',
                     'https://img.example.test/night.jpg', 1, 4);
                INSERT INTO team_members VALUES
                    (93, 'Editor One', 'Editor', 'Story first', '/editor.jpg', 'https://example.test', 2);
                INSERT INTO site_settings VALUES
                    (1, 'PIXEL WRLD', 'Stories in motion.', 'Studio bio', 'hello@example.test',
                     '+919500000000', 'Mumbai', '+919500000000', 'Let us talk', 'https://instagram.test/pw',
                     'https://facebook.test/pw', 'https://youtube.test/pw');
                """
            )
            connection.commit()

    def _target_count(self, model):
        with self.target.connect() as connection:
            return connection.execute(select(model.id)).all().__len__()

    def test_uri_escapes_windows_style_special_path_and_is_read_only(self):
        uri = migration.sqlite_read_only_uri(self.source_path)
        self.assertIn("%2520", uri)  # literal percent followed by 20
        self.assertIn("%20", uri)  # spaces
        self.assertIn("%23", uri)  # # is a URI fragment marker unless escaped

        before = hashlib.sha256(self.source_path.read_bytes()).digest()
        with migration.read_only_sqlite(self.source_path) as connection:
            self.assertEqual(connection.execute("SELECT count(*) FROM admins").fetchone()[0], 1)
            with self.assertRaises(sqlite3.OperationalError):
                connection.execute("INSERT INTO admins VALUES (100, 'x', 'y')")
        self.assertEqual(hashlib.sha256(self.source_path.read_bytes()).digest(), before)

    def test_backup_is_unique_verified_and_read_only(self):
        backup_dir = self.root / "backup folder %20 # café"
        source_hash = hashlib.sha256(self.source_path.read_bytes()).digest()
        backup_path = migration.make_sqlite_backup(self.source_path, backup_dir)
        self.assertTrue(backup_path.is_file())
        self.assertEqual(hashlib.sha256(self.source_path.read_bytes()).digest(), source_hash)
        with migration.read_only_sqlite(backup_path) as connection:
            self.assertEqual(connection.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(connection.execute("SELECT id FROM admins").fetchone()[0], 37)
            with self.assertRaises(sqlite3.OperationalError):
                connection.execute("DELETE FROM admins")

    def test_successful_copy_preserves_ids_fields_and_new_defaults(self):
        counts = migration.copy_data(self.source_path, self.target)
        self.assertEqual(counts, {"admins": 1, "projects": 1, "team_members": 1, "site_settings": 1, "admin_access_requests": 0})

        with self.target.connect() as connection:
            admin = connection.execute(select(*Admin.__table__.columns)).mappings().one()
            self.assertEqual((admin["id"], admin["email"], admin["password_hash"]), (37, "owner@example.test", "bcrypt-hash-must-stay-private"))
            self.assertIsNone(admin["google_sub"])
            self.assertFalse(admin["is_active"])
            self.assertFalse(admin["is_super_admin"])

            project = connection.execute(select(*Project.__table__.columns)).mappings().one()
            self.assertEqual(project["id"], 81)
            self.assertEqual(project["title"], "Night Drive")
            self.assertEqual(project["category"], "Commercial")
            self.assertEqual(project["description"], "Grade and motion edit")
            self.assertEqual(project["video_url"], "https://youtu.be/abc123")
            self.assertEqual(project["thumbnail_url"], "https://img.example.test/night.jpg")
            self.assertTrue(project["featured"])
            self.assertEqual(project["sort_order"], 4)

            team = connection.execute(select(*TeamMember.__table__.columns)).mappings().one()
            self.assertEqual((team["id"], team["name"], team["role"], team["bio"], team["photo_url"], team["social_url"], team["sort_order"]), (93, "Editor One", "Editor", "Story first", "/editor.jpg", "https://example.test", 2))

            settings = connection.execute(select(*SiteSettings.__table__.columns)).mappings().one()
            self.assertEqual(settings["id"], 1)
            self.assertEqual(settings["studio_name"], "PIXEL WRLD")
            self.assertEqual(settings["tagline"], "Stories in motion.")
            self.assertEqual(settings["bio"], "Studio bio")
            self.assertEqual(settings["email"], "hello@example.test")
            self.assertEqual(settings["phone"], "+919500000000")
            self.assertEqual(settings["location"], "Mumbai")
            self.assertEqual(settings["whatsapp_number"], "+919500000000")
            self.assertEqual(settings["booking_message"], "Let us talk")
            self.assertEqual(settings["instagram_url"], "https://instagram.test/pw")
            self.assertEqual(settings["facebook_url"], "https://facebook.test/pw")
            self.assertEqual(settings["youtube_url"], "https://youtube.test/pw")
            self.assertEqual(settings["linkedin_url"], "")
            self.assertEqual(settings["tiktok_url"], "")
            self.assertEqual(settings["behance_url"], "")
            self.assertEqual(settings["pinterest_url"], "")
            self.assertEqual(connection.execute(select(AdminAccessRequest.id)).all(), [])

    def test_value_verification_failure_rolls_back_all_copied_rows(self):
        original_verify = migration.verify_copied_data

        def corrupt_then_verify(connection, expected_rows):
            connection.execute(Project.__table__.update().values(title="tampered"))
            return original_verify(connection, expected_rows)

        with patch.object(migration, "verify_copied_data", side_effect=corrupt_then_verify):
            with self.assertRaisesRegex(RuntimeError, "value verification failed") as error:
                migration.copy_data(self.source_path, self.target)
        self.assertNotIn("bcrypt-hash-must-stay-private", str(error.exception))
        self.assertEqual(self._target_count(Admin), 0)
        self.assertEqual(self._target_count(Project), 0)
        self.assertEqual(self._target_count(TeamMember), 0)
        self.assertEqual(self._target_count(SiteSettings), 0)

    def test_non_empty_target_is_rejected_without_overwriting_existing_rows(self):
        with self.target.begin() as connection:
            connection.execute(Project.__table__.insert().values(id=500, title="Keep me"))
        with self.assertRaisesRegex(RuntimeError, "not empty"):
            migration.copy_data(self.source_path, self.target)
        with self.target.connect() as connection:
            projects = connection.execute(select(Project.id, Project.title)).all()
        self.assertEqual(projects, [(500, "Keep me")])
        self.assertEqual(self._target_count(Admin), 0)


if __name__ == "__main__":
    unittest.main()
