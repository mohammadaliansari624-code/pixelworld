"""Legacy seed command retained for compatibility. Admins are now bootstrapped by Google Sign-In."""
from sqlalchemy import inspect
from app.database import engine, SessionLocal
from app.models import SiteSettings

if not inspect(engine).has_table("site_settings"):
    raise SystemExit("Database schema is missing. Run 'alembic upgrade head' first.")

with SessionLocal() as db:
    if not db.get(SiteSettings, 1):
        db.add(SiteSettings(id=1))
        db.commit()

print("Site settings are ready. The super admin is created on first verified Google sign-in.")
