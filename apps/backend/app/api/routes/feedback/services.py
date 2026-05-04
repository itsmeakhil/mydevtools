from datetime import datetime, timezone
from typing import Any, Optional

from app.api.routes.feedback.schema import FeedbackCreate, FeedbackOut
from app.utils.collection_name import FEEDBACK
from app.utils.utils import new_id
from app.database import db_manager


def _isoformat_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _doc_to_out(doc: dict[str, Any]) -> FeedbackOut:
    created_at = doc.get("createdAt")
    if isinstance(created_at, datetime):
        created_at = _isoformat_utc(created_at)
    elif not isinstance(created_at, str):
        created_at = _isoformat_utc(datetime.now(timezone.utc))

    return FeedbackOut(
        id=str(doc.get("_id", "")),
        type=str(doc.get("type", "general")),
        message=str(doc.get("message", "")),
        rating=doc.get("rating"),
        email=doc.get("email"),
        page=doc.get("page"),
        userId=doc.get("userId"),
        createdAt=created_at,
    )


def create_feedback(body: FeedbackCreate, uid: Optional[str] = None) -> FeedbackOut:
    ts = datetime.now(timezone.utc)
    doc = {
        "_id": new_id(),
        "type": body.type,
        "message": body.message,
        "rating": body.rating,
        "email": body.email,
        "page": body.page,
        "userId": uid,
        "createdAt": ts,
    }
    db_manager.insert_one(FEEDBACK, doc)
    return _doc_to_out(doc)
