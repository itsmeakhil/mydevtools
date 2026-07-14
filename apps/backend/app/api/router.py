from fastapi import APIRouter

from app.api.routes.auth.api import router as auth_router
from app.api.routes.auth.passkey.api import router as auth_passkey_router
from app.api.routes.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(auth_passkey_router)
