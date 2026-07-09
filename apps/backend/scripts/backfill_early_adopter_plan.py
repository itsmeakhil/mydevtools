"""One-time backfill: grant lifetime Pro to the first 250 users by created_at.

Also seeds the signup counter so the runtime grant path
(users_repo._grant_early_adopter_if_slot_free) continues from the right slot.

Idempotent: users that already have a plan are skipped; the counter is only
raised, never lowered.

Usage (from apps/backend):
    uv run python scripts/backfill_early_adopter_plan.py --dry-run
    uv run python scripts/backfill_early_adopter_plan.py
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.routes.auth.users_repo import EARLY_ADOPTER_LIMIT, SIGNUP_COUNTER_ID
from app.database import db_manager
from app.utils.collection_name import COUNTERS, USERS
from app.utils.utils import create_timestamp


async def main(dry_run: bool) -> None:
    total = await db_manager.count_documents(USERS, {})
    first = await db_manager.find(
        USERS,
        {},
        projection={"_id": 1, "email": 1, "created_at": 1, "plan": 1},
        sort=[("created_at", 1)],
        limit=EARLY_ADOPTER_LIMIT,
    )
    to_grant = [u for u in first if not u.get("plan")]
    already = len(first) - len(to_grant)

    print(f"users total:            {total}")
    print(f"first {EARLY_ADOPTER_LIMIT} by created_at: {len(first)}")
    print(f"already have plan:      {already}")
    print(f"will grant pro:         {len(to_grant)}")
    print(f"counter seed:           {total}")

    if dry_run:
        print("dry-run: no writes")
        return

    now = create_timestamp()
    if to_grant:
        await db_manager.update_many(
            USERS,
            {"_id": {"$in": [u["_id"] for u in to_grant]}},
            {"$set": {"plan": "pro", "plan_source": "early_adopter", "plan_granted_at": now}},
        )
    await db_manager.find_one_and_update(
        COUNTERS,
        {"_id": SIGNUP_COUNTER_ID},
        {"$max": {"seq": total}},
        upsert=True,
    )
    print(f"granted pro to {len(to_grant)} users; counter seq >= {total}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="print changes without writing")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
