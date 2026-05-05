import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, documents } = await request.json();

        if (!connectionString || !dbName || !collectionName || !Array.isArray(documents)) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }
        if (documents.length === 0) {
            return NextResponse.json({ error: 'No documents to import' }, { status: 400 });
        }
        if (documents.length > 10000) {
            return NextResponse.json({ error: 'Maximum 10,000 documents per import' }, { status: 400 });
        }

        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);
        const result = await collection.insertMany(documents, { ordered: false });
        await client.close();

        return NextResponse.json({ insertedCount: result.insertedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to import documents' }, { status: 500 });
    }
}
