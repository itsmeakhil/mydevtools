from typing import Literal
from pydantic import BaseModel, Field

OrgKind = Literal["system", "user"]
OrgRole = Literal["owner", "admin", "member", "viewer"]
WsKind = Literal["personal", "shared"]
WsRole = Literal["admin", "developer", "viewer"]


class OrgOut(BaseModel):
    id: str
    name: str
    slug: str
    kind: OrgKind
    org_role: OrgRole


class WorkspaceOut(BaseModel):
    id: str
    org_id: str
    name: str
    slug: str
    is_personal: bool
    kind: WsKind
    ws_role: WsRole


class SetActiveWorkspaceRequest(BaseModel):
    workspace_id: str = Field(min_length=1)


class SetActiveWorkspaceResponse(BaseModel):
    workspace_id: str
