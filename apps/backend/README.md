# FastAPI backend

Backend service template for the monorepo.

## Structure

- `app/main.py` - FastAPI app entrypoint
- `app/api/router.py` - API router aggregation
- `app/api/routes/health.py` - health endpoint
- `app/api/routes/tasks/` - todo tasks + projects (MongoDB, mirrors Firestore shape)
- `app/api/routes/bookmarks/` - bookmarks + folders (MongoDB; same model as Zustand store / future Firestore)
- `app/api/routes/analytics/` - dashboard aggregates (counts per user across collections)
- `app/core/config.py` - environment settings
- `app/core/db.py` - MongoDB client
- `tests/` - backend tests

## Quick start

1. Create and activate a Python 3.10+ virtual environment.
2. Install dependencies:
   - `pip install -e ".[dev]"`
3. Copy env file:
   - `cp .env.example .env`
4. Run the API:
   - `python -m uvicorn app.main:app --reload`

## API endpoints

- `GET /` - root message
- `GET /api/v1/health` - health check
- `POST /api/v1/auth/session` - verify Firebase ID token once; sets HttpOnly cookies (`mdt_at` access JWT ~15d, `mdt_rt` refresh ~60d) and upserts `users` in MongoDB (document `_id` = Firebase UID)
- `POST /api/v1/auth/refresh` - rotate tokens using the refresh cookie
- `POST /api/v1/auth/logout` - clear cookies and server-side refresh hash
- `GET /api/v1/auth/session/check` - 200 if the access JWT is valid
- `GET /api/v1/auth/me` - current user profile from the `users` collection
- `GET /docs` - Swagger UI
- `GET /api/v1/analytics/summary` - dashboard counts (password entries, bookmarks, tasks, projects, NoSQL connections, notes, API client data, JSON formatter docs) for the signed-in user

### Todo app (parity with Firestore `tasks` / `projects`)

Protected routes accept `Authorization: Bearer <API JWT>` and/or the HttpOnly access cookie `mdt_at` (used by the Next.js BFF). Firebase ID tokens are only accepted on `POST /auth/session`.

**Tasks** (`/api/v1/tasks`)

| Method | Path | Maps to frontend |
|--------|------|------------------|
| GET | `/stats` | `fetchStats` / `allTaskStats` |
| GET | `/export` | `getFilteredTasksForExport` |
| POST | `/import` | `importTasks` |
| GET | `/` | paginated list (`status`, `projectId`, `page`, `pageSize`) |
| GET | `/{task_id}` | single task |
| POST | `/` | `addTask` |
| PATCH | `/{task_id}` | `updateTask` |
| PATCH | `/{task_id}/status` | `updateTaskStatus` |
| DELETE | `/{task_id}` | `deleteTask` |

**Projects** (`/api/v1/projects`)

| Method | Path | Maps to frontend |
|--------|------|------------------|
| GET | `/` | project list |
| POST | `/` | `addProject` |
| PATCH | `/{project_id}` | `updateProject` |
| DELETE | `/{project_id}` | `deleteProject` |

Set `MONGO_DB_URL` and `MONGO_DB_NAME` in `.env`. Document layout and indexes: `app/api/routes/tasks/schema.py`.

### Bookmarks (web store parity; Firestore-style `created_by` + string doc ids)

The bookmarks UI today uses **localStorage** only (`bookmark-storage`). These APIs store the **same payload** in MongoDB using the same pattern as tasks: top-level collections `bookmarks` and `bookmarkFolders` with `created_by` = Firebase UID. String `_id` values match client-generated ids.

Protected routes accept `Authorization: Bearer <API JWT>` and/or the HttpOnly access cookie `mdt_at` (used by the Next.js BFF). Firebase ID tokens are only accepted on `POST /auth/session`.

**Bookmarks** — `/api/v1/bookmarks`

| Method | Path | Store action |
|--------|------|----------------|
| GET | `/snapshot` | full state (like `exportBookmarksToJSON`) |
| POST | `/import` | `importBookmarks` (upsert by id) |
| POST | `/clear-all` | `clearAll` |
| GET | `/` | list (`folderId` query: omit = all, `uncategorized` = no folder) |
| POST | `/` | `addBookmark` |
| GET | `/{id}` | single |
| PATCH | `/{id}` | `updateBookmark` |
| PATCH | `/{id}/move` | `moveBookmark` |
| DELETE | `/{id}` | `deleteBookmark` |

**Folders** — `/api/v1/bookmark-folders`

| Method | Path | Store action |
|--------|------|----------------|
| GET | `/` | all folders (sort `createdAt` asc, like a Firestore `orderBy`) |
| POST | `/` | `addFolder` |
| GET | `/{id}` | single |
| PATCH | `/{id}` | `updateFolder` |
| PATCH | `/{id}/expanded` | `toggleFolderExpanded` |
| DELETE | `/{id}` | `deleteFolder` (descendants removed; bookmarks → uncategorized) |

Schema and indexes: `app/api/routes/bookmarks/schema.py`.

## API JWT and cookies

- Set `JWT_SECRET_KEY` in `.env` (required when `APP_ENV=production`).
- Optional: `AUTH_COOKIE_SECURE=true` when the API is only served over HTTPS.
- Access token lifetime defaults to **15 days**; refresh token **60 days** (`ACCESS_TOKEN_EXPIRE_DAYS` / `REFRESH_TOKEN_EXPIRE_DAYS` in `app/core/config.py`).

Recommended MongoDB index for refresh lookup:

    db.users.create_index([("refresh_token_hash", 1)], sparse=True)

## Firebase auth setup

Set one of the following:

- `FIREBASE_CREDENTIALS_JSON` in `.env` with full service-account JSON string (single-line escaped JSON), or
- `FIREBASE_CREDENTIALS_PATH` in `.env` with the local service-account JSON path, or
- `GOOGLE_APPLICATION_CREDENTIALS` / runtime ADC if deploying on GCP-managed infra.

If both JSON and path are set, `FIREBASE_CREDENTIALS_JSON` is used first.

## Load testing cache

See `scripts/loadtest_cache.py`. Requires `locust` (install separately) and a running backend.

1. Boot backend with `CACHE_ENABLED=false`; run a 5-min baseline.
2. Boot backend with `CACHE_ENABLED=true` + chosen `CACHE_NAMESPACES`; re-run.
3. Compare p50/p99 in `*_stats.csv`. Acceptance gates: p50 < 50ms, p99 < 200ms, error rate 0%.

## From monorepo root

- `pnpm dev:backend` - start backend server
