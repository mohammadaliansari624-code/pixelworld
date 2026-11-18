# Pixel Wrld — Creative Studio Website + Admin CMS

A full-stack starter for a premium video-editing studio website.

## Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Motion (`motion/react`)
- Backend: FastAPI, PostgreSQL 18, SQLAlchemy, psycopg 3, Alembic, JWT authentication
- Media: local uploads (replace with Cloudinary/S3 for production)

## Requirements
- Node.js 20+
- Python 3.11+
- PostgreSQL 18+

## Run locally

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows; on macOS/Linux use: cp .env.example .env
# Set DATABASE_URL to postgresql+psycopg://postgres:<URL-ENCODED-PASSWORD>@localhost:5432/pixelwrld
# Set JWT_SECRET to a unique random value (generate with: python -c "import secrets; print(secrets.token_urlsafe(48))")
# Set GOOGLE_CLIENT_ID and SUPER_ADMIN_EMAIL in backend/.env
alembic upgrade head
# To preserve data from the legacy SQLite database, run this only after confirming
# the target PostgreSQL tables are empty and a verified SQLite backup is ready:
python migrate_sqlite_to_postgres.py
# Google Sign-In is the admin login method; first owner sign-in bootstraps the super admin
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
copy .env.example .env.local  # Windows; macOS/Linux: cp .env.example .env.local
# Set VITE_GOOGLE_CLIENT_ID to the same Google OAuth Web Client ID
npm install
npm run dev
```
Open http://localhost:5173. Admin: http://localhost:5173/admin. Keep the same Google OAuth Web Client ID in both frontend and backend environment files.

## Configure WhatsApp booking
1. Sign in to `/admin`.
2. Open **Site settings**.
3. Enter the agency WhatsApp number in international digits format, e.g. `919876543210` (no `+`, spaces or dashes).
4. Update contact details, bio and booking copy.
5. Save.

The public booking form validates the details and opens WhatsApp with a prefilled appointment request. It does not claim a booking is confirmed; the agency confirms availability in WhatsApp.

## Admin features
- Dashboard overview
- Add/edit/delete portfolio projects with video URL, thumbnail URL, category and description
- Add/edit/delete team members with photo URL, role, bio and social link
- Edit studio bio, email, phone, location, WhatsApp number and booking message
- Protected API routes using JWT bearer authentication
- Google Sign-In with owner-controlled approval, grant and revoke controls
- Super admin: `guptasonu312006@gmail.com` (configurable via `SUPER_ADMIN_EMAIL`)

## Production checklist
- Set a unique cryptographically random `JWT_SECRET` in backend `.env`.
- Keep `SUPER_ADMIN_EMAIL` restricted to the owner and rotate `JWT_SECRET` if it is ever exposed.
- Use HTTPS.
- Use managed PostgreSQL and Alembic migrations for schema changes.
- Use Cloudinary/S3 for persistent media; local `uploads/` is not durable on many hosts.
- Add rate limiting, email verification, backups and audit logs before public production use.
- Configure CORS to your real frontend origin.

## Brand assets
The supplied Pixel Wrld full wordmark/tagline and standalone PW mark are included in
`frontend/public/assets/` and used in the public header/hero/footer, admin sidebar,
and browser favicon. The UI accent palette follows the supplied electric-blue logo.

## Portfolio layout update
The homepage portfolio now creates one compact horizontal carousel per project category.
Each category displays up to five projects, with touch/trackpad swipe, mouse scrolling,
and previous/next controls. Categories are generated from the projects managed in Admin,
so adding a new category there creates a matching homepage section automatically.
The carousel adapts from one card on narrow phones to multiple cards on desktop.


## Google Sign-In and owner-controlled admin access

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type **Web application**.
2. Add your local frontend origin (for example `http://localhost:5173`) to **Authorized JavaScript origins**. For a single-origin deployment, add the deployed website origin too.
3. Put the same client ID in `backend/.env` as `GOOGLE_CLIENT_ID` and `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`. No client secret is needed for Google Identity Services ID-token verification.
4. Keep `SUPER_ADMIN_EMAIL=guptasonu312006@gmail.com` in backend environment variables.
5. Apply the database migrations with `alembic upgrade head`. Existing admin rows are preserved but are not automatically granted access.
6. The owner signs in with that exact verified Google account. The first successful owner sign-in creates/activates the super-admin account.
7. The owner can approve access requests, grant access directly by email, and revoke access from **Admin access** in the dashboard. Other Google users cannot enter the dashboard until approved.

Google sign-in does not automatically grant admin privileges. The backend verifies the Google ID token audience, issuer/signature, and verified email. Admin API routes still require a valid JWT and an active admin record.

## Single-deployment build (frontend + backend)

For production, build the React app and let FastAPI serve `frontend/dist` from the same origin:

```bash
cd frontend
npm ci
npm run build
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

When `frontend/dist` exists, FastAPI serves the frontend, assets and SPA routes. Leave `VITE_API_URL` unset in the production frontend build so API calls use the same origin. For local development, set `VITE_API_URL=http://localhost:8000`. Use persistent storage for PostgreSQL and uploaded images in production, and schedule database/media backups.

## Customer reviews and moderation

- Visitors can submit a review with their name, 1–5 star rating, review text, optional project/service name, and optional profile image.
- Public submissions are always saved with `pending` status. They are not returned by the public reviews endpoint until an admin approves them.
- The public homepage displays approved reviews and includes a submission form.
- In `/admin`, open **Reviews** to view all submissions, approve/publish, reject, hide/unpublish, edit, delete, or manually add a review.
- Review images use the existing `/uploads` local media directory and the same JPG/PNG/WEBP/GIF signature checks (8 MiB max).

### Apply the reviews database migration

After deploying the code, run this once from the backend environment against the Pixel Wrld Neon database:

```bash
alembic upgrade head
```

This adds the `reviews` table (migration `20261118_0004`). It does not modify existing admin, project, team, or settings rows. Do not run the SQLite-to-PostgreSQL importer again; the existing data has already been migrated.

### Image storage warning for Render Free

Review profile images currently use the app's existing local `uploads/` directory. Render Free filesystems are ephemeral, so uploaded profile images can disappear after a restart/redeploy. For durable customer images, configure persistent object storage (Cloudinary, S3, or equivalent) and change the upload implementation to store there, or use a supported persistent disk. The review text and moderation status remain in PostgreSQL.

Public review submission is moderated but does not yet include CAPTCHA or a durable distributed rate limiter. Before promoting the form widely, add anti-spam protection.
