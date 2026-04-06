import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionString = searchParams.get('connectionString');

    if (!connectionString) {
        return NextResponse.json(
            { error: 'Connection string is required' },
            { status: 400 }
        );
    }

    try {
        const client = new MongoClient(connectionString);
        await client.connect();

        const dbs = await client.db().admin().listDatabases();

        await client.close();

        return NextResponse.json({ databases: dbs.databases });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to list databases' },
            { status: 500 }
        );
    }
}
