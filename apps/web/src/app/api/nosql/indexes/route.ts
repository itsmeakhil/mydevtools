import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function GET(request: Request) {
    return NextResponse.json(
        {
            error: 'GET is disabled for security. Use POST /api/nosql/indexes/list with a JSON body.',
        },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, keys, options } = await request.json();
        if (!connectionString || !dbName || !collectionName || !keys) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }
        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);
        const indexName = await collection.createIndex(keys, options || {});
        await client.close();
        return NextResponse.json({ indexName });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to create index' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, indexName } = await request.json();
        if (!connectionString || !dbName || !collectionName || !indexName) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }
        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);
        await collection.dropIndex(indexName);
        await client.close();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to drop index' }, { status: 500 });
    }
}
