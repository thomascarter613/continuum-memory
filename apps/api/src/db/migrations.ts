import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { PgPool } from "./pool"

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

export async function runMigrations(pool: PgPool, migrationsDir: string): Promise<MigrationResult> {
  await pool.query(`create table if not exists continuum_schema_migrations (
    version text primary key,
    filename text not null,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`)

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))

  const applied: string[] = []
  const skipped: string[] = []

  for (const file of files) {
    const version = file.split("_")[0] ?? file
    const fullPath = path.join(migrationsDir, file)
    const sql = await readFile(fullPath, "utf8")
    const checksum = createHash("sha256").update(sql).digest("hex")

    const existing = await pool.query(
      `select version from continuum_schema_migrations where version = $1`,
      [version],
    )
    if (existing.rows.length) {
      skipped.push(file)
      continue
    }

    const client = await pool.connect()
    try {
      await client.query("begin")
      await client.query(sql)
      await client.query(
        `insert into continuum_schema_migrations (version, filename, checksum)
         values ($1, $2, $3)`,
        [version, file, checksum],
      )
      await client.query("commit")
      applied.push(file)
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  }

  return { applied, skipped }
}
