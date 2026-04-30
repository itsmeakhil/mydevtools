from fastapi import APIRouter, Depends

from app.api.routes.analytics.schema import DashboardAnalyticsOut
from app.api.routes.analytics import services as analytics_svc
from app.api.routes.auth.services import get_current_uid

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary",summary="Dashboard analytics counts",)
def dashboard_summary(uid: str = Depends(get_current_uid)):
    return analytics_svc.get_dashboard_analytics(uid)
