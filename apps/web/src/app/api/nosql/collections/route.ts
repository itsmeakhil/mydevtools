import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function GET(request: Request) {
    return NextResponse.json(
        {
            error: 'GET is disabled for security. Use POST /api/nosql/collections with a JSON body.',
        },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName } = await request.json();

        if (!connectionString || !dbName) {
            return NextResponse.json(
                { error: 'Connection string and database name are required' },
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
        const collectionsList = await db.listCollections().toArray();

        const collectionsWithCounts = await Promise.all(
            collectionsList.map(async (col) => {
                try {
                    const count = await db.collection(col.name).estimatedDocumentCount();
                    return { ...col, documentCount: count };
                } catch {
                    return { ...col, documentCount: null };
                }
            })
        );

        await client.close();

        return NextResponse.json({ collections: collectionsWithCounts });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to list collections' },
            { status: 500 }
        );
    }
}
