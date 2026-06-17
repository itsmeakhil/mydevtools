import { NextResponse } from 'next/server';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';
import { getMongoClient, releaseMongoClient } from '@/lib/nosql-client-pool';
import { sanitizeError, validateDbName } from '@/lib/nosql-error-sanitizer';

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, oldDbName, newDbName } = await request.json();

        if (!connectionString || !oldDbName || !newDbName) {
            return NextResponse.json({ error: 'Connection string, old DB name, and new DB name are required' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }

        const oldNameValidation = validateDbName(oldDbName);
        if (!oldNameValidation.valid) {
            return NextResponse.json({ error: oldNameValidation.error }, { status: 400 });
        }

        const newNameValidation = validateDbName(newDbName);
        if (!newNameValidation.valid) {
            return NextResponse.json({ error: newNameValidation.error }, { status: 400 });
        }

        const client = await getMongoClient(connectionString);

        try {
            const oldDb = client.db(oldDbName);
            const collections = await oldDb.listCollections().toArray();

            // Move each collection
            for (const collection of collections) {
                const collectionName = collection.name;
                if (collectionName.startsWith('system.')) continue;

                const adminDb = client.db('admin');
                await adminDb.command({
                    renameCollection: `${oldDbName}.${collectionName}`,
                    to: `${newDbName}.${collectionName}`
                });
            }

            return NextResponse.json({ success: true });
        } finally {
            releaseMongoClient(connectionString);
        }
    } catch (error: any) {
        return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
}
