import pytest

from app.api.routes.auth.users_repo import (
    EARLY_ADOPTER_LIMIT,
    SIGNUP_COUNTER_ID,
    upsert_user_from_firebase_claims,
)
from app.database import db_manager
from app.utils.collection_name import COUNTERS, USERS

from scripts.backfill_early_adopter_plan import main as backfill_main


@pytest.fixture
async def clean_counters():
    await db_manager.delete_many(COUNTERS, {})
    yield
    await db_manager.delete_many(COUNTERS, {})


def claims(uid: str) -> dict:
    return {"uid": uid, "email": f"{uid}@example.com", "name": uid, "email_verified": True}


@pytest.mark.asyncio
async def test_new_signup_gets_pro_while_slots_remain(clean_db, clean_counters):
    await upsert_user_from_firebase_claims(claims("u1"))
    doc = await db_manager.find_one(USERS, {"_id": "u1"})
    assert doc["plan"] == "pro"
    assert doc["plan_source"] == "early_adopter"
    assert doc["plan_granted_at"]
    counter = await db_manager.find_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID})
    assert counter["seq"] == 1


@pytest.mark.asyncio
async def test_signup_past_limit_stays_free(clean_db, clean_counters):
    await db_manager.insert_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID, "seq": EARLY_ADOPTER_LIMIT})
    await upsert_user_from_firebase_claims(claims("u-late"))
    doc = await db_manager.find_one(USERS, {"_id": "u-late"})
    assert "plan" not in doc


@pytest.mark.asyncio
async def test_signup_at_exact_limit_gets_pro(clean_db, clean_counters):
    await db_manager.insert_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID, "seq": EARLY_ADOPTER_LIMIT - 1})
    await upsert_user_from_firebase_claims(claims("u-250"))
    doc = await db_manager.find_one(USERS, {"_id": "u-250"})
    assert doc["plan"] == "pro"


@pytest.mark.asyncio
async def test_relogin_does_not_consume_slot(clean_db, clean_counters):
    await upsert_user_from_firebase_claims(claims("u1"))
    await upsert_user_from_firebase_claims(claims("u1"))
    counter = await db_manager.find_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID})
    assert counter["seq"] == 1


@pytest.mark.asyncio
async def test_backfill_grants_first_users_and_seeds_counter(clean_db, clean_counters):
    for i in range(3):
        await db_manager.insert_one(
            USERS, {"_id": f"u{i}", "uid": f"u{i}", "created_at": 1000 + i}
        )

    await backfill_main(dry_run=True)
    assert await db_manager.find_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID}) is None

    await backfill_main(dry_run=False)
    for i in range(3):
        doc = await db_manager.find_one(USERS, {"_id": f"u{i}"})
        assert doc["plan"] == "pro"
    counter = await db_manager.find_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID})
    assert counter["seq"] == 3

    # Idempotent: second run keeps grant timestamps and counter unchanged.
    granted_before = (await db_manager.find_one(USERS, {"_id": "u0"}))["plan_granted_at"]
    await backfill_main(dry_run=False)
    assert (await db_manager.find_one(USERS, {"_id": "u0"}))["plan_granted_at"] == granted_before
    assert (await db_manager.find_one(COUNTERS, {"_id": SIGNUP_COUNTER_ID}))["seq"] == 3


def test_profile_response_defaults_plan_to_free():
    from app.api.routes.auth.schema import UserProfileResponse

    profile = UserProfileResponse(uid="u1", email_verified=True, disabled=False)
    assert profile.plan == "free"
    assert profile.plan_source is None
