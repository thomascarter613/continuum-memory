import { Pool, type PoolClient } from "pg"

export function createPool(databaseUrl: string) {
  return new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.CONTINUUM_DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.CONTINUUM_DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
  })
}

export type PgPool = Pool
export type PgClient = PoolClient
