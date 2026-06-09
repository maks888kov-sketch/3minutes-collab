# 3Minutes — self-hosted, autonomous stack

Fully self-contained backend + infrastructure for the 3Minutes app. **No dependency
on Base44 anymore** — everything runs locally via Docker Compose.

## Stack

| Service | Image | Host port | Purpose |
|---|---|---|---|
| frontend | nginx (built SPA) | **5180** | serves the React app + proxies `/api` and `/ws` |
| backend | FastAPI (Python 3.12) | 4010 | REST API, auth, WebSocket, file/functions |
| postgres | postgres:16 | 5544 | database (SQLAlchemy + Alembic migrations) |
| redis | redis:7 | 6390 | realtime pub/sub (WebSocket fan-out), scaling |
| minio | minio | 9100 / 9101 | S3 object storage (optional — only when `STORAGE_BACKEND=minio`) |
| mailpit | axllent/mailpit | 8026 (web) / 1026 (smtp) | catches OTP / password-reset emails |

Ports are deliberately non-standard so this stack never collides with anything
else already running on the machine. A dedicated compose project name
(`3min-selfhost`) keeps containers/volumes/network isolated.

## Run

One command from the **repo root** (a `Makefile` + Windows `make.cmd`/`make.ps1` wrapper are provided, so `make` works on Windows without installing GNU make):

```bash
make up        # build images + start the whole stack
make help      # all targets (down, logs, ps, e2e, smoke, reset-db, clean, ...)
```

Or directly with Docker Compose:

```bash
cd selfhost
docker compose up -d --build
```

Then open **http://localhost:5180**.

- Register a user → the verification code arrives in Mailpit: **http://localhost:8026**
- MinIO console: http://localhost:9101 (minioadmin / minioadmin123)

Stop: `docker compose down` (add `-v` to also wipe data volumes).

## File storage

Controlled by `STORAGE_BACKEND` (backend env in `docker-compose.yml`):

- **`local`** (default) — files are written to disk in `selfhost/uploads/` on the host
  (bind-mounted to `/data/uploads` in the container, git-ignored). Survives rebuilds.
- **`minio`** — files go to the MinIO (S3-compatible) bucket instead.

Either way the browser loads files from the same-origin URL `/api/files/<key>`.

## Architecture notes

- **Frontend was not changed except one file:** `src/api/base44Client.js` was
  rewritten as a thin adapter that keeps the exact same surface the app used
  (`entities.*`, `auth.*`, `integrations.Core.UploadFile`, `functions.invoke`,
  `setToken`) but talks to this backend over same-origin REST + a WebSocket.
  No UI/components were modified.
- **Realtime chat:** the backend emits entity-change events to Redis; every
  backend instance relays them to its WebSocket clients, which invalidate the
  React Query caches → near-instant message delivery (polling remains as a
  fallback, exactly as the app was built).
- **Video call** is a consent/3-minute-timer flow over `Match` fields
  (`video_consent_*`, `video_result_*`, status → `video_unlocked`), matching the
  original app — no WebRTC media server required.
- **Migrations:** Alembic runs automatically on backend startup
  (`alembic upgrade head` in `entrypoint.sh`).

## Tests (`selfhost/e2e`)

```bash
cd selfhost/e2e
npm install
npm run smoke   # API-level: register -> OTP -> verify -> login -> profile -> upload
npm run e2e     # Browser (Yandex): AUTH + CHAT + VIDEO, two real users
```

The browser test launches **Yandex Browser** via `playwright-core`
(`--use-fake-device-for-media-stream` for the camera) and saves screenshots to
`selfhost/e2e/artifacts/`.
