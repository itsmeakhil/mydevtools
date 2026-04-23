import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionString = searchParams.get('connectionString');
    const dbName = searchParams.get('dbName');
    const collectionName = searchParams.get('collectionName');

    if (!connectionString || !dbName || !collectionName) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);
        const indexes = await collection.indexes();
        let totalIndexSize: number | undefined;
        try {
            const stats = await collection.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
            totalIndexSize = stats[0]?.storageStats?.totalIndexSize;
        } catch { /* ignore if unsupported */ }
        await client.close();
        return NextResponse.json({ indexes, totalIndexSize });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to list indexes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { connectionString, dbName, collectionName, keys, options } = await request.json();
        if (!connectionString || !dbName || !collectionName || !keys) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
    try {
        const { connectionString, dbName, collectionName, indexName } = await request.json();
        if (!connectionString || !dbName || !collectionName || !indexName) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
