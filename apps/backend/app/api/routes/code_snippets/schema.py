"""
Code snippets — matches ``CodeSnippet`` in ``apps/web/src/store/snippet-manager-store.ts``.

``createdAt`` / ``updatedAt`` are Unix ms integers (same as bookmarks). Documents use
``created_by`` = Firebase UID.

Recommended indexes::

    db.code_snippets.create_index([("created_by", 1), ("updatedAt", -1)])
"""


from pydantic import BaseModel, ConfigDict, Field

from app.utils.collection_name import CODE_SNIPPETS

COLLECTION_CODE_SNIPPETS = CODE_SNIPPETS


class CodeSnippetCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str | None = Field(default=None, description="Client-generated id (UUID); optional")
    title: str = Field(default="Untitled snippet", min_length=1)
    language: str = Field(default="auto", min_length=1)
    code: str = ""
    tags: list[str] | None = None
    pinned: bool | None = None
    createdAt: int | None = Field(default=None, description="Unix ms; server defaults if omitted")
    updatedAt: int | None = Field(default=None, description="Unix ms; server defaults if omitted")


class CodeSnippetUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, min_length=1)
    language: str | None = Field(default=None, min_length=1)
    code: str | None = None
    tags: list[str] | None = None
    pinned: bool | None = None


class CodeSnippetOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    language: str
    code: str
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False
    createdAt: int
    updatedAt: int
