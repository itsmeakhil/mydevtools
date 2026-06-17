import { NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"
import { requireNosqlAuth } from "@/app/api/nosql/_auth"
import { validateMongoConnectionString } from "@/app/api/nosql/_mongo-safety"
import { getMongoClient, releaseMongoClient } from "@/lib/nosql-client-pool"
import { validateAggregationPipeline } from "@/lib/nosql-aggregation-validator"

export async function POST(request: Request) {
  const authError = await requireNosqlAuth(request)
  if (authError) return authError

  try {
    const {
      connectionString,
      dbName,
      collectionName,
      query: queryStr = "{}",
      limit: rawLimit = 20,
      skip: rawSkip = 0,
      sortField,
      sortDirection,
    } = await request.json()

    if (!connectionString || !dbName || !collectionName) {
      return NextResponse.json(
        { error: "Connection string, database name, and collection name are required" },
        { status: 400 }
      )
    }

    const connectionError = validateMongoConnectionString(connectionString)
    if (connectionError) {
      return NextResponse.json({ error: connectionError }, { status: 400 })
    }

    const limitNum = Number.parseInt(String(rawLimit), 10)
    const skipNum = Number.parseInt(String(rawSkip), 10)
    const limit = Number.isFinite(limitNum) ? Math.min(Math.max(limitNum, 1), 500) : 20
    const skip = Number.isFinite(skipNum) ? Math.max(skipNum, 0) : 0
    const normalizedSortDirection = sortDirection === "desc" ? -1 : 1

    let query: any = {}
    let isAggregation = false

    try {
      query = typeof queryStr === "string" ? JSON.parse(queryStr || "{}") : queryStr

      const convertObjectIds = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(convertObjectIds)
        if (typeof obj !== "object" || obj === null) return obj

        for (const key in obj) {
          if (key === "_id" && typeof obj[key] === "string" && ObjectId.isValid(obj[key])) {
            obj[key] = new ObjectId(obj[key])
          } else {
            obj[key] = convertObjectIds(obj[key])
          }
        }
        return obj
      }

      query = convertObjectIds(query)
      isAggregation = Array.isArray(query)

      // Validate aggregation pipeline for security
      if (isAggregation) {
        const validation = validateAggregationPipeline(query)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON in query parameter" }, { status: 400 })
    }

    const client = await getMongoClient(connectionString)

    try {
      const db = client.db(dbName)
      const collection = db.collection(collectionName)

      let documents
      let total = 0

      if (isAggregation) {
        const countPipeline = [...query, { $count: "total" }]
        const countResult = await collection.aggregate(countPipeline).toArray()
        total = countResult.length > 0 ? countResult[0].total : 0

        const paginationPipeline: any[] = [...query]
        if (sortField) {
          paginationPipeline.push({ $sort: { [sortField]: normalizedSortDirection } })
        }
        paginationPipeline.push({ $skip: skip }, { $limit: limit })
        documents = await collection.aggregate(paginationPipeline).toArray()
      } else {
        let cursor = collection.find(query)
        if (sortField) {
          cursor = cursor.sort({ [sortField]: normalizedSortDirection })
        }
        documents = await cursor.skip(skip).limit(limit).toArray()
        total = await collection.countDocuments(query)
      }

      return NextResponse.json({ documents, total })
    } finally {
      releaseMongoClient(connectionString)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    )
  }
}
