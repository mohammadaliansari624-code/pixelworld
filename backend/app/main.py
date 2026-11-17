
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlsplit

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from . import models, schemas
from .security import create_token, current_admin


app = FastAPI(title="Pixel Wrld API", version="1.0.0")


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

allowed_origins = [
    settings.frontend_origin.rstrip("/"),
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Remove duplicate origins
allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# UPLOAD CONFIGURATION
# --------------------------------------------------

UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent / settings.upload_dir
).resolve()

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)

MAX_IMAGE_SIZE = 8 * 1024 * 1024

IMAGE_TYPES = {
    "image/jpeg": (
        ".jpg",
        lambda b: b.startswith(b"\xff\xd8\xff"),
    ),
    "image/png": (
        ".png",
        lambda b: b.startswith(b"\x89PNG\r\n\x1a\n"),
    ),
    "image/webp": (
        ".webp",
        lambda b: (
            len(b) >= 12
            and b[:4] == b"RIFF"
            and b[8:12] == b"WEBP"
        ),
    ),
    "image/gif": (
        ".gif",
        lambda b: b.startswith((b"GIF87a", b"GIF89a")),
    ),
}


def _cleanup_uploaded_image_if_unused(db: Session, image_url: str):
    """Remove a managed upload only after no project or team member references it."""
    if not image_url:
        return

    image_path = urlsplit(image_url).path
    if not image_path.startswith("/uploads/"):
        return

    filename = Path(image_path).name
    if not filename or filename in {".", ".."}:
        return

    candidate = (UPLOAD_DIR / filename).resolve()
    if candidate.parent != UPLOAD_DIR:
        return

    references = [
        *db.query(models.Project.thumbnail_url).all(),
        *db.query(models.TeamMember.photo_url).all(),
    ]
    for (reference,) in references:
        if reference and urlsplit(reference).path == image_path:
            return

    try:
        candidate.unlink(missing_ok=True)
    except OSError:
        # A stale upload is safer than failing a successfully saved API operation.
        pass


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------

@app.post("/api/auth/google")
def google_login(data: schemas.GoogleCredentialInput, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google Sign-In is not configured yet")
    try:
        identity = id_token.verify_oauth2_token(
            data.credential, google_requests.Request(), settings.google_client_id
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Google credential is invalid or expired")

    email = str(identity.get("email", "")).strip().lower()
    google_sub = str(identity.get("sub", "")).strip()
    if not email or not google_sub or identity.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Use a Google account with a verified email address")

    linked_admin = db.query(models.Admin).filter(models.Admin.google_sub == google_sub).first()
    if linked_admin and linked_admin.email.lower() != email:
        raise HTTPException(status_code=403, detail="This Google identity is already linked to a different admin email")

    is_owner = email == settings.super_admin_email.strip().lower()
    admin = db.query(models.Admin).filter(models.Admin.email == email).first()

    if is_owner:
        if not admin:
            admin = models.Admin(email=email, password_hash=None, google_sub=google_sub, is_active=True, is_super_admin=True)
            db.add(admin)
        else:
            if admin.google_sub and admin.google_sub != google_sub:
                raise HTTPException(status_code=403, detail="This owner email is already linked to another Google identity")
            admin.google_sub = google_sub
            admin.is_active = True
            admin.is_super_admin = True
        db.commit()
        db.refresh(admin)
        return {"status": "approved", "access_token": create_token(admin.id), "token_type": "bearer", "email": admin.email, "is_super_admin": True}

    if admin and admin.is_active:
        if admin.google_sub and admin.google_sub != google_sub:
            raise HTTPException(status_code=403, detail="This email is linked to a different Google account")
        admin.google_sub = google_sub
        db.commit()
        return {"status": "approved", "access_token": create_token(admin.id), "token_type": "bearer", "email": admin.email, "is_super_admin": admin.is_super_admin}

    access_request = db.query(models.AdminAccessRequest).filter(models.AdminAccessRequest.email == email).first()
    if access_request and access_request.status == "rejected":
        return {"status": "rejected", "message": "Your admin access request was declined. Contact the Pixel Wrld owner."}
    if not access_request:
        access_request = models.AdminAccessRequest(
            email=email, google_sub=google_sub, name=str(identity.get("name", ""))[:255],
            picture=str(identity.get("picture", ""))[:1000], status="pending"
        )
        db.add(access_request)
    else:
        access_request.google_sub = google_sub
        access_request.name = str(identity.get("name", ""))[:255]
        access_request.picture = str(identity.get("picture", ""))[:1000]
    db.commit()
    return {"status": "pending", "message": "Your access request has been sent to the Pixel Wrld owner. You can sign in after approval."}

@app.get("/api/auth/me")
def auth_me(admin: models.Admin = Depends(current_admin)):
    return {"id": admin.id, "email": admin.email, "is_super_admin": admin.is_super_admin}


# --------------------------------------------------
# PUBLIC WEBSITE DATA
# --------------------------------------------------

@app.get("/api/public")
def public_data(db: Session = Depends(get_db)):
    projects = (
        db.query(models.Project)
        .order_by(
            models.Project.sort_order,
            models.Project.id.desc(),
        )
        .all()
    )

    team = (
        db.query(models.TeamMember)
        .order_by(
            models.TeamMember.sort_order,
            models.TeamMember.id,
        )
        .all()
    )

    settings_row = db.get(models.SiteSettings, 1)

    if not settings_row:
        settings_row = models.SiteSettings(id=1)
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)

    return {
        "projects": [
            schemas.ProjectOut.model_validate(x)
            for x in projects
        ],
        "team": [
            schemas.TeamOut.model_validate(x)
            for x in team
        ],
        "settings": schemas.SettingsOut.model_validate(
            settings_row
        ),
    }


# --------------------------------------------------
# IMAGE UPLOAD
# --------------------------------------------------

@app.post("/api/admin/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    _: models.Admin = Depends(current_admin),
):
    """Upload a portfolio thumbnail or team photo. Max size: 8 MiB."""

    content_type = (file.content_type or "").lower()
    image_type = IMAGE_TYPES.get(content_type)

    if not image_type:
        raise HTTPException(
            status_code=415,
            detail="Only JPG, PNG, WEBP and GIF images are allowed",
        )

    content = await file.read(MAX_IMAGE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The selected file is empty",
        )

    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be 8 MB or smaller",
        )

    extension, signature_check = image_type

    if not signature_check(content):
        raise HTTPException(
            status_code=415,
            detail="The file contents do not match the image type",
        )

    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(content)

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
    }


# --------------------------------------------------
# SUPER ADMIN: ACCESS MANAGEMENT
# --------------------------------------------------
def require_super_admin(admin: models.Admin = Depends(current_admin)):
    if not admin.is_super_admin or admin.email.lower() != settings.super_admin_email.strip().lower():
        raise HTTPException(status_code=403, detail="Only the Pixel Wrld owner can manage admin access")
    return admin

@app.get("/api/admin/access/requests")
def list_access_requests(db: Session = Depends(get_db), _: models.Admin = Depends(require_super_admin)):
    rows = db.query(models.AdminAccessRequest).order_by(models.AdminAccessRequest.created_at.desc()).all()
    return [{"id": row.id, "email": row.email, "name": row.name, "picture": row.picture, "status": row.status, "created_at": row.created_at.isoformat() if row.created_at else None} for row in rows]

@app.get("/api/admin/access/admins")
def list_admin_accounts(db: Session = Depends(get_db), _: models.Admin = Depends(require_super_admin)):
    rows = db.query(models.Admin).order_by(models.Admin.is_super_admin.desc(), models.Admin.email.asc()).all()
    return [{"id": row.id, "email": row.email, "is_active": row.is_active, "is_super_admin": row.is_super_admin} for row in rows]

@app.post("/api/admin/access/grant")
def grant_admin_access(data: schemas.AdminGrantInput, db: Session = Depends(get_db), owner: models.Admin = Depends(require_super_admin)):
    email = str(data.email).strip().lower()
    if email == owner.email.lower():
        raise HTTPException(status_code=400, detail="Owner access is already active")
    admin = db.query(models.Admin).filter(models.Admin.email == email).first()
    if not admin:
        admin = models.Admin(email=email, password_hash=None, google_sub=None, is_active=True, is_super_admin=False)
        db.add(admin)
    else:
        admin.is_active = True
        admin.is_super_admin = False
    pending = db.query(models.AdminAccessRequest).filter(models.AdminAccessRequest.email == email).first()
    if pending:
        pending.status = "approved"
    db.commit()
    return {"ok": True, "email": email, "message": "Admin access granted. This person must sign in with the same Google email."}

@app.post("/api/admin/access/requests/{request_id}/approve")
def approve_access_request(request_id: int, db: Session = Depends(get_db), owner: models.Admin = Depends(require_super_admin)):
    access_request = db.get(models.AdminAccessRequest, request_id)
    if not access_request:
        raise HTTPException(status_code=404, detail="Access request not found")
    if access_request.email.lower() == owner.email.lower():
        raise HTTPException(status_code=400, detail="Owner account cannot be changed here")
    admin = db.query(models.Admin).filter(models.Admin.email == access_request.email).first()
    if not admin:
        admin = models.Admin(email=access_request.email, password_hash=None, google_sub=access_request.google_sub, is_active=True, is_super_admin=False)
        db.add(admin)
    else:
        if admin.google_sub and admin.google_sub != access_request.google_sub:
            raise HTTPException(status_code=409, detail="Google identity mismatch; verify this account before approval")
        admin.google_sub = access_request.google_sub
        admin.is_active = True
        admin.is_super_admin = False
    access_request.status = "approved"
    db.commit()
    return {"ok": True, "email": access_request.email}

@app.post("/api/admin/access/requests/{request_id}/reject")
def reject_access_request(request_id: int, db: Session = Depends(get_db), _: models.Admin = Depends(require_super_admin)):
    access_request = db.get(models.AdminAccessRequest, request_id)
    if not access_request:
        raise HTTPException(status_code=404, detail="Access request not found")
    access_request.status = "rejected"
    db.commit()
    return {"ok": True}

@app.post("/api/admin/access/admins/{admin_id}/revoke")
def revoke_admin_access(admin_id: int, db: Session = Depends(get_db), owner: models.Admin = Depends(require_super_admin)):
    admin = db.get(models.Admin, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found")
    if admin.is_super_admin or admin.email.lower() == owner.email.lower():
        raise HTTPException(status_code=400, detail="The owner account cannot be revoked")
    admin.is_active = False
    access_request = db.query(models.AdminAccessRequest).filter(models.AdminAccessRequest.email == admin.email).first()
    if access_request:
        access_request.status = "pending"
    db.commit()
    return {"ok": True, "email": admin.email}

# --------------------------------------------------
# ADMIN DASHBOARD SUMMARY
# --------------------------------------------------

@app.get("/api/admin/summary")
def summary(
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    return {
        "projects": db.query(models.Project).count(),
        "team_members": db.query(models.TeamMember).count(),
    }


# --------------------------------------------------
# ADMIN PROJECTS
# --------------------------------------------------

@app.get(
    "/api/admin/projects",
    response_model=list[schemas.ProjectOut],
)
def list_projects(
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    return (
        db.query(models.Project)
        .order_by(
            models.Project.sort_order,
            models.Project.id.desc(),
        )
        .all()
    )


@app.post(
    "/api/admin/projects",
    response_model=schemas.ProjectOut,
)
def create_project(
    data: schemas.ProjectInput,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = models.Project(**data.model_dump())

    db.add(row)
    db.commit()
    db.refresh(row)

    return row


@app.put(
    "/api/admin/projects/{item_id}",
    response_model=schemas.ProjectOut,
)
def update_project(
    item_id: int,
    data: schemas.ProjectInput,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.Project, item_id)

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    previous_thumbnail = row.thumbnail_url
    for key, value in data.model_dump().items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    if row.thumbnail_url != previous_thumbnail:
        _cleanup_uploaded_image_if_unused(db, previous_thumbnail)

    return row


@app.delete("/api/admin/projects/{item_id}")
def delete_project(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.Project, item_id)

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    previous_thumbnail = row.thumbnail_url
    db.delete(row)
    db.commit()
    _cleanup_uploaded_image_if_unused(db, previous_thumbnail)

    return {"ok": True}


# --------------------------------------------------
# ADMIN TEAM
# --------------------------------------------------

@app.get(
    "/api/admin/team",
    response_model=list[schemas.TeamOut],
)
def list_team(
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    return (
        db.query(models.TeamMember)
        .order_by(
            models.TeamMember.sort_order,
            models.TeamMember.id,
        )
        .all()
    )


@app.post(
    "/api/admin/team",
    response_model=schemas.TeamOut,
)
def create_team(
    data: schemas.TeamInput,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = models.TeamMember(**data.model_dump())

    db.add(row)
    db.commit()
    db.refresh(row)

    return row


@app.put(
    "/api/admin/team/{item_id}",
    response_model=schemas.TeamOut,
)
def update_team(
    item_id: int,
    data: schemas.TeamInput,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.TeamMember, item_id)

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Team member not found",
        )

    previous_photo = row.photo_url
    for key, value in data.model_dump().items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    if row.photo_url != previous_photo:
        _cleanup_uploaded_image_if_unused(db, previous_photo)

    return row


@app.delete("/api/admin/team/{item_id}")
def delete_team(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.TeamMember, item_id)

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Team member not found",
        )

    previous_photo = row.photo_url
    db.delete(row)
    db.commit()
    _cleanup_uploaded_image_if_unused(db, previous_photo)

    return {"ok": True}


# --------------------------------------------------
# ADMIN SITE SETTINGS
# --------------------------------------------------

@app.get(
    "/api/admin/settings",
    response_model=schemas.SettingsOut,
)
def get_settings(
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.SiteSettings, 1)

    if not row:
        row = models.SiteSettings(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


@app.put(
    "/api/admin/settings",
    response_model=schemas.SettingsOut,
)
def update_settings(
    data: schemas.SettingsInput,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(current_admin),
):
    row = db.get(models.SiteSettings, 1)

    if not row:
        row = models.SiteSettings(id=1)
        db.add(row)

    for key, value in data.model_dump().items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)

    return row


# --------------------------------------------------
# SINGLE-DEPLOYMENT FRONTEND (React build served by FastAPI)
# --------------------------------------------------
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    @app.get("/{asset_path:path}", include_in_schema=False)
    def frontend_or_spa(asset_path: str):
        if asset_path.startswith(("api/", "uploads/")):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (FRONTEND_DIST / asset_path).resolve()
        if candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/", include_in_schema=False)
    def frontend_index():
        return FileResponse(FRONTEND_DIST / "index.html")
