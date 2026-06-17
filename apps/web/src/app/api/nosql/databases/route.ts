import { NextResponse } from 'next/server';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';
import { getMongoClient, releaseMongoClient } from '@/lib/nosql-client-pool';

export async function GET(request: Request) {
    return NextResponse.json(
        {
            error: 'GET is disabled for security. Use POST /api/nosql/databases with a JSON body.',
        },
        { status: 405 }
    );
}

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

        const client = await getMongoClient(connectionString);

        const dbs = await client.db().admin().listDatabases();
        releaseMongoClient(connectionString);

        return NextResponse.json({ databases: dbs.databases });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to list databases' },
            { status: 500 }
        );
    }
}
