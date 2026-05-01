from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1)
    content: Any = Field(default_factory=dict)
    parentId: Optional[str] = None
    icon: Optional[str] = None
    pinned: Optional[bool] = None
    tags: Optional[list[str]] = None


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1)
    content: Optional[Any] = None
    parentId: Optional[str] = None
    icon: Optional[str] = None
    pinned: Optional[bool] = None
    tags: Optional[list[str]] = None


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

