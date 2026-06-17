import json
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_CONTENT_MAX_BYTES = 1_000_000  # 1 MB
_TITLE_MAX_LEN = 500
_TAG_MAX_LEN = 100
_TAGS_MAX_COUNT = 50
_ICON_MAX_LEN = 10


def _validate_content(value: Any) -> Any:
    if value is None:
        return value
    try:
        size = len(json.dumps(value, ensure_ascii=False).encode("utf-8"))
    except (TypeError, ValueError):
        raise ValueError("content must be JSON-serialisable")
    if size > _CONTENT_MAX_BYTES:
        raise ValueError(f"content exceeds maximum size of {_CONTENT_MAX_BYTES // 1000} KB")
    return value


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1, max_length=_TITLE_MAX_LEN)
    content: Any = Field(default_factory=dict)
    parentId: Optional[str] = Field(default=None, max_length=128)
    icon: Optional[str] = Field(default=None, max_length=_ICON_MAX_LEN)
    pinned: Optional[bool] = None
    tags: Optional[list[str]] = None

    @field_validator("content", mode="before")
    @classmethod
    def validate_content_size(cls, v: Any) -> Any:
        return _validate_content(v)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, list):
            raise ValueError("tags must be a list")
        if len(v) > _TAGS_MAX_COUNT:
            raise ValueError(f"too many tags (max {_TAGS_MAX_COUNT})")
        return [str(t)[:_TAG_MAX_LEN] for t in v]


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1, max_length=_TITLE_MAX_LEN)
    content: Optional[Any] = None
    parentId: Optional[str] = Field(default=None, max_length=128)
    icon: Optional[str] = Field(default=None, max_length=_ICON_MAX_LEN)
    pinned: Optional[bool] = None
    tags: Optional[list[str]] = None

    @field_validator("content", mode="before")
    @classmethod
    def validate_content_size(cls, v: Any) -> Any:
        return _validate_content(v)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> Any:
        if v is None:
            return v
        if not isinstance(v, list):
            raise ValueError("tags must be a list")
        if len(v) > _TAGS_MAX_COUNT:
            raise ValueError(f"too many tags (max {_TAGS_MAX_COUNT})")
        return [str(t)[:_TAG_MAX_LEN] for t in v]


class NoteOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    content: Any
    parentId: Optional[str] = None
    icon: Optional[str] = None
    pinned: bool = False
    tags: list[str] = Field(default_factory=list)
    userId: str
    createdAt: str
    updatedAt: str

