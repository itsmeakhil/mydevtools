import secrets
import time

from pymongo.errors import PyMongoError


def create_timestamp() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    return secrets.token_urlsafe(18)


def is_duplicate_key_error(exc: PyMongoError) -> bool:
    msg = str(exc)
    return "E11000" in msg or "duplicate" in msg.lower()

