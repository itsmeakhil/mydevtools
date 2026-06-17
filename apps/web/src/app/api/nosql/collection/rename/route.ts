import { NextResponse } from 'next/server';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';
import { getMongoClient, releaseMongoClient } from '@/lib/nosql-client-pool';
import { sanitizeError, validateDbName, validateCollectionName } from '@/lib/nosql-error-sanitizer';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, newCollectionName } = await request.json();

        if (!connectionString || !dbName || !collectionName || !newCollectionName) {
            return NextResponse.json(
                { error: 'Connection string, database name, collection name, and new collection name are required' },
                { status: 400 }
            );
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }

        const dbValidation = validateDbName(dbName);
        if (!dbValidation.valid) {
            return NextResponse.json({ error: dbValidation.error }, { status: 400 });
        }

        const collValidation = validateCollectionName(collectionName);
        if (!collValidation.valid) {
            return NextResponse.json({ error: collValidation.error }, { status: 400 });
        }

        const newCollValidation = validateCollectionName(newCollectionName);
        if (!newCollValidation.valid) {
            return NextResponse.json({ error: newCollValidation.error }, { status: 400 });
        }

        const client = await getMongoClient(connectionString);

        const db = client.db(dbName);
        await db.collection(collectionName).rename(newCollectionName);

        releaseMongoClient(connectionString);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
}
