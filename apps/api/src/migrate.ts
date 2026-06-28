import { getConfig } from "./config"
import { runMigrations } from "./db/migrations"
import { createPool } from "./db/pool"

const config = getConfig()
const pool = createPool(config.databaseUrl)

try {
  const result = await runMigrations(pool, config.migrationsDir)
  console.log(JSON.stringify({ ok: true, ...result }, null, 2))
} finally {
  await pool.end()
}
