import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from app.core.config import get_settings


def get_firebase_app() -> firebase_admin.App:
    """
    Return the initialized Firebase app instance.
    If already initialized, reuse the default app.
    """
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    settings = get_settings()
    cred_json = settings.FIREBASE_CREDENTIALS_JSON
    cred_path = settings.FIREBASE_CREDENTIALS_PATH

    if cred_json:
        try:
            data = json.loads(cred_json)
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid FIREBASE_CREDENTIALS_JSON value. Must be valid JSON.") from exc
        cert = credentials.Certificate(data)
        return firebase_admin.initialize_app(cert)

    if cred_path:
        cert = credentials.Certificate(str(Path(cred_path).expanduser().resolve()))
        return firebase_admin.initialize_app(cert)

    return firebase_admin.initialize_app()
