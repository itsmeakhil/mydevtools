import secrets
import time


def create_timestamp() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    """Generate a cryptographically secure, URL-safe unique identifier."""
    return secrets.token_urlsafe(18)  # 144 bits of entropy

