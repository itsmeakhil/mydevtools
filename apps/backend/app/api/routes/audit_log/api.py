from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.audit_log import services as svc
from app.api.routes.audit_log.schema import AuditListOut

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("", response_model=AuditListOut, summary="List the current user's audit events")
async def list_events(
    uid: str = Depends(get_current_uid),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    module: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    outcome: Optional[str] = Query(default=None),
    ts_from: Optional[int] = Query(default=None, alias="from"),
    ts_to: Optional[int] = Query(default=None, alias="to"),
    search: Optional[str] = Query(default=None),
) -> AuditListOut:
    return await svc.list_audit_events(
        uid, skip=skip, limit=limit, module=module, action=action,
        outcome=outcome, ts_from=ts_from, ts_to=ts_to, search=search,
    )
