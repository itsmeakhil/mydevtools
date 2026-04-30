import functools
import hashlib
import random
import string
import time
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from app.database.db import get_db

def now_ms() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{now_ms()}-{suffix}"


def col(name: str) -> Collection:
    return get_db()[name]
