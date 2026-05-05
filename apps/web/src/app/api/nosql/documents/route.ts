import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function GET(request: Request) {
    return NextResponse.json(
        {
            error: 'GET is disabled for security. Use POST /api/nosql/documents/query with a JSON body.',
        },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, document } = await request.json();

        if (!connectionString || !dbName || !collectionName || !document) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
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
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, documentId, update } = await request.json();

        if (!connectionString || !dbName || !collectionName || !documentId || !update) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
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
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, documentId } = await request.json();

        if (!connectionString || !dbName || !collectionName || !documentId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
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
