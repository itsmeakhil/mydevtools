import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionString = searchParams.get('connectionString');
    const dbName = searchParams.get('dbName');
    const collectionName = searchParams.get('collectionName');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const queryStr = searchParams.get('query') || '{}';
    const sortField = searchParams.get('sortField');
    const sortDirection = searchParams.get('sortDirection') === 'desc' ? -1 : 1;

    if (!connectionString || !dbName || !collectionName) {
        return NextResponse.json(
            { error: 'Connection string, database name, and collection name are required' },
            { status: 400 }
        );
    }

    try {
        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        let query: any = {};
        let isAggregation = false;

        try {
            query = JSON.parse(queryStr);

            // Helper to recursively convert ObjectId strings
            const convertObjectIds = (obj: any): any => {
                if (Array.isArray(obj)) {
                    return obj.map(convertObjectIds);
                } else if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) {
                        if (key === '_id' && typeof obj[key] === 'string' && ObjectId.isValid(obj[key])) {
                            obj[key] = new ObjectId(obj[key]);
                        } else {
                            obj[key] = convertObjectIds(obj[key]);
                        }
                    }
                }
                return obj;
            };

            query = convertObjectIds(query);
            isAggregation = Array.isArray(query);
        } catch (e) {
            // Invalid JSON query, ignore or handle
            console.error("Invalid JSON query", e);
        }

        let documents;
        let total = 0;

        if (isAggregation) {
            // Aggregation Pipeline
            const countPipeline = [...query, { $count: "total" }];
            const countResult = await collection.aggregate(countPipeline).toArray();
            total = countResult.length > 0 ? countResult[0].total : 0;

            const paginationPipeline: any[] = [
                ...query
            ];

            if (sortField) {
                paginationPipeline.push({ $sort: { [sortField]: sortDirection } });
            }

            paginationPipeline.push({ $skip: skip }, { $limit: limit });
            documents = await collection.aggregate(paginationPipeline).toArray();
        } else {
            // Standard Find
            let cursor = collection.find(query);
            if (sortField) {
                cursor = cursor.sort({ [sortField]: sortDirection });
            }
            documents = await cursor.skip(skip).limit(limit).toArray();
            total = await collection.countDocuments(query);
        }

        await client.close();

        return NextResponse.json({ documents, total });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch documents' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { connectionString, dbName, collectionName, document } = await request.json();

        if (!connectionString || !dbName || !collectionName || !document) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Parse _id if it's a string that looks like an ObjectId
        if (document._id && typeof document._id === 'string' && ObjectId.isValid(document._id)) {
            // Don't convert automatically on insert unless user specifically wants to? 
            // Usually insert generates a new ID. If user provides one, use it.
            // Let's assume standard behavior: if _id is provided, use it.
            // But if it's a string, should we convert to ObjectId? 
            // MongoDB driver might handle this, but usually we want ObjectId.
            // Let's try to convert if it's a valid ObjectId string.
            try {
                document._id = new ObjectId(document._id);
            } catch (e) {
                // keep as string
            }
        }

        const result = await collection.insertOne(document);

        await client.close();

        return NextResponse.json({ result });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to insert document' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const { connectionString, dbName, collectionName, documentId, update } = await request.json();

        if (!connectionString || !dbName || !collectionName || !documentId || !update) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        let filter = { _id: documentId };
        if (typeof documentId === 'string' && ObjectId.isValid(documentId)) {
            try {
                filter = { _id: new ObjectId(documentId) };
            } catch (e) {
                // keep as string
            }
        }

        // Ensure we don't try to update _id
        delete update._id;

        const result = await collection.updateOne(filter, { $set: update });

        await client.close();

        return NextResponse.json({ result });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update document' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { connectionString, dbName, collectionName, documentId } = await request.json();

        if (!connectionString || !dbName || !collectionName || !documentId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        let filter = { _id: documentId };
        if (typeof documentId === 'string' && ObjectId.isValid(documentId)) {
            try {
                filter = { _id: new ObjectId(documentId) };
            } catch (e) {
                // keep as string
            }
        }

        const result = await collection.deleteOne(filter);

        await client.close();

        return NextResponse.json({ result });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete document' },
            { status: 500 }
        );
    }
}
