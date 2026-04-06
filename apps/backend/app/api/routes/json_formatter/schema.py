from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

JsonFormatterPane = Literal["left", "right"]


class JsonFormatterDocumentCreate(BaseModel):
    title: str = Field(min_length=1)
    pane: JsonFormatterPane
    content: str = ""


class JsonFormatterDocumentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1)
    pane: Optional[JsonFormatterPane] = None
    content: Optional[str] = None


class JsonFormatterDocumentOut(BaseModel):
    id: str
    title: str
    pane: JsonFormatterPane
    content: str
    createdAt: str
    updatedAt: str
