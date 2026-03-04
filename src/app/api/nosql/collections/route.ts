import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionString = searchParams.get('connectionString');
    const dbName = searchParams.get('dbName');

    if (!connectionString || !dbName) {
        return NextResponse.json(
            { error: 'Connection string and database name are required' },
            { status: 400 }
        );
    }

    try {
        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        const collectionsList = await db.listCollections().toArray();

        // Get document counts for each collection
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
