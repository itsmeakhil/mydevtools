import functools
import hashlib
import random
import string
import time
from pymongo.collection import Collection

def create_timestamp() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"{create_timestamp()}-{suffix}"


# def col(name: str) -> Collection:
#     return get_db()[name]
