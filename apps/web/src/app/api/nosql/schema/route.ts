import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { requireNosqlAuth } from '@/app/api/nosql/_auth';
import { validateMongoConnectionString } from '@/app/api/nosql/_mongo-safety';

export async function GET(request: Request) {
    return NextResponse.json(
        {
            error: 'GET is disabled for security. Use POST /api/nosql/schema with a JSON body.',
        },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    const authError = await requireNosqlAuth(request);
    if (authError) return authError;

    try {
        const { connectionString, dbName, collectionName, sampleSize: rawSampleSize } = await request.json();
        const sampleSize = Math.min(parseInt(String(rawSampleSize ?? '200')), 1000);

        if (!connectionString || !dbName || !collectionName) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        const connectionError = validateMongoConnectionString(connectionString);
        if (connectionError) {
            return NextResponse.json({ error: connectionError }, { status: 400 });
        }

        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);

        const docs = await collection.aggregate([{ $sample: { size: sampleSize } }]).toArray();
        await client.close();

        if (docs.length === 0) {
            return NextResponse.json({ fields: [], sampleSize: 0 });
        }

        const fieldMap: Record<string, { types: Record<string, number>; nullCount: number; count: number; examples: any[] }> = {};

        const recordField = (key: string, val: any) => {
            if (!fieldMap[key]) {
                fieldMap[key] = { types: {}, nullCount: 0, count: 0, examples: [] };
            }
            fieldMap[key].count++;

            if (val === null || val === undefined) {
                fieldMap[key].nullCount++;
                fieldMap[key].types['null'] = (fieldMap[key].types['null'] || 0) + 1;
            } else if (typeof val === 'object' && val.$oid) {
                fieldMap[key].types['ObjectId'] = (fieldMap[key].types['ObjectId'] || 0) + 1;
                if (fieldMap[key].examples.length < 2) fieldMap[key].examples.push(val.$oid);
            } else if (typeof val === 'object' && val.$date) {
                fieldMap[key].types['Date'] = (fieldMap[key].types['Date'] || 0) + 1;
            } else if (Array.isArray(val)) {
                fieldMap[key].types['Array'] = (fieldMap[key].types['Array'] || 0) + 1;
            } else if (typeof val === 'object') {
                fieldMap[key].types['Object'] = (fieldMap[key].types['Object'] || 0) + 1;
            } else {
                const t = typeof val;
                fieldMap[key].types[t] = (fieldMap[key].types[t] || 0) + 1;
                if (fieldMap[key].examples.length < 2 && val !== '') {
                    fieldMap[key].examples.push(val);
                }
            }
        };

        docs.forEach(doc => {
            Object.entries(doc).forEach(([key, val]) => recordField(key, val));
        });

        const fields = Object.entries(fieldMap)
            .map(([name, data]) => ({
                name,
                types: data.types,
                nullCount: data.nullCount,
                count: data.count,
                coverage: Math.round((data.count / docs.length) * 100),
                examples: data.examples,
            }))
            .sort((a, b) => {
                if (a.name === '_id') return -1;
                if (b.name === '_id') return 1;
                return b.coverage - a.coverage || a.name.localeCompare(b.name);
            });

        return NextResponse.json({ fields, sampleSize: docs.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to analyze schema' }, { status: 500 });
    }
}
