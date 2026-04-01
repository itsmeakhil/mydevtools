import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
    try {
        const { connectionString, dbName, collectionName, newCollectionName } = await request.json();

        if (!connectionString || !dbName || !collectionName || !newCollectionName) {
            return NextResponse.json(
                { error: 'Connection string, database name, collection name, and new collection name are required' },
                { status: 400 }
            );
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        await db.collection(collectionName).rename(newCollectionName);

        await client.close();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to rename collection' },
            { status: 500 }
        );
    }
}
