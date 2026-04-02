from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.APP_DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"], summary="Root endpoint")
def root() -> dict[str, str]:
    return {"message": f"{settings.APP_NAME} is running"}
