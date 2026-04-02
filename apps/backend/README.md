# FastAPI backend

Backend service template for the monorepo.

## Structure

- `app/main.py` - FastAPI app entrypoint
- `app/api/router.py` - API router aggregation
- `app/api/routes/health.py` - health endpoint
- `app/api/routes/tasks/` - todo tasks + projects (MongoDB, mirrors Firestore shape)
- `app/api/routes/bookmarks/` - bookmarks + folders (MongoDB; same model as Zustand store / future Firestore)
- `app/core/config.py` - environment settings
- `app/core/db.py` - MongoDB client
- `tests/` - backend tests

## Quick start

1. Create and activate a Python 3.11+ virtual environment.
2. Install dependencies:
   - `pip install -e ".[dev]"`
3. Copy env file:
   - `cp .env.example .env`
4. Run the API:
   - `python -m uvicorn app.main:app --reload`

## API endpoints

- `GET /` - root message
- `GET /api/v1/health` - health check
- `POST /api/v1/auth/verify-token` - verify Firebase ID token
- `GET /api/v1/auth/me` - get current Firebase user profile
- `GET /docs` - Swagger UI

### Todo app (parity with Firestore `tasks` / `projects`)

All routes require `Authorization: Bearer <Firebase ID token>`.

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

All routes require `Authorization: Bearer <Firebase ID token>`.

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

## Firebase auth setup

Set one of the following:

- `FIREBASE_CREDENTIALS_JSON` in `.env` with full service-account JSON string (single-line escaped JSON), or
- `FIREBASE_CREDENTIALS_PATH` in `.env` with the local service-account JSON path, or
- `GOOGLE_APPLICATION_CREDENTIALS` / runtime ADC if deploying on GCP-managed infra.

If both JSON and path are set, `FIREBASE_CREDENTIALS_JSON` is used first.

## From monorepo root

- `pnpm dev:backend` - start backend server
