from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.routes.auth.cookie_attach import attach_auth_cookies
from app.api.routes.auth.passkey import services as passkey_services
from app.core.firebase import get_firebase_app

try:
    from firebase_admin import auth as firebase_auth
except ModuleNotFoundError:  # pragma: no cover
    firebase_auth = None  # type: ignore[assignment]
from app.api.routes.auth.passkey.schema import (
    LoginFinishRequest,
    PasskeyListResponse,
    PasskeySummary,
    RegisterFinishRequest,
    RenamePasskeyRequest,
)
from app.api.routes.auth.services import get_current_uid
from app.api.routes.auth.tokens import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
)
from app.api.routes.auth.users_repo import (
    list_passkeys,
    remove_passkey,
    rename_passkey,
    set_refresh_token_hash,
)
from app.core import audit
from app.core.limiter import limiter

router = APIRouter(prefix="/auth/passkey", tags=["auth-passkey"])


# ── Registration (auth required) ──────────────────────────────────────────────


@router.post("/register/begin", summary="Begin passkey registration")
@limiter.limit("10/minute")
async def register_begin(
    request: Request,
    uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    options = await passkey_services.begin_registration(uid)
    audit.set_action("auth.passkey.register_begin")
    audit.set_entity("user", uid)
    return options


@router.post("/register/finish", summary="Finish passkey registration")
@limiter.limit("10/minute")
async def register_finish(
    request: Request,
    payload: RegisterFinishRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    result = await passkey_services.finish_registration(uid, payload.credential, payload.device_name)
    audit.set_action("auth.passkey.register")
    audit.set_entity("user", uid)
    audit.set_summary(f"Registered passkey: {result['device_name']}")
    return result


# ── Login (anonymous) ─────────────────────────────────────────────────────────


@router.post("/login/begin", summary="Begin passkey login (resident-key)")
@limiter.limit("20/minute")
async def login_begin(request: Request) -> dict:
    return await passkey_services.begin_login()


@router.post("/login/finish", summary="Finish passkey login → set session cookies")
@limiter.limit("20/minute")
async def login_finish(
    request: Request,
    payload: LoginFinishRequest,
    response: Response,
) -> dict:
    uid = await passkey_services.finish_login(payload.credential)
    access = create_access_token(uid)
    raw_refresh = new_refresh_token()
    await set_refresh_token_hash(uid, hash_refresh_token(raw_refresh))
    attach_auth_cookies(response, access, raw_refresh)
    audit.set_action("auth.passkey.login")
    audit.set_entity("user", uid)
    audit.set_summary("Signed in with passkey")

    # Firebase custom token so the frontend can hydrate its Firebase session.
    # RequireAuth gates on Firebase user; passkey-only backend cookies aren't enough.
    firebase_token: str | None = None
    if firebase_auth is not None:
        try:
            get_firebase_app()
            token_bytes = firebase_auth.create_custom_token(uid)
            firebase_token = token_bytes.decode("utf-8") if isinstance(token_bytes, bytes) else token_bytes
        except Exception:
            firebase_token = None  # fail soft — backend cookies still work

    return {"uid": uid, "firebase_custom_token": firebase_token}


# ── Manage (auth required) ────────────────────────────────────────────────────


@router.get("", response_model=PasskeyListResponse, summary="List user's passkeys")
async def list_endpoint(uid: Annotated[str, Depends(get_current_uid)]) -> PasskeyListResponse:
    passkeys = await list_passkeys(uid)
    return PasskeyListResponse(
        passkeys=[
            PasskeySummary(
                credential_id=p["credential_id"],
                device_name=p.get("device_name"),
                backed_up=bool(p.get("backed_up", False)),
                transports=list(p.get("transports") or []),
                created_at=p.get("created_at"),
                last_used_at=p.get("last_used_at"),
            )
            for p in passkeys
        ]
    )


@router.patch("/{credential_id}", summary="Rename a passkey")
@limiter.limit("20/minute")
async def rename_endpoint(
    request: Request,
    credential_id: str,
    payload: RenamePasskeyRequest,
    uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    modified = await rename_passkey(uid, credential_id, payload.device_name.strip())
    if not modified:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passkey not found.")
    audit.set_action("auth.passkey.rename")
    audit.set_entity("user", uid)
    return {"ok": True}


@router.delete("/{credential_id}", summary="Delete a passkey")
@limiter.limit("10/minute")
async def delete_endpoint(
    request: Request,
    credential_id: str,
    uid: Annotated[str, Depends(get_current_uid)],
) -> dict:
    modified = await remove_passkey(uid, credential_id)
    if not modified:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passkey not found.")
    audit.set_action("auth.passkey.delete")
    audit.set_entity("user", uid)
    audit.set_summary("Removed a passkey")
    return {"ok": True}
