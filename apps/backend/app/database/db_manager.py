from app.database.db import get_db


db=get_db()

def insert_one(collection_name, data):
    return db[collection_name].insert_one(data)

def insert_many(collection_name, data_list):
    return db[collection_name].insert_many(data_list)

def update_one(collection_name, query, payload, upsert=False, array_filters=None):
    return db[collection_name].update_one(
        query, payload, upsert=upsert, array_filters=array_filters
    )

def update_many(collection_name, query, payload):
    return db[collection_name].update_many(query, payload)


def find_one_and_update(collection_name, query, update_query, return_document=False
):
    return db[collection_name].find_one_and_update(query, update_query, return_document=return_document)


def delete_one(collection_name, query, ):
    return db[collection_name].delete_one(query)
   


def delete_many(collection_name, query):
    return db[collection_name].delete_many(query)


def bulk_write(collection_name, data):
    return db[collection_name].bulk_write(data)


def find_one(collection_name, query, projection=None):
   
    return db[collection_name].find_one(query, projection)


def find(
    collection_name,
    query,
    projection=None,
    sort=None,
    skip=0,
    limit=0,
    collation=None,
):
    
    if not collation:
        cursor= db[collection_name].find(query, projection)
    else:
        cursor= db[collection_name].find(query, projection).collation(collation)
    if skip:
        cursor = cursor.skip(skip)
    if limit:
        cursor = cursor.limit(limit)

    if sort:
        if isinstance(sort, tuple):
            sort = [sort]
        cursor = cursor.sort(sort)
    return list(cursor)


def count_documents(collection_name, query):
    cursor= db[collection_name].count_documents(query)
    return cursor


def distinct(collection_name, field, query):
    if query is None:
        query = {}
    return db[collection_name].distinct(field, query)


def aggregate(collection_name, query):
    data = db[collection_name].aggregate(query)
    return list(data)


def create_index(collection_name, field, unique=False, sparse=False, background=False):
    db[collection_name].create_index(field, unique=unique, sparse=sparse, background=background)


def drop_index(collection_name, name):
    db[collection_name].drop_index(name)


def list_indexes(collection_name):
    db[collection_name].list_indexes()