from typing import Literal
from pydantic import BaseModel, Field

WsKind = Literal["personal", "shared"]
WsRole = Literal["admin", "developer", "viewer"]


class WorkspaceEncryptionInfo(BaseModel):
    scheme: str
    dekFingerprint: str
    createdAt: int
    rotatedAt: int | None = None
    # Retained for schema compatibility with existing encrypted workspaces.
    # No longer set now that member sharing is removed (single-user workspaces).
    rotationRequired: bool = False


class WorkspaceSettings(BaseModel):
    encryption: WorkspaceEncryptionInfo | None = None


class WorkspaceOut(BaseModel):
    id: str
    name: str
    slug: str
    is_personal: bool
    kind: WsKind
    ws_role: WsRole
    settings: WorkspaceSettings = WorkspaceSettings()


class SetActiveWorkspaceRequest(BaseModel):
    workspace_id: str = Field(min_length=1)


class SetActiveWorkspaceResponse(BaseModel):
    workspace_id: str


class EncryptionBlob(BaseModel):
    encrypted: str
    iv: str


class KeypairOut(BaseModel):
    publicKey: str
    privateKeyEncrypted: EncryptionBlob
    salt: str
    createdAt: int


class KeypairPostRequest(BaseModel):
    publicKey: str = Field(min_length=1)
    privateKeyEncrypted: EncryptionBlob
    salt: str = Field(min_length=1)
