import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
    try {
        const { connectionString, dbName, collectionName, documents } = await request.json();

        if (!connectionString || !dbName || !collectionName || !Array.isArray(documents)) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
