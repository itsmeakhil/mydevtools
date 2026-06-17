import { MongoClient } from "mongodb"

interface PooledConnection {
  client: MongoClient
  lastUsed: number
  refCount: number
}

class MongoClientPool {
  private static instance: MongoClientPool
  private pool: Map<string, PooledConnection> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly maxPoolSize = 5
  private readonly idleTimeoutMs = 300000 // 5 minutes

  private constructor() {
    this.startCleanupInterval()
  }

  static getInstance(): MongoClientPool {
    if (!MongoClientPool.instance) {
      MongoClientPool.instance = new MongoClientPool()
    }
    return MongoClientPool.instance
  }

  async getClient(connectionString: string): Promise<MongoClient> {
    const existing = this.pool.get(connectionString)

    if (existing) {
      existing.lastUsed = Date.now()
      existing.refCount++
      return existing.client
    }

    const client = new MongoClient(connectionString, {
      maxPoolSize: this.maxPoolSize,
      minPoolSize: 1,
      maxIdleTimeMS: this.idleTimeoutMs,
    })

    await client.connect()

    this.pool.set(connectionString, {
      client,
      lastUsed: Date.now(),
      refCount: 1,
    })

    return client
  }

  releaseClient(connectionString: string): void {
    const pooled = this.pool.get(connectionString)
    if (pooled) {
      pooled.refCount = Math.max(0, pooled.refCount - 1)
      pooled.lastUsed = Date.now()
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const keysToDelete: string[] = []

      for (const [connectionString, pooled] of this.pool.entries()) {
        // Close idle connections that aren't in use
        if (pooled.refCount === 0 && now - pooled.lastUsed > this.idleTimeoutMs) {
          keysToDelete.push(connectionString)
        }
      }

      for (const key of keysToDelete) {
        const pooled = this.pool.get(key)
        if (pooled && pooled.refCount === 0) {
          pooled.client.close().catch(console.error)
          this.pool.delete(key)
        }
      }
    }, 60000) // Check every minute
  }

  async closeAll(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    const closePromises = Array.from(this.pool.values()).map((pooled) =>
      pooled.client.close().catch(console.error)
    )

    await Promise.all(closePromises)
    this.pool.clear()
  }
}

export const getMongoClient = async (connectionString: string): Promise<MongoClient> => {
  return MongoClientPool.getInstance().getClient(connectionString)
}

export const releaseMongoClient = (connectionString: string): void => {
  MongoClientPool.getInstance().releaseClient(connectionString)
}

export const closeAllMongoClients = async (): Promise<void> => {
  await MongoClientPool.getInstance().closeAll()
}
