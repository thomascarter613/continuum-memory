import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const required = [
  "README.md",
  "AGENTS.md",
  "SECURITY.md",
  "VERSION",
  "package.json",
  "apps/api/src/index.ts",
  "apps/web/src/main.ts",
  "infra/docker/compose.yaml",
  "infra/migrations",
  "docs/release/v1-readiness-checklist.md",
]

let ok = true
for (const path of required) {
  const present = existsSync(resolve(path))
  console.log(`${present ? "✓" : "✗"} ${path}`)
  if (!present) ok = false
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const version = readFileSync("VERSION", "utf8").trim()
if (pkg.version !== version) {
  console.error(`✗ package.json version (${pkg.version}) does not match VERSION (${version})`)
  ok = false
} else {
  console.log(`✓ version ${version}`)
}

if (!ok) process.exit(1)
console.log("Continuum doctor passed.")
