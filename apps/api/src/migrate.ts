import { getConfig } from "./config"
import { createPool } from "./db/pool"
import { runMigrations } from "./db/migrations"

const config = getConfig()
const pool = createPool(config.databaseUrl)

try {
  const result = await runMigrations(pool, config.migrationsDir)
  console.log(JSON.stringify({ ok: true, ...result }, null, 2))
} finally {
  await pool.end()
}
