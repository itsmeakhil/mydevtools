import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName } = await request.json();

        if (!connectionString || !dbName || !collectionName) {
            return NextResponse.json(
                { error: 'Connection string, database name, and collection name are required' },
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
        await db.dropCollection(collectionName);

        await client.close();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to drop collection' },
            { status: 500 }
        );
    }
}
