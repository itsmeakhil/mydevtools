import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export async function POST(request: Request) {
    try {
        const { connectionString, dbName, collectionName, documentIds } = await request.json();

        if (!connectionString || !dbName || !collectionName || !Array.isArray(documentIds)) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        if (documentIds.length === 0) {
            return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
        }

        const objectIds: ObjectId[] = documentIds
            .filter((id: string) => ObjectId.isValid(id))
            .map((id: string) => new ObjectId(id));

        const client = new MongoClient(connectionString);
        await client.connect();
        const collection = client.db(dbName).collection(collectionName);
        const result = await collection.deleteMany({ _id: { $in: objectIds } });
        await client.close();

        return NextResponse.json({ deletedCount: result.deletedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to delete documents' }, { status: 500 });
    }
}
