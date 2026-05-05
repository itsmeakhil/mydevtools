import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { requireNosqlAuth } from "@/app/api/nosql/_auth"
import { validateMongoConnectionString } from "@/app/api/nosql/_mongo-safety"

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

    const client = new MongoClient(connectionString)
    await client.connect()

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
      await client.close()
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list indexes" },
      { status: 500 }
    )
  }
}
