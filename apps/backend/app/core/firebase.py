import json
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials
except ModuleNotFoundError:  # pragma: no cover
    firebase_admin = None  # type: ignore[assignment]
    credentials = None  # type: ignore[assignment]

from app.core.config import get_settings


def get_firebase_app():
    """
    Return the initialized Firebase app instance.
    If already initialized, reuse the default app.
    """
    if firebase_admin is None or credentials is None:
        raise RuntimeError(
            "firebase-admin is not installed. Install backend deps to use Firebase auth."
        )
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
