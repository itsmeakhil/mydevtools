import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';
import { getMongoClient, releaseMongoClient } from '@/lib/nosql-client-pool';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, documentIds } = await request.json();

        if (!connectionString || !dbName || !collectionName || !Array.isArray(documentIds)) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }
        if (documentIds.length === 0) {
            return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
        }
        if (documentIds.length > 1000) {
            return NextResponse.json({ error: 'Bulk delete limited to 1000 documents per request' }, { status: 400 });
        }

        const objectIds: ObjectId[] = documentIds
            .filter((id: string) => ObjectId.isValid(id))
            .map((id: string) => new ObjectId(id));

        const client = await getMongoClient(connectionString);
        const collection = client.db(dbName).collection(collectionName);
        const result = await collection.deleteMany({ _id: { $in: objectIds } });
        releaseMongoClient(connectionString);

        return NextResponse.json({ deletedCount: result.deletedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to delete documents' }, { status: 500 });
    }
}
