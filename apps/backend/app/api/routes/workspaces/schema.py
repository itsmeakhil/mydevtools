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


class WorkspaceEncryptionInfo(BaseModel):
    scheme: str
    dekFingerprint: str
    createdAt: int
    rotatedAt: int | None = None
    # Set true when a member is removed; cleared on the next DEK rotation.
    # Signals admins that the shared key must be rotated to revoke the removed
    # member's decryption capability.
    rotationRequired: bool = False


class WorkspaceSettings(BaseModel):
    encryption: WorkspaceEncryptionInfo | None = None


class WorkspaceOut(BaseModel):
    id: str
    org_id: str
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


InvitationStatus = Literal["pending", "accepted", "revoked", "expired", "wrapping_pending"]


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, min_length=1, max_length=80)


class OrgPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, min_length=1, max_length=80)


class WorkspacePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)


class MemberOut(BaseModel):
    uid: str
    email: str | None
    display_name: str | None = None
    role: str
    since: int


class InviteMemberRequest(BaseModel):
    email: str = Field(min_length=1)
    role: str
    # Org-level invite only — optionally also grant a workspace membership on accept.
    workspace_id: str | None = None
    workspace_role: str | None = None


class ChangeRoleRequest(BaseModel):
    role: str


class InvitationOut(BaseModel):
    id: str
    org_id: str
    workspace_id: str | None
    invited_email: str
    invited_uid: str | None
    invited_role_org: OrgRole | None
    invited_role_ws: WsRole | None
    status: InvitationStatus
    token: str
    expires_at: int
    created_at: int


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


class WrappedDekBlob(BaseModel):
    encrypted: str
    iv: str
    senderPublicKey: str


class DekWrapOut(BaseModel):
    wrappedDek: WrappedDekBlob | None
    wrappedDekVersion: int
    # SHA-256 fingerprint of the current workspace DEK (from workspace settings).
    # Client verifies the unwrapped DEK matches this before trusting it (M-1).
    expectedFingerprint: str | None = None


class DekWrapPostRequest(BaseModel):
    target_uid: str
    wrapped: WrappedDekBlob


class WrapForMember(BaseModel):
    uid: str
    wrapped: WrappedDekBlob


class RotateDekRequest(BaseModel):
    dekFingerprint: str = Field(min_length=1)
    wraps: list[WrapForMember]


class PendingWrapOut(BaseModel):
    uid: str
    email: str | None
    publicKey: str | None
