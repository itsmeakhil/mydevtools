import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
    try {
        const { connectionString, dbName } = await request.json();

        if (!connectionString || !dbName) {
            return NextResponse.json(
                { error: 'Connection string and database name are required' },
                { status: 400 }
            );
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        const db = client.db(dbName);
        await db.dropDatabase();

        await client.close();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to drop database' },
            { status: 500 }
        );
    }
}
