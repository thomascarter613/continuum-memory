import { createHash } from "node:crypto"
import { lstat, readdir, readFile, realpath } from "node:fs/promises"
import { basename, extname, join, relative, resolve, sep } from "node:path"
import type { CreateArtifactRecord, RepoIndexRequest } from "@continuum/domain"

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".txt",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".graphql",
  ".gql",
  ".proto",
  ".rego",
  ".env",
  ".example",
])

const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "biome.json",
  "turbo.json",
  "moon.yml",
  "moon.yaml",
  "docker-compose.yml",
  "compose.yaml",
  "Dockerfile",
  ".gitignore",
  ".env.example",
  "README.md",
  "AGENTS.md",
])

function normalizePath(value: string) {
  return value.split(sep).join("/")
}

function matchesSimpleGlob(path: string, pattern: string) {
  const normalized = normalizePath(path)
  const p = pattern.replaceAll("\\", "/")
  if (p === "**/*") return true
  if (p.endsWith("/**"))
    return normalized === p.slice(0, -3) || normalized.startsWith(`${p.slice(0, -3)}/`)
  if (p.startsWith("**/*")) return normalized.endsWith(p.slice(4))
  if (p.startsWith("*.")) return normalized.endsWith(p.slice(1))
  return normalized === p || normalized.startsWith(`${p}/`)
}

function shouldExclude(path: string, patterns: string[]) {
  return patterns.some((pattern) => matchesSimpleGlob(path, pattern))
}

function inferArtifactKind(
  path: string,
  isDirectory: boolean,
): CreateArtifactRecord["artifactKind"] {
  if (isDirectory) return "directory"
  const name = basename(path)
  const ext = extname(name).toLowerCase()
  if (CONFIG_NAMES.has(name) || [".json", ".yaml", ".yml", ".toml"].includes(ext)) return "config"
  if ([".md", ".mdx", ".txt"].includes(ext)) return "documentation"
  if (
    [".sql", ".graphql", ".gql", ".proto", ".json", ".yaml", ".yml"].includes(ext) &&
    path.includes("schema")
  )
    return "schema"
  if ([".sh", ".bash", ".zsh"].includes(ext) || path.startsWith("scripts/")) return "script"
  if (path.includes("test") || path.includes("spec")) return "test"
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)) return "image"
  if (TEXT_EXTENSIONS.has(ext) || name === "Dockerfile") return "source_file"
  return "binary"
}

function inferMimeType(path: string, isDirectory: boolean) {
  if (isDirectory) return "inode/directory"
  const ext = extname(path).toLowerCase()
  const map: Record<string, string> = {
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".ts": "text/typescript",
    ".tsx": "text/typescript-jsx",
    ".js": "text/javascript",
    ".json": "application/json",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
    ".toml": "application/toml",
    ".sql": "application/sql",
    ".sh": "text/x-shellscript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  }
  return map[ext] ?? "application/octet-stream"
}

function isProbablyText(path: string) {
  const name = basename(path)
  return (
    TEXT_EXTENSIONS.has(extname(name).toLowerCase()) ||
    CONFIG_NAMES.has(name) ||
    name === "Dockerfile"
  )
}

export interface LocalRepoIndexResult {
  rootPath: string
  artifacts: CreateArtifactRecord[]
  ignoredCount: number
}

export async function indexLocalRepository(input: RepoIndexRequest): Promise<LocalRepoIndexResult> {
  const rootPath = await realpath(resolve(input.rootPath ?? "."))
  const namespace = input.namespace ?? "project/artifacts"
  const maxFiles = input.maxFiles ?? 500
  const maxBytesPerFile = input.maxBytesPerFile ?? 100_000
  const excludeGlobs = input.excludeGlobs ?? []
  const captureContent = input.captureContent ?? false
  const artifacts: CreateArtifactRecord[] = []
  let ignoredCount = 0

  async function walk(absPath: string) {
    if (artifacts.length >= maxFiles) return
    const rel = normalizePath(relative(rootPath, absPath)) || "."
    if (rel !== "." && shouldExclude(rel, excludeGlobs)) {
      ignoredCount += 1
      return
    }

    const stat = await lstat(absPath)
    if (stat.isSymbolicLink()) {
      ignoredCount += 1
      return
    }

    const isDirectory = stat.isDirectory()
    if (rel !== ".") {
      let contentPreview: string | undefined
      let contentText: string | undefined
      let checksum: string | undefined

      if (!isDirectory && stat.size <= maxBytesPerFile && isProbablyText(rel)) {
        const buffer = await readFile(absPath)
        checksum = createHash("sha256").update(buffer).digest("hex")
        const text = buffer.toString("utf8")
        contentPreview = text.slice(0, 1200)
        if (captureContent) contentText = text
      } else if (!isDirectory) {
        checksum = createHash("sha256").update(`${rel}:${stat.size}:${stat.mtimeMs}`).digest("hex")
      }

      const artifact: CreateArtifactRecord = {
        artifactKind: inferArtifactKind(rel, isDirectory),
        namespace,
        uri: `file://${join(rootPath, rel)}`,
        path: rel,
        name: basename(rel),
        mimeType: inferMimeType(rel, isDirectory),
        sensitivity: "normal",
        status: "indexed",
        metadata: {
          indexedBy: "continuum-memory",
          rootPath,
          relativePath: rel,
          mtimeMs: stat.mtimeMs,
        },
      }
      if (input.projectId) artifact.projectId = input.projectId
      if (!isDirectory) artifact.sizeBytes = stat.size
      if (checksum) artifact.checksum = checksum
      if (contentPreview) artifact.contentPreview = contentPreview
      if (contentText) artifact.contentText = contentText
      artifacts.push(artifact)
    }

    if (isDirectory) {
      const entries = await readdir(absPath)
      entries.sort()
      for (const entry of entries) await walk(join(absPath, entry))
    }
  }

  await walk(rootPath)
  return { rootPath, artifacts, ignoredCount }
}
