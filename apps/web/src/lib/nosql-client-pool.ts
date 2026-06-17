import { MongoClient } from "mongodb"

interface PooledConnection {
  client: MongoClient
  lastUsed: number
  refCount: number
}

class MongoClientPool {
  private static instance: MongoClientPool
  private pool: Map<string, PooledConnection> = new Map()
  private connecting: Map<string, Promise<MongoClient>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly maxPoolSize = 5
  private readonly idleTimeoutMs = 300000 // 5 minutes
  private readonly connectTimeoutMs = 10000 // 10 second connection timeout

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
    // Return existing pooled client if available
    const existing = this.pool.get(connectionString)
    if (existing) {
      existing.lastUsed = Date.now()
      existing.refCount++
      return existing.client
    }

    // If already connecting, wait for that promise to complete
    const pendingConnection = this.connecting.get(connectionString)
    if (pendingConnection) {
      const client = await pendingConnection
      const pooled = this.pool.get(connectionString)
      if (pooled) {
        pooled.refCount++
        pooled.lastUsed = Date.now()
      }
      return client
    }

    // Start new connection with timeout
    const connectionPromise = this.createConnection(connectionString)
    this.connecting.set(connectionString, connectionPromise)

    try {
      const client = await this.withTimeout(connectionPromise, this.connectTimeoutMs)
      this.connecting.delete(connectionString)
      return client
    } catch (error) {
      this.connecting.delete(connectionString)
      throw error
    }
  }

  private async createConnection(connectionString: string): Promise<MongoClient> {
    const client = new MongoClient(connectionString, {
      maxPoolSize: this.maxPoolSize,
      minPoolSize: 1,
      maxIdleTimeMS: this.idleTimeoutMs,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })

    await client.connect()

    this.pool.set(connectionString, {
      client,
      lastUsed: Date.now(),
      refCount: 1,
    })

    return client
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Connection timeout after ${ms}ms`)), ms)
      ),
    ])
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
