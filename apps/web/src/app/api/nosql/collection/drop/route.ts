import { NextResponse } from 'next/server';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { sanitizeError } from '@/lib/nosql-error-sanitizer';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';
import { getMongoClient, releaseMongoClient } from '@/lib/nosql-client-pool';

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

        const client = await getMongoClient(connectionString);

        const db = client.db(dbName);
        await db.dropCollection(collectionName);

        releaseMongoClient(connectionString);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
}
