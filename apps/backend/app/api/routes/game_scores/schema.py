from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

GameName = str
Level = Literal["easy", "medium", "hard"]


class GameScoreCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    game: GameName = Field(min_length=1)
    level: Level
    stage: int = Field(ge=1, le=150)
    score: int = Field(ge=0)
    time_seconds: int = Field(ge=0)


class GameScoreOut(BaseModel):
    id: str
    game: GameName
    level: Level
    stage: int
    score: int
    time_seconds: int
    created_by: str
    completed_at: int
