from fastapi import APIRouter, Depends, Query

from app.api.routes.auth.services import get_current_uid
from app.api.routes.game_scores.schema import GameScoreCreate, GameScoreOut
from app.api.routes.game_scores import services as svc

router = APIRouter(tags=["game-scores"])


@router.get(
    "/game-scores",
    response_model=list[GameScoreOut],
    summary="Get all scores for the current user filtered by game name",
)
def get_scores(
    game: str = Query(..., min_length=1, description="Game name, e.g. 'sudoku'"),
    uid: str = Depends(get_current_uid),
) -> list[GameScoreOut]:
    return svc.list_scores(uid, game)


@router.post(
    "/game-scores",
    response_model=GameScoreOut,
    summary="Save or update best score for a game stage (upserts if new score is higher)",
)
def save_score(
    body: GameScoreCreate,
    uid: str = Depends(get_current_uid),
) -> GameScoreOut:
    return svc.upsert_score(uid, body)
