import time
from apps.backend.app.database import db_manager

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
    docs = db_manager.find(GAME_SCORES, {"created_by": uid, "game": game})
    return [_to_out(d) for d in docs]


def upsert_score(uid: str, body: GameScoreCreate) -> GameScoreOut:
    existing = db_manager.find_one(GAME_SCORES, {
        "created_by": uid,
        "game": body.game,
        "level": body.level,
        "stage": body.stage,
    })

    now = int(time.time() * 1000)

    if existing and existing.get("score", 0) >= body.score:
        return _to_out(existing)

    if existing:
        db_manager.update_one(GAME_SCORES, {"_id": existing["_id"]}, {"$set": {
                "score": body.score,
                "time_seconds": body.time_seconds,
                "completed_at": now,
            }})
        updated = db_manager.find_one(GAME_SCORES, {"_id": existing["_id"]})
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
    result = db_manager.insert_one(GAME_SCORES, doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)
