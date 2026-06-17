import { NextResponse } from "next/server"
import { requireNosqlAuth } from "@/app/api/nosql/_auth"
import { sanitizeError } from '@/lib/nosql-error-sanitizer';
import { validateMongoConnectionString } from "@/app/api/nosql/_mongo-safety"
import { getMongoClient, releaseMongoClient } from "@/lib/nosql-client-pool"

export async function POST(request: Request) {
  const authError = await requireNosqlAuth(request)
  if (authError) return authError

  try {
    const { connectionString, dbName, collectionName } = await request.json()

    if (!connectionString || !dbName || !collectionName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const connectionError = validateMongoConnectionString(connectionString)
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 400 })
    }

    const client = await getMongoClient(connectionString)

    try {
      const collection = client.db(dbName).collection(collectionName)
      const indexes = await collection.indexes()
      let totalIndexSize: number | undefined
      try {
        const stats = await collection.aggregate([{ $collStats: { storageStats: {} } }]).toArray()
        totalIndexSize = stats[0]?.storageStats?.totalIndexSize
      } catch {
        // ignore unsupported collStats
      }
      return NextResponse.json({ indexes, totalIndexSize })
    } finally {
      releaseMongoClient(connectionString)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list indexes" },
      { status: 500 }
    )
  }
}
