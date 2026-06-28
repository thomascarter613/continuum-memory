import { randomUUID } from "node:crypto"
import type {
  ContextPack,
  HandoffCreateRequest,
  MemoryRecord,
  ParsedHandoffCompileRequest,
} from "@continuum/domain"
import { now } from "./time"

type HandoffBuckets = {
  currentState: string[]
  decisions: string[]
  constraints: string[]
  completedWork: string[]
  recentEpisodes: string[]
  procedures: string[]
  risks: string[]
  openQuestions: string[]
  nextActions: string[]
  verification: string[]
}

const SECTION_TO_BUCKET: Record<string, keyof HandoffBuckets> = {
  project_state: "currentState",
  user_preferences: "constraints",
  decisions: "decisions",
  constraints: "constraints",
  procedures: "procedures",
  recent_episodes: "recentEpisodes",
  open_tasks: "nextActions",
  risks: "risks",
  verification: "verification",
}

function unique(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

function asHandoffLine(memory: MemoryRecord) {
  return `${memory.content} [memory:${memory.id}; confidence:${memory.confidence.toFixed(2)}]`
}

function inferBucket(memory: MemoryRecord): keyof HandoffBuckets {
  const text =
    `${memory.memoryType} ${memory.content} ${JSON.stringify(memory.scope ?? {})}`.toLowerCase()

  if (memory.memoryType === "decision" || /\b(adr|decision|accepted|chose|chosen)\b/.test(text))
    return "decisions"
  if (
    memory.memoryType === "procedural" ||
    /\b(procedure|runbook|workflow|command|step)\b/.test(text)
  )
    return "procedures"
  if (
    memory.memoryType === "episodic" ||
    /\b(recent|session|happened|completed|passed|failed)\b/.test(text)
  ) {
    if (/\b(completed|done|finished|implemented|added)\b/.test(text)) return "completedWork"
    return "recentEpisodes"
  }
  if (/\b(risk|blocker|blocked|danger|concern)\b/.test(text)) return "risks"
  if (/\b(open question|question|unknown|decide|clarify)\b/.test(text)) return "openQuestions"
  if (/\b(next|todo|remaining|follow up|follow-up)\b/.test(text)) return "nextActions"
  if (/\b(constraint|must|should not|cannot|policy|prefer|preference|default)\b/.test(text))
    return "constraints"
  if (/\b(test|check|verify|verification|passed|failing|failed)\b/.test(text)) return "verification"
  return "currentState"
}

function collectSourceMemories(contextPack: ContextPack) {
  const memoriesById = new Map<string, MemoryRecord>()

  for (const section of contextPack.sections) {
    for (const ranked of section.rankedMemories) {
      memoriesById.set(ranked.memory.id, ranked.memory)
    }
  }

  return [...memoriesById.values()]
}

function collectBuckets(contextPack: ContextPack, sourceMemories: MemoryRecord[]) {
  const buckets: HandoffBuckets = {
    currentState: [],
    decisions: [],
    constraints: [],
    completedWork: [],
    recentEpisodes: [],
    procedures: [],
    risks: [],
    openQuestions: [],
    nextActions: [],
    verification: [],
  }

  for (const section of contextPack.sections) {
    const sectionBucket = SECTION_TO_BUCKET[section.name]
    for (const ranked of section.rankedMemories) {
      const bucket = sectionBucket ?? inferBucket(ranked.memory)
      buckets[bucket].push(asHandoffLine(ranked.memory))
    }
  }

  for (const memory of sourceMemories) {
    const alreadyCaptured = Object.values(buckets).some((items) =>
      items.some((item) => item.includes(memory.id)),
    )
    if (alreadyCaptured) continue
    buckets[inferBucket(memory)].push(asHandoffLine(memory))
  }

  return buckets
}

function renderCurrentState(
  input: ParsedHandoffCompileRequest,
  buckets: HandoffBuckets,
  contextPack: ContextPack,
) {
  if (input.currentStateOverride?.trim()) return input.currentStateOverride.trim()

  const topProjectState = buckets.currentState.slice(0, 6)
  const topRecent = buckets.recentEpisodes.slice(0, 4)
  const topCompleted = buckets.completedWork.slice(0, 4)
  const lines = [
    `This handoff was compiled for: ${input.objective}`,
    `Context task: ${contextPack.task}`,
  ]

  if (topProjectState.length) {
    lines.push("", "Project state:", ...topProjectState.map((item) => `- ${item}`))
  }
  if (topRecent.length) {
    lines.push("", "Recent activity:", ...topRecent.map((item) => `- ${item}`))
  }
  if (topCompleted.length) {
    lines.push("", "Completed work:", ...topCompleted.map((item) => `- ${item}`))
  }

  return lines.join("\n")
}

export function compileHandoff(input: ParsedHandoffCompileRequest, contextPack: ContextPack) {
  const sourceMemories = collectSourceMemories(contextPack)
  const buckets = collectBuckets(contextPack, sourceMemories)
  const compiledAt = now()
  const compileId = randomUUID()
  const sourceMemoryIds = unique(sourceMemories.map((memory) => memory.id))

  const handoffInput: HandoffCreateRequest = {
    ...(input.projectId ? { projectId: input.projectId } : {}),
    title: input.title,
    objective: input.objective,
    currentState: renderCurrentState(input, buckets, contextPack),
    acceptedDecisions: unique([...input.manualDecisions, ...buckets.decisions]).slice(0, 20),
    constraints: unique([...input.manualConstraints, ...buckets.constraints]).slice(0, 20),
    completedWork: unique([...input.manualCompletedWork, ...buckets.completedWork]).slice(0, 20),
    recentEpisodes: unique(buckets.recentEpisodes).slice(0, 20),
    procedures: unique(buckets.procedures).slice(0, 20),
    risks: unique([...input.manualRisks, ...buckets.risks]).slice(0, 20),
    openQuestions: unique([...input.manualOpenQuestions, ...buckets.openQuestions]).slice(0, 20),
    nextActions: unique([...input.manualNextActions, ...buckets.nextActions]).slice(0, 20),
    verification: unique([...input.manualVerification, ...buckets.verification]).slice(0, 20),
    artifactRefs: unique(input.artifactRefs),
    sourceMemoryIds,
    contextPackId: contextPack.id,
    compiledAt,
    metadata: {
      ...input.metadata,
      compileId,
      compiler: "continuum-handoff-compiler-v1",
      retrievalAuditId: contextPack.retrievalAuditId,
      contextPackTokenBudget: contextPack.tokenBudget,
      sectionNames: contextPack.sections.map((section) => section.name),
      sourceMemoryCount: sourceMemoryIds.length,
    },
  }

  const json = {
    compileId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    objective: input.objective,
    contextPackId: contextPack.id,
    retrievalAuditId: contextPack.retrievalAuditId,
    sourceMemoryIds,
    createdAt: compiledAt,
    handoffInput,
  }

  return {
    compileId,
    handoffInput,
    sourceMemoryIds,
    json,
    createdAt: compiledAt,
  }
}
