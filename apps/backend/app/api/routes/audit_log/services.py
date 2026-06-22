from typing import Any, Optional

from app.database import db_manager
from app.utils.collection_name import AUDIT_LOG
from app.api.routes.audit_log.schema import AuditEventOut, AuditListOut


def _doc_to_out(doc: dict[str, Any]) -> AuditEventOut:
    return AuditEventOut(
        id=str(doc.get("_id", "")),
        uid=doc.get("uid"),
        action=doc.get("action", ""),
        module=doc.get("module"),
        entity_type=doc.get("entity_type"),
        entity_id=doc.get("entity_id"),
        method=doc.get("method", ""),
        path=doc.get("path", ""),
        status=int(doc.get("status", 0)),
        outcome=doc.get("outcome", ""),
        changes=doc.get("changes"),
        summary=doc.get("summary"),
        ip=doc.get("ip"),
        ua_raw=doc.get("ua_raw"),
        device=doc.get("device"),
        latency_ms=int(doc.get("latency_ms", 0)),
        ts=int(doc.get("ts", 0)),
    )


async def list_audit_events(
    uid: str,
    *,
    skip: int = 0,
    limit: int = 50,
    module: Optional[str] = None,
    action: Optional[str] = None,
    outcome: Optional[str] = None,
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None,
    search: Optional[str] = None,
) -> AuditListOut:
    query: dict[str, Any] = {"uid": uid}
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if outcome:
        query["outcome"] = outcome
    if ts_from is not None or ts_to is not None:
        rng: dict[str, Any] = {}
        if ts_from is not None:
            rng["$gte"] = ts_from
        if ts_to is not None:
            rng["$lte"] = ts_to
        query["ts"] = rng
    if search:
        query["summary"] = {"$regex": search, "$options": "i"}

    total = await db_manager.count_documents(AUDIT_LOG, query)
    docs = await db_manager.find(
        AUDIT_LOG, query, sort=[("ts", -1)], skip=skip, limit=limit
    )
    return AuditListOut(
        items=[_doc_to_out(d) for d in docs],
        total=total,
        skip=skip,
        limit=limit,
    )
