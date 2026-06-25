from __future__ import annotations

import base64
import secrets
from typing import Any

from fastapi import HTTPException, status
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.api.routes.auth.passkey import challenges
from app.api.routes.auth.users_repo import (
    add_passkey,
    find_user_by_credential_id,
    find_user_by_user_handle,
    get_or_create_webauthn_user_handle,
    get_user_doc,
    list_passkeys,
    update_passkey_usage,
)
from app.core.config import get_settings
from app.utils.utils import create_timestamp


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + pad)


def _origins() -> list[str]:
    raw = get_settings().WEBAUTHN_ORIGINS
    return [o.strip() for o in raw.split(",") if o.strip()]


# ── Registration ──────────────────────────────────────────────────────────────


async def begin_registration(uid: str) -> dict[str, Any]:
    user = await get_user_doc(uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    new_handle = _b64url_encode(secrets.token_bytes(32))
    handle_b64 = await get_or_create_webauthn_user_handle(uid, new_handle)

    existing = await list_passkeys(uid)
    exclude = [
        PublicKeyCredentialDescriptor(id=_b64url_decode(p["credential_id"]))
        for p in existing
        if p.get("credential_id")
    ]

    settings = get_settings()
    opts = generate_registration_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=_b64url_decode(handle_b64),
        user_name=user.get("email") or uid,
        user_display_name=user.get("display_name") or user.get("email") or uid,
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=exclude,
    )

    await challenges.put("register", uid, _b64url_encode(opts.challenge))
    # options_to_json returns a JSON string with browser-ready (base64url) values
    import json as _json

    return _json.loads(options_to_json(opts))


async def finish_registration(
    uid: str, credential: dict[str, Any], device_name: str | None
) -> dict[str, Any]:
    challenge_b64 = await challenges.pop("register", uid)
    if not challenge_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge expired or missing."
        )

    settings = get_settings()
    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=_b64url_decode(challenge_b64),
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=_origins(),
            require_user_verification=False,
        )
    except Exception as exc:  # webauthn lib raises a variety of subclasses
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Passkey registration failed: {exc}"
        ) from exc

    credential_id_b64 = _b64url_encode(verification.credential_id)
    # Dedup: a single credential can only belong to one user
    if await find_user_by_credential_id(credential_id_b64):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Passkey is already registered."
        )

    transports_raw = credential.get("response", {}).get("transports") or []
    aaguid = (
        verification.aaguid
        if isinstance(verification.aaguid, str)
        else (_b64url_encode(verification.aaguid) if verification.aaguid else None)
    )

    passkey_doc = {
        "credential_id": credential_id_b64,
        "public_key": _b64url_encode(verification.credential_public_key),
        "sign_count": int(verification.sign_count or 0),
        "transports": [str(t) for t in transports_raw],
        "aaguid": aaguid,
        "device_name": device_name or "Passkey",
        "backed_up": bool(getattr(verification, "credential_backed_up", False)),
        "created_at": create_timestamp(),
        "last_used_at": None,
    }
    await add_passkey(uid, passkey_doc)
    return {"credential_id": credential_id_b64, "device_name": passkey_doc["device_name"]}


# ── Authentication ────────────────────────────────────────────────────────────


async def begin_login() -> dict[str, Any]:
    settings = get_settings()
    opts = generate_authentication_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        user_verification=UserVerificationRequirement.PREFERRED,
        allow_credentials=[],  # resident-key discovery
    )
    # Anonymous flow → key challenge by its own bytes so finish can locate it
    challenge_b64 = _b64url_encode(opts.challenge)
    await challenges.put("login", challenge_b64, challenge_b64)

    import json as _json

    return _json.loads(options_to_json(opts))


async def finish_login(credential: dict[str, Any]) -> str:
    """Verify assertion; return uid on success."""
    # Recover challenge from clientDataJSON to look it up
    try:
        client_data_b64 = credential["response"]["clientDataJSON"]
        client_data = _b64url_decode(client_data_b64)
        import json as _json

        challenge_b64 = _json.loads(client_data.decode("utf-8")).get("challenge")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed credential payload."
        ) from exc
    if not challenge_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Missing challenge in clientDataJSON."
        )

    stored = await challenges.pop("login", challenge_b64)
    if not stored or stored != challenge_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Challenge expired or unknown."
        )

    user_handle_b64 = credential.get("response", {}).get("userHandle")
    user = None
    if user_handle_b64:
        user = await find_user_by_user_handle(user_handle_b64)
    if not user:
        user = await find_user_by_credential_id(credential.get("id", ""))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown passkey."
        )

    credential_id = credential.get("id", "")
    passkey = next(
        (p for p in (user.get("passkeys") or []) if p.get("credential_id") == credential_id),
        None,
    )
    if not passkey:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credential not registered for user."
        )

    settings = get_settings()
    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=_b64url_decode(challenge_b64),
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=_origins(),
            credential_public_key=_b64url_decode(passkey["public_key"]),
            credential_current_sign_count=int(passkey.get("sign_count") or 0),
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Passkey verification failed: {exc}"
        ) from exc

    await update_passkey_usage(
        uid=str(user["_id"]),
        credential_id=credential_id,
        sign_count=int(verification.new_sign_count or 0),
    )
    return str(user["_id"])
