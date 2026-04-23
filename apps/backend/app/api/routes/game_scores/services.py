import time
from bson import ObjectId

from app.core.db import get_db
from app.utils.collection_name import GAME_SCORES
from app.api.routes.game_scores.schema import GameScoreCreate, GameScoreOut


def _to_out(doc: dict) -> GameScoreOut:
    return GameScoreOut(
        id=str(doc["_id"]),
        game=doc["game"],
        level=doc["level"],
        stage=doc["stage"],
        score=doc["score"],
        time_seconds=doc["time_seconds"],
        created_by=doc["created_by"],
        completed_at=doc["completed_at"],
    )


def list_scores(uid: str, game: str) -> list[GameScoreOut]:
    db = get_db()
    docs = db[GAME_SCORES].find({"created_by": uid, "game": game})
    return [_to_out(d) for d in docs]


def upsert_score(uid: str, body: GameScoreCreate) -> GameScoreOut:
    db = get_db()
    col = db[GAME_SCORES]

    existing = col.find_one({
        "created_by": uid,
        "game": body.game,
        "level": body.level,
        "stage": body.stage,
    })

    now = int(time.time() * 1000)

    if existing and existing.get("score", 0) >= body.score:
        return _to_out(existing)

    if existing:
        col.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "score": body.score,
                "time_seconds": body.time_seconds,
                "completed_at": now,
            }},
        )
        updated = col.find_one({"_id": existing["_id"]})
        return _to_out(updated)

    doc = {
        "created_by": uid,
        "game": body.game,
        "level": body.level,
        "stage": body.stage,
        "score": body.score,
        "time_seconds": body.time_seconds,
        "completed_at": now,
    }
    result = col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)
