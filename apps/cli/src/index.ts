#!/usr/bin/env bun

import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ContinuumClient } from "@continuum/sdk-js"

const [command, ...args] = process.argv.slice(2)
const client = new ContinuumClient(process.env.CONTINUUM_API_URL ?? "http://localhost:3030")

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, "../../..")
const adapterTemplateRoot = resolve(repoRoot, "templates/project-adapter")

type Flags = Record<string, string | boolean>

function parseFlags(values: string[]) {
  const positional: string[] = []
  const flags: Flags = {}

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? ""
    if (!value.startsWith("--")) {
      positional.push(value)
      continue
    }

    const key = value.slice(2)
    const next = values[index + 1]
    if (!next || next.startsWith("--")) {
      flags[key] = true
      continue
    }

    flags[key] = next
    index += 1
  }

  return { positional, flags }
}

function flagString(flags: Flags, name: string, fallback?: string) {
  const value = flags[name]
  if (typeof value === "string" && value.length > 0) return value
  return fallback
}

function help() {
  console.log(`continuum

Core API commands:
  health                               Check API health
  providers                            List configured LLM providers
  route <task>                         Route an LLM task to a provider
  prompt-compile <message>             Compile a prompt from user message only
  chat-dry-run <message>               Run a deterministic mock LLM chat request
  embed-dry-run <text>                 Generate deterministic mock embedding vectors
  context-build <task>                 Build a basic context pack
  handoff-create <objective>           Create a basic handoff pack
  handoff-compile <objective>          Compile a handoff from durable memory
  policy-check <purpose>               Run a policy check through the API
  eval-handoff <handoff-id>            Evaluate handoff completeness
  artifact-create <path>               Create a small artifact metadata record
  artifact-search <query>              Search artifact memory
  repo-index [path]                    Index local repository files as artifacts

Project workflow commands:
  adapter-install [path] --id <id> --name <name> [--force]
                                       Install/update a repo-local .memory adapter
  project-status [path]                Read adapter and summarize local repo state
  repo-index-workflow [path]           Index repo using .memory project id/namespace
  context-export [path] --task <task> [--output <file>]
                                       Build context and write Markdown + JSON
  handoff-save [path] --objective <objective> [--output <file>]
                                       Compile handoff and write Markdown + JSON
  session-close [path] --objective <objective>
                                       Index repo and save a handoff for next chat

Environment:
  CONTINUUM_API_URL defaults to http://localhost:3030
`)
}

function assertExists(path: string, label: string) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`)
  }
}

function readProjectConfig(projectRoot: string) {
  const projectYamlPath = join(projectRoot, ".memory/project.yaml")
  assertExists(projectYamlPath, "Continuum project adapter")
  const text = readFileSync(projectYamlPath, "utf8")
  const id = matchYamlScalar(text, "id") ?? "demo"
  const name = matchYamlScalar(text, "name") ?? id
  const namespace = matchYamlScalar(text, "memory_namespace") ?? `project/${id}`
  const handoffOutputDir = matchNestedYamlScalar(text, "handoff", "output_dir") ?? "docs/handoffs"

  return {
    id,
    name,
    namespace,
    handoffOutputDir,
    projectYamlPath,
  }
}

function matchYamlScalar(text: string, key: string) {
  const expression = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*["']?([^"'\\n#]+)["']?`, "m")
  const match = text.match(expression)
  return match?.[1]?.trim()
}

function matchNestedYamlScalar(text: string, parent: string, child: string) {
  const lines = text.split(/\r?\n/)
  let insideParent = false
  let parentIndent = 0

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue
    const indent = line.match(/^\s*/)?.[0].length ?? 0
    const trimmed = line.trim()

    if (trimmed === `${parent}:`) {
      insideParent = true
      parentIndent = indent
      continue
    }

    if (insideParent && indent <= parentIndent && !trimmed.startsWith(`${child}:`)) {
      insideParent = false
    }

    if (insideParent && trimmed.startsWith(`${child}:`)) {
      return trimmed
        .slice(child.length + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "")
    }
  }

  return undefined
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

function copyTemplateDirectory(
  source: string,
  target: string,
  replacements: Record<string, string>,
  force: boolean,
) {
  assertExists(source, "Template directory")
  mkdirSync(target, { recursive: true })

  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry)
    const targetPath = join(target, entry)
    const stat = statSync(sourcePath)

    if (stat.isDirectory()) {
      copyTemplateDirectory(sourcePath, targetPath, replacements, force)
      continue
    }

    if (existsSync(targetPath) && !force) {
      continue
    }

    mkdirSync(dirname(targetPath), { recursive: true })
    const buffer = readFileSync(sourcePath)
    if (isTextPath(sourcePath)) {
      let text = buffer.toString("utf8")
      for (const [from, to] of Object.entries(replacements)) {
        text = text.split(from).join(to)
      }
      writeFileSync(targetPath, text, "utf8")
    } else {
      copyFileSync(sourcePath, targetPath)
    }
  }
}

function isTextPath(path: string) {
  return /\.(md|txt|yaml|yml|json|ts|js|sh|toml|gitkeep)$/i.test(path) || path.endsWith("AGENTS.md")
}

function runGit(projectRoot: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  } catch {
    return ""
  }
}

function renderContextMarkdown(projectName: string, task: string, context: any) {
  const sections = Array.isArray(context.sections) ? context.sections : []
  const citations = Array.isArray(context.citations) ? context.citations : []
  const lines = [
    `# Continuum Context Export`,
    ``,
    `Project: ${projectName}`,
    `Task: ${task}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Sections`,
  ]

  if (sections.length === 0) {
    lines.push("", "No context sections were returned.")
  }

  for (const section of sections) {
    lines.push("", `### ${section.title ?? section.section ?? "Context Section"}`)
    const items = Array.isArray(section.items) ? section.items : []
    if (items.length === 0) {
      lines.push("", "No items.")
      continue
    }
    for (const item of items) {
      lines.push("", `- ${item.content ?? item.summary ?? JSON.stringify(item)}`)
    }
  }

  lines.push("", "## Citations")
  if (citations.length === 0) {
    lines.push("", "No citations were returned.")
  }
  for (const citation of citations) {
    lines.push(
      "",
      `- ${citation.memoryId ?? citation.id ?? "unknown"}: ${citation.label ?? citation.content ?? "citation"}`,
    )
  }

  return `${lines.join("\n")}\n`
}

function ensureParent(path: string) {
  mkdirSync(dirname(path), { recursive: true })
}

async function run() {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    help()
    return
  }

  if (command === "health") {
    console.log(JSON.stringify(await client.health(), null, 2))
  } else if (command === "providers") {
    console.log(JSON.stringify(await client.listLlmProviders(), null, 2))
  } else if (command === "route") {
    const task = args.join(" ") || "continue current software development task"
    console.log(
      JSON.stringify(
        await client.routeLlm({
          projectId: "demo",
          task,
          preferredProviderId: process.env.CONTINUUM_LLM_DEFAULT_PROVIDER ?? "mock",
          requiredCapabilities: ["chat"],
        }),
        null,
        2,
      ),
    )
  } else if (command === "prompt-compile") {
    const userMessage = args.join(" ") || "Continue from durable memory."
    console.log(
      JSON.stringify(
        await client.compilePrompt({
          projectId: "demo",
          userMessage,
          systemInstruction: "Use Continuum durable memory context when present.",
        }),
        null,
        2,
      ),
    )
  } else if (command === "chat-dry-run") {
    const message = args.join(" ") || "Confirm the LLM gateway is wired."
    console.log(
      JSON.stringify(
        await client.chat({
          projectId: "demo",
          providerId: "mock",
          messages: [{ role: "user", content: message }],
          execute: false,
        }),
        null,
        2,
      ),
    )
  } else if (command === "embed-dry-run") {
    const input = args.join(" ") || "Continuum memory embedding smoke test"
    console.log(
      JSON.stringify(
        await client.embeddings({
          projectId: "demo",
          providerId: "mock",
          input: [input],
          execute: false,
        }),
        null,
        2,
      ),
    )
  } else if (command === "context-build") {
    const task = args.join(" ") || "continue current software development task"
    console.log(
      JSON.stringify(
        await client.buildContext({
          task,
          include: ["project_state", "decisions", "procedures", "recent_episodes"],
        }),
        null,
        2,
      ),
    )
  } else if (command === "handoff-create") {
    const objective = args.join(" ") || "continue current software development task"
    console.log(
      JSON.stringify(
        await client.createHandoff({
          title: "Continuum Handoff",
          objective,
          currentState: "Initial CLI-generated handoff.",
          nextActions: ["Replace placeholder state with retrieved project memory."],
        }),
        null,
        2,
      ),
    )
  } else if (command === "policy-check") {
    const purpose = args.join(" ") || "verify governance policy path"
    console.log(
      JSON.stringify(
        await client.checkPolicy({
          action: "context.retrieve",
          projectId: "demo",
          purpose,
          sensitivity: "normal",
          payload: { source: "continuum-cli" },
        }),
        null,
        2,
      ),
    )
  } else if (command === "eval-handoff") {
    const handoffId = args[0]
    if (!handoffId) throw new Error("eval-handoff requires a handoff id")
    console.log(JSON.stringify(await client.evaluateHandoff({ handoffId }), null, 2))
  } else if (command === "artifact-create") {
    const path = args[0] ?? "README.md"
    console.log(
      JSON.stringify(
        await client.createArtifact({
          artifactKind: "documentation",
          namespace: "demo/artifacts",
          projectId: "demo",
          uri: `file://${path}`,
          path,
          name: path.split("/").at(-1) ?? path,
          mimeType: "text/markdown",
          status: "active",
          metadata: { createdBy: "continuum-cli" },
        }),
        null,
        2,
      ),
    )
  } else if (command === "artifact-search") {
    const query = args.join(" ") || "README"
    console.log(JSON.stringify(await client.searchArtifacts({ projectId: "demo", query }), null, 2))
  } else if (command === "repo-index") {
    const rootPath = args[0] ?? "."
    console.log(
      JSON.stringify(
        await client.indexRepo({
          projectId: "demo",
          namespace: "demo/artifacts",
          rootPath,
          maxFiles: 200,
          maxBytesPerFile: 80_000,
          captureContent: false,
          dryRun: false,
        }),
        null,
        2,
      ),
    )
  } else if (command === "handoff-compile") {
    const objective = args.join(" ") || "continue current software development task"
    console.log(
      JSON.stringify(
        await client.compileHandoff({
          title: "Continuum Compiled Handoff",
          objective,
          retrieval: { strategy: "handoff", minScore: 0.1, includeEvidence: true },
        }),
        null,
        2,
      ),
    )
  } else if (command === "adapter-install") {
    const { positional, flags } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const id =
      flagString(flags, "id", slug(projectRoot.split(/[\\/]/).at(-1) ?? "project")) ?? "project"
    const name = flagString(flags, "name", id) ?? id
    const force = flags.force === true
    copyTemplateDirectory(
      adapterTemplateRoot,
      projectRoot,
      {
        "replace-with-project-id": id,
        "Replace With Project Name": name,
      },
      force,
    )
    console.log(
      JSON.stringify(
        {
          ok: true,
          projectRoot,
          id,
          name,
          force,
          installed: [
            ".memory",
            "AGENTS.md",
            "docs/work/current-state.md",
            "docs/adr",
            "docs/handoffs",
          ],
        },
        null,
        2,
      ),
    )
  } else if (command === "project-status") {
    const { positional } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const config = readProjectConfig(projectRoot)
    const gitBranch = runGit(projectRoot, ["branch", "--show-current"])
    const gitStatus = runGit(projectRoot, ["status", "--short"])
    console.log(
      JSON.stringify(
        {
          projectRoot,
          projectId: config.id,
          projectName: config.name,
          namespace: config.namespace,
          adapter: relative(projectRoot, config.projectYamlPath),
          handoffOutputDir: config.handoffOutputDir,
          git: {
            branch: gitBranch || null,
            dirty: gitStatus.length > 0,
            status: gitStatus ? gitStatus.split(/\r?\n/) : [],
          },
        },
        null,
        2,
      ),
    )
  } else if (command === "repo-index-workflow") {
    const { positional, flags } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const config = readProjectConfig(projectRoot)
    const captureContent = flags["capture-content"] === true
    const dryRun = flags["dry-run"] === true
    const maxFiles = Number(flagString(flags, "max-files", "500"))
    console.log(
      JSON.stringify(
        await client.indexRepo({
          projectId: config.id,
          namespace: `${config.namespace}/artifacts`,
          rootPath: projectRoot,
          maxFiles,
          maxBytesPerFile: 120_000,
          captureContent,
          dryRun,
          excludeGlobs: [
            ".git/**",
            "node_modules/**",
            "dist/**",
            "build/**",
            "coverage/**",
            ".continuum-data/**",
            ".env",
            ".env.*",
          ],
        }),
        null,
        2,
      ),
    )
  } else if (command === "context-export") {
    const { positional, flags } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const config = readProjectConfig(projectRoot)
    const task =
      flagString(flags, "task", positional.slice(1).join(" ")) ||
      "continue current software development task"
    const output = resolve(
      projectRoot,
      flagString(flags, "output", `docs/handoffs/context-${nowStamp()}.md`) ??
        "docs/handoffs/context.md",
    )
    const context = await client.buildContext({
      projectId: config.id,
      task,
      query: task,
      include: ["project_state", "decisions", "procedures", "recent_episodes", "artifacts"],
      retrieval: { strategy: "balanced", includeEvidence: true, minScore: 0.1 },
      budget: { maxInputTokens: 12_000 },
    })
    const markdown = renderContextMarkdown(config.name, task, context)
    ensureParent(output)
    writeFileSync(output, markdown, "utf8")
    writeFileSync(output.replace(/\.md$/i, ".json"), JSON.stringify(context, null, 2), "utf8")
    console.log(
      JSON.stringify(
        { ok: true, projectId: config.id, output, jsonOutput: output.replace(/\.md$/i, ".json") },
        null,
        2,
      ),
    )
  } else if (command === "handoff-save") {
    const { positional, flags } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const config = readProjectConfig(projectRoot)
    const objective =
      flagString(flags, "objective", positional.slice(1).join(" ")) ||
      "continue current software development task"
    const output = resolve(
      projectRoot,
      flagString(flags, "output", join(config.handoffOutputDir, `handoff-${nowStamp()}.md`)) ??
        join(config.handoffOutputDir, "latest.md"),
    )
    const result: any = await client.compileHandoff({
      projectId: config.id,
      title: `${config.name} Handoff`,
      objective,
      query:
        "current state accepted decisions active constraints open tasks files changed commands verification risks next actions",
      retrieval: { strategy: "handoff", minScore: 0.1, includeEvidence: true },
    })
    ensureParent(output)
    writeFileSync(output, result.markdown ?? JSON.stringify(result, null, 2), "utf8")
    writeFileSync(
      output.replace(/\.md$/i, ".json"),
      JSON.stringify(result.json ?? result, null, 2),
      "utf8",
    )

    const latestMd = resolve(projectRoot, config.handoffOutputDir, "latest.md")
    const latestJson = resolve(projectRoot, config.handoffOutputDir, "latest.json")
    ensureParent(latestMd)
    writeFileSync(latestMd, result.markdown ?? JSON.stringify(result, null, 2), "utf8")
    writeFileSync(latestJson, JSON.stringify(result.json ?? result, null, 2), "utf8")

    console.log(
      JSON.stringify(
        {
          ok: true,
          projectId: config.id,
          output,
          jsonOutput: output.replace(/\.md$/i, ".json"),
          latestMd,
          latestJson,
        },
        null,
        2,
      ),
    )
  } else if (command === "session-close") {
    const { positional, flags } = parseFlags(args)
    const projectRoot = resolve(positional[0] ?? ".")
    const config = readProjectConfig(projectRoot)
    const objective =
      flagString(flags, "objective", positional.slice(1).join(" ")) ||
      "continue current software development task"
    const index = await client.indexRepo({
      projectId: config.id,
      namespace: `${config.namespace}/artifacts`,
      rootPath: projectRoot,
      maxFiles: Number(flagString(flags, "max-files", "500")),
      maxBytesPerFile: 120_000,
      captureContent: flags["capture-content"] === true,
      dryRun: false,
      excludeGlobs: [
        ".git/**",
        "node_modules/**",
        "dist/**",
        "build/**",
        "coverage/**",
        ".continuum-data/**",
        ".env",
        ".env.*",
      ],
    })
    const result: any = await client.compileHandoff({
      projectId: config.id,
      title: `${config.name} Session Close Handoff`,
      objective,
      query:
        "current state accepted decisions active constraints open tasks artifacts files changed commands verification risks next actions",
      retrieval: { strategy: "handoff", minScore: 0.1, includeEvidence: true },
    })
    const output = resolve(projectRoot, config.handoffOutputDir, `session-close-${nowStamp()}.md`)
    ensureParent(output)
    writeFileSync(output, result.markdown ?? JSON.stringify(result, null, 2), "utf8")
    writeFileSync(
      output.replace(/\.md$/i, ".json"),
      JSON.stringify(result.json ?? result, null, 2),
      "utf8",
    )
    writeFileSync(
      resolve(projectRoot, config.handoffOutputDir, "latest.md"),
      result.markdown ?? JSON.stringify(result, null, 2),
      "utf8",
    )
    writeFileSync(
      resolve(projectRoot, config.handoffOutputDir, "latest.json"),
      JSON.stringify(result.json ?? result, null, 2),
      "utf8",
    )
    console.log(
      JSON.stringify(
        {
          ok: true,
          projectId: config.id,
          indexed: index,
          output,
          latest: join(config.handoffOutputDir, "latest.md"),
        },
        null,
        2,
      ),
    )
  } else {
    console.error(`Unknown command: ${command}`)
    help()
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
