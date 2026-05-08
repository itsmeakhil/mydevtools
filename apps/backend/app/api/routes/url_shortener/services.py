import re
import secrets
import string
from typing import Any
from urllib.parse import urlparse

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import db_manager
from app.utils.utils import create_timestamp
from app.api.routes.url_shortener.schema import (
    COLLECTION,
    CLICKS_COLLECTION,
    ShortLinkCreate,
    ShortLinkOut,
    ShortLinkResolve,
    ShortLinkUpdate,
    LinkAnalytics,
    DailyClicks,
    StatEntry,
)

_FORBIDDEN_SCHEME = re.compile(r"^\s*([a-zA-Z][a-zA-Z0-9+.-]*):")
_BLOCKED_HOSTNAMES = frozenset(
    {"javascript", "data", "vbscript", "file", "blob", "about"},
)


def _validate_original_url(raw: str) -> str:
    s = str(raw).strip()
    if not s:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required.")
    m = _FORBIDDEN_SCHEME.match(s)
    if m and m.group(1).lower() not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only http(s) URLs are allowed.",
        )
    url = s if s.startswith(("http://", "https://")) else f"https://{s}"
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only http(s) URLs are allowed.",
        )
    host = (parsed.hostname or "").lower()
    if not host:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL host.",
        )
    if host in _BLOCKED_HOSTNAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This URL host is not allowed.",
        )
    return url


def _is_safe_redirect_target(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    if not host or host in _BLOCKED_HOSTNAMES:
        return False
    return True


_ALPHABET = string.ascii_letters + string.digits
_CODE_LEN = 6
_MAX_RETRIES = 5


def _generate_code() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(_CODE_LEN))


def _doc_to_out(doc: dict[str, Any]) -> ShortLinkOut:
    return ShortLinkOut(
        code=str(doc["_id"]),
        original_url=doc.get("original_url", ""),
        title=doc.get("title", ""),
        created_by=doc.get("created_by", ""),
        created_at=int(doc.get("created_at", 0)),
        clicks=int(doc.get("clicks", 0)),
        active=bool(doc.get("active", True)),
    )


def _parse_ua(ua: str) -> tuple[str, str, str]:
    """Returns (device, os_name, browser) from a User-Agent string."""
    u = ua.lower()

    if "ipad" in u or "tablet" in u:
        device = "Tablet"
    elif "mobile" in u or ("android" in u and "mobile" in u):
        device = "Mobile"
    else:
        device = "Desktop"

    if "windows nt" in u:
        os_name = "Windows"
    elif "iphone" in u or "ipad" in u:
        os_name = "iOS"
    elif "android" in u:
        os_name = "Android"
    elif "mac os x" in u or "macos" in u:
        os_name = "macOS"
    elif "cros" in u:
        os_name = "ChromeOS"
    elif "linux" in u:
        os_name = "Linux"
    else:
        os_name = "Other"

    # Order matters: Edge/Opera check before Chrome/Safari
    if "edg/" in u or "edge/" in u:
        browser = "Edge"
    elif "opr/" in u or "opera" in u:
        browser = "Opera"
    elif "samsungbrowser" in u:
        browser = "Samsung"
    elif "chrome/" in u or "chromium" in u or "crios/" in u:
        browser = "Chrome"
    elif "firefox/" in u or "fxios/" in u:
        browser = "Firefox"
    elif "safari/" in u:
        browser = "Safari"
    else:
        browser = "Other"

    return device, os_name, browser


def _parse_referrer(ref: str) -> str:
    if not ref or not ref.strip():
        return "Direct"
    try:
        hostname = urlparse(ref).hostname or ""
        if not hostname:
            return "Direct"
        return re.sub(r"^www\.", "", hostname.lower())
    except Exception:
        return "Direct"


async def create_link(uid: str, body: ShortLinkCreate) -> ShortLinkOut:
    db = db_manager.get_db()
    col = db[COLLECTION]

    if body.custom_code:
        code = body.custom_code
        existing = await col.find_one({"_id": code})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Code '{code}' is already taken.",
            )
    else:
        for _ in range(_MAX_RETRIES):
            code = _generate_code()
            existing = await col.find_one({"_id": code})
            if not existing:
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not generate a unique code. Try again.",
            )

    url = _validate_original_url(body.original_url)
    title = body.title or _extract_hostname(url)
    try:
        doc = {
            "_id": code,
            "original_url": url,
            "title": title,
            "created_by": uid,
            "created_at": create_timestamp(),
            "clicks": 0,
            "active": True,
        }
        await col.insert_one(doc)
        return _doc_to_out(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Code collision. Try again.")


def _extract_hostname(url: str) -> str:
    try:
        return urlparse(url).hostname or url
    except Exception:
        return url


async def list_links(uid: str, skip: int = 0, limit: int = 100) -> list[ShortLinkOut]:
    db = db_manager.get_db()
    col = db[COLLECTION]
    cursor = col.find({"created_by": uid}).sort("created_at", -1).skip(skip).limit(limit)
    return [_doc_to_out(doc) async for doc in cursor]


async def resolve_link(code: str) -> ShortLinkResolve:
    db = db_manager.get_db()
    col = db[COLLECTION]
    doc = await col.find_one({"_id": code}, {"original_url": 1, "active": 1})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found.")
    original_url = doc["original_url"]
    if not _is_safe_redirect_target(str(original_url)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found.")
    return ShortLinkResolve(original_url=str(original_url), active=bool(doc.get("active", True)))


async def record_click(code: str, ua: str = "", referrer: str = "") -> None:
    db = db_manager.get_db()
    device, os_name, browser = _parse_ua(ua)
    ref_label = _parse_referrer(referrer)

    event = {
        "code": code,
        "ts": create_timestamp(),
        "referrer": ref_label,
        "device": device,
        "os": os_name,
        "browser": browser,
    }
    await db[CLICKS_COLLECTION].insert_one(event)
    await db[COLLECTION].update_one({"_id": code}, {"$inc": {"clicks": 1}})


async def get_analytics(uid: str, code: str, days: int = 30) -> LinkAnalytics:
    db = db_manager.get_db()

    doc = await db[COLLECTION].find_one({"_id": code, "created_by": uid}, {"clicks": 1})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found.")

    events_col = db[CLICKS_COLLECTION]
    since = create_timestamp() - days * 86_400_000

    base_match: dict[str, Any] = {"code": code, "ts": {"$gte": since}}

    # Daily clicks grouped by UTC date string
    daily_raw = await events_col.aggregate([
        {"$match": base_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$toDate": "$ts"}}},
            "clicks": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]).to_list(None)

    referrers_raw = await events_col.aggregate([
        {"$match": base_match},
        {"$group": {"_id": "$referrer", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 10},
    ]).to_list(None)

    devices_raw = await events_col.aggregate([
        {"$match": base_match},
        {"$group": {"_id": "$device", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
    ]).to_list(None)

    os_raw = await events_col.aggregate([
        {"$match": base_match},
        {"$group": {"_id": "$os", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 8},
    ]).to_list(None)

    browsers_raw = await events_col.aggregate([
        {"$match": base_match},
        {"$group": {"_id": "$browser", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 8},
    ]).to_list(None)

    return LinkAnalytics(
        total_clicks=int(doc.get("clicks", 0)),
        daily=[DailyClicks(date=d["_id"], clicks=d["clicks"]) for d in daily_raw],
        referrers=[StatEntry(label=r["_id"] or "Direct", clicks=r["clicks"]) for r in referrers_raw],
        devices=[StatEntry(label=d["_id"] or "Unknown", clicks=d["clicks"]) for d in devices_raw],
        os=[StatEntry(label=o["_id"] or "Unknown", clicks=o["clicks"]) for o in os_raw],
        browsers=[StatEntry(label=b["_id"] or "Unknown", clicks=b["clicks"]) for b in browsers_raw],
    )


async def update_link(uid: str, code: str, body: ShortLinkUpdate) -> ShortLinkOut:
    db = db_manager.get_db()
    col = db[COLLECTION]
    patch: dict[str, Any] = {}
    if body.title is not None:
        patch["title"] = body.title
    if body.active is not None:
        patch["active"] = body.active
    if not patch:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    doc = await col.find_one_and_update(
        {"_id": code, "created_by": uid},
        {"$set": patch},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found.")
    return _doc_to_out(doc)


async def delete_link(uid: str, code: str) -> None:
    db = db_manager.get_db()
    col = db[COLLECTION]
    result = await col.delete_one({"_id": code, "created_by": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found.")
