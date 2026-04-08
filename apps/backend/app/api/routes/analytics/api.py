from fastapi import APIRouter, Depends

from app.api.routes.analytics.schema import DashboardAnalyticsOut
from app.api.routes.analytics import services as analytics_svc
from app.api.routes.auth.services import get_current_uid

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/summary",
    response_model=DashboardAnalyticsOut,
    summary="Dashboard analytics counts",
    description="Aggregated document counts for the signed-in user (passwords, bookmarks, tasks, etc.).",
)
def dashboard_summary(uid: str = Depends(get_current_uid)) -> DashboardAnalyticsOut:
    return analytics_svc.get_dashboard_analytics(uid)
