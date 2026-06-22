from app.database.db import get_db

db = get_db()


async def insert_one(collection_name, data):
    return await db[collection_name].insert_one(data)


async def insert_many(collection_name, data_list):
    return await db[collection_name].insert_many(data_list)


async def update_one(collection_name, query, payload, upsert=False, array_filters=None):
    return await db[collection_name].update_one(
        query, payload, upsert=upsert, array_filters=array_filters
    )


async def update_many(collection_name, query, payload):
    return await db[collection_name].update_many(query, payload)


async def find_one_and_update(collection_name, query, update_query, return_document=False):
    return await db[collection_name].find_one_and_update(
        query, update_query, return_document=return_document
    )


async def replace_one(collection_name, query, replacement, upsert=False):
    return await db[collection_name].replace_one(query, replacement, upsert=upsert)


async def delete_one(collection_name, query):
    return await db[collection_name].delete_one(query)


async def delete_many(collection_name, query):
    return await db[collection_name].delete_many(query)


async def bulk_write(collection_name, data, ordered=True):
    return await db[collection_name].bulk_write(data, ordered=ordered)


async def find_one(collection_name, query, projection=None):
    return await db[collection_name].find_one(query, projection)


async def find(
    collection_name,
    query,
    projection=None,
    sort=None,
    skip=0,
    limit=0,
    collation=None,
):
    cursor = db[collection_name].find(query, projection)
    if collation:
        cursor = cursor.collation(collation)
    if skip:
        cursor = cursor.skip(skip)
    if sort:
        if isinstance(sort, tuple):
            sort = [sort]
        cursor = cursor.sort(sort)
    if limit:
        return await cursor.to_list(length=limit)
    return await cursor.to_list(length=None)


async def count_documents(collection_name, query):
    return await db[collection_name].count_documents(query)


async def distinct(collection_name, field, query):
    if query is None:
        query = {}
    return await db[collection_name].distinct(field, query)


async def aggregate(collection_name, query):
    cursor = db[collection_name].aggregate(query)
    return await cursor.to_list(length=None)


async def create_index(
    collection_name, field, unique=False, sparse=False, expire_after_seconds=None
):
    kwargs = {"unique": unique, "sparse": sparse}
    if expire_after_seconds is not None:
        kwargs["expireAfterSeconds"] = expire_after_seconds
    await db[collection_name].create_index(field, **kwargs)


async def drop_index(collection_name, name):
    await db[collection_name].drop_index(name)


async def list_indexes(collection_name):
    return await db[collection_name].list_indexes().to_list(length=None)
