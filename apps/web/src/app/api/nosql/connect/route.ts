import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString } = await request.json();

        if (!connectionString) {
            return NextResponse.json(
                { error: 'Connection string is required' },
                { status: 400 }
            );
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }

        const client = new MongoClient(connectionString);
        await client.connect();

        // List databases to verify connection and permissions
        const dbs = await client.db().admin().listDatabases();

        await client.close();

        return NextResponse.json({
            success: true,
            message: 'Connected successfully',
            databases: dbs.databases
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to connect to MongoDB' },
            { status: 500 }
        );
    }
}
