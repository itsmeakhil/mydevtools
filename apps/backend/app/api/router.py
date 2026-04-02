from fastapi import APIRouter

from app.api.routes.auth.api import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.bookmarks.api import router as bookmarks_router
from app.api.routes.tasks.api import router as tasks_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(bookmarks_router)
