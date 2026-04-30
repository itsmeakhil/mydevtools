"""
migrate_nosql_connections_to_mongodb.py

One-off migration for NoSQL Explorer connection metadata:
- Source (legacy): Firebase Firestore collection `mongodb_connections`
- Target (new): MongoDB collection `mongodb_connections`

The backend NoSQL API now reads from MongoDB; this script copies over existing
connection documents so users don't lose their saved connections.

Requires:
- FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH in `apps/backend/.env`
- MONGO_DB_URL and MONGO_DB_NAME in `apps/backend/.env`
"""

from __future__ import annotations

import argparse
import random
import string
import time
from datetime import datetime, timezone
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore
from pymongo.collection import Collection

from app.core.config import get_settings
from app.database.db import get_db

LEGACY_FIRESTORE_COLLECTION = "mongodb_connections"
TARGET_MONGODB_COLLECTION = "mongodb_connections"


def now_ms() -> int:
    return int(time.time() * 1000)


def new_client_style_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def _to_ms(val: Any) -> Optional[int]:
    """
    Firestore timestamps come through as objects with `.to_datetime()`.
    We also accept raw `datetime` for safety.
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        dt = val
    elif hasattr(val, "to_datetime"):
        dt = val.to_datetime()
    else:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.astimezone(timezone.utc).timestamp() * 1000)


def init_firebase_admin(settings) -> None:
    if firebase_admin._apps:
        return

    cred_json = settings.FIREBASE_CREDENTIALS_JSON
    cred_path = settings.FIREBASE_CREDENTIALS_PATH

    if cred_json:
        import json

        data = json.loads(cred_json)
        cred = credentials.Certificate(data)
        firebase_admin.initialize_app(cred)
        return

    if cred_path:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        return

    firebase_admin.initialize_app()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", dest="user_id", default=None, help="Migrate only a single user uid")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to MongoDB")
    args = parser.parse_args()

    settings = get_settings()
    init_firebase_admin(settings)

    fs = firestore.client()
    qs = fs.collection(LEGACY_FIRESTORE_COLLECTION)
    if args.user_id:
        qs = qs.where("userId", "==", args.user_id)

    target_col: Collection = get_db()[TARGET_MONGODB_COLLECTION]

    docs = list(qs.stream())
    total = len(docs)
    updated = 0
    inserted = 0
    skipped = 0

    for snap in docs:
        data = snap.to_dict() or {}

        user_id = data.get("userId")
        connection_string = data.get("connectionString")
        if not user_id or not connection_string:
            skipped += 1
            continue

        name = data.get("name") or "My Connection"

        created_at = _to_ms(data.get("createdAt")) or now_ms()
        last_used_at = _to_ms(data.get("lastUsedAt")) or created_at

        filter_q = {"created_by": user_id, "connectionString": connection_string}
        existing = target_col.find_one(filter_q, {"_id": 1})

        if existing:
            updated += 1
            if not args.dry_run:
                target_col.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"name": name, "createdAt": created_at, "lastUsedAt": last_used_at}},
                )
            continue

        inserted += 1
        if args.dry_run:
            continue

        target_col.insert_one(
            {
                "_id": new_client_style_id(),
                "created_by": user_id,
                "connectionString": connection_string,
                "name": name,
                "createdAt": created_at,
                "lastUsedAt": last_used_at,
            }
        )

    print(
        "Migration complete.\n"
        f"  source docs: {total}\n"
        f"  inserted: {inserted}\n"
        f"  updated: {updated}\n"
        f"  skipped: {skipped}\n"
        f"  dry-run: {args.dry_run}\n"
    )


if __name__ == "__main__":
    main()

