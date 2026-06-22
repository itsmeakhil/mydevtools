from fastapi import APIRouter, Depends, Query

from app.api.routes.analytics import services as analytics_svc
from app.api.routes.auth.services import get_current_uid

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", summary="Dashboard analytics counts")
async def dashboard_summary(uid: str = Depends(get_current_uid)):
    return await analytics_svc.get_dashboard_analytics(uid)


@router.get("/top-tools", summary="Top tools by usage (global, cached 5 min)")
async def top_tools(
    days: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=10, ge=1, le=50),
    _uid: str = Depends(get_current_uid),
):
    return await analytics_svc.get_top_tools(days=days, limit=limit)


@router.get("/activity-buckets", summary="Daily activity counts (global, cached 5 min)")
async def activity_buckets(
    days: int = Query(default=7, ge=1, le=90),
    _uid: str = Depends(get_current_uid),
):
    return await analytics_svc.get_activity_buckets(days=days)
