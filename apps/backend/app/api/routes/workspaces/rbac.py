from typing import Annotated, Literal
from fastapi import Depends, HTTPException, status
from app.api.routes.workspaces.middleware import WorkspaceContext, get_workspace_ctx
from app.api.routes.workspaces.schema import WsRole

Permission = Literal["read", "write", "delete", "admin"]

ENCRYPTED_TOOLS: set[str] = {
    "password-manager",
    "environment-manager",
    "api-key-vault",
}


def _full() -> set[Permission]:
    return {"read", "write", "delete", "admin"}


def _editor() -> set[Permission]:
    return {"read", "write", "delete"}


def _reader() -> set[Permission]:
    return {"read"}


def _none() -> set[Permission]:
    return set()


def _encrypted_row() -> dict[WsRole, set[Permission]]:
    # Encrypted tools are gated in B for shared workspaces — no role has access.
    # ponytail: in C this row flips per workspace once a DEK exists.
    return {"admin": _none(), "developer": _none(), "viewer": _none()}


def _plaintext_row() -> dict[WsRole, set[Permission]]:
    return {"admin": _full(), "developer": _editor(), "viewer": _reader()}


# Hardcoded canonical RBAC matrix.
TOOL_PERMISSIONS: dict[str, dict[WsRole, set[Permission]]] = {
    # Encrypted tools — Personal-only in B.
    "password-manager":    _encrypted_row(),
    "environment-manager": _encrypted_row(),
    "api-key-vault":       _encrypted_row(),

    # Plaintext tools.
    "notes":             _plaintext_row(),
    "bookmarks":         _plaintext_row(),
    "tasks":             _plaintext_row(),
    "code-snippets":     _plaintext_row(),
    "api-client":        _plaintext_row(),
    "nosql-explorer":    _plaintext_row(),
    "sql-client":        _plaintext_row(),
    "redis-commander":   _plaintext_row(),
    "s3-drive":          _plaintext_row(),
    "json-formatter":    _plaintext_row(),
    "url-shortener":     _plaintext_row(),
    "dns-lookup":        _plaintext_row(),
}


def has_permission(ctx: WorkspaceContext, tool: str, permission: Permission) -> bool:
    if ctx.is_personal:
        return True
    # Encrypted tools in a shared workspace flip from "no access" to plaintext-row
    # permissions once the workspace has an initialized DEK (settings.encryption).
    if tool in ENCRYPTED_TOOLS and ctx.has_encryption:
        return permission in _plaintext_row().get(ctx.ws_role, set())
    return permission in TOOL_PERMISSIONS.get(tool, {}).get(ctx.ws_role, set())


def require_permission(tool: str, permission: Permission):
    async def dep(
        ctx: Annotated[WorkspaceContext, Depends(get_workspace_ctx)],
    ) -> WorkspaceContext:
        if not has_permission(ctx, tool, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {ctx.ws_role} lacks {permission} on {tool}",
            )
        return ctx
    return dep
