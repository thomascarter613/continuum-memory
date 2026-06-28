import { randomUUID } from "node:crypto"
import type {
  ContextEvidence,
  ContextPack,
  ContextPlan,
  ContextRanking,
  ContextSection,
  ContextSectionPlan,
  MemoryRecord,
  ParsedContextBuildRequest,
} from "@continuum/domain"
import { estimateTokens, now } from "./time"

const SECTION_DEFINITIONS: Record<string, Omit<ContextSectionPlan, "name" | "maxItems">> = {
  project_state: {
    purpose: "Current project facts, constraints, and state needed to continue work.",
    memoryTypes: ["semantic", "profile", "decision"],
    scopeKinds: ["project_state", "project_fact", "constraint"],
    keywords: ["project", "repo", "monorepo", "current", "state", "constraint"],
  },
  user_preferences: {
    purpose: "Stable user preferences relevant to how the assistant should work.",
    memoryTypes: ["semantic", "profile"],
    scopeKinds: ["user_preference", "preference"],
    keywords: ["prefer", "preference", "style", "default", "workflow"],
  },
  decisions: {
    purpose: "Accepted decisions, rationale, and architecture choices.",
    memoryTypes: ["decision"],
    scopeKinds: ["decision", "adr", "architecture_decision"],
    keywords: ["decision", "accepted", "adr", "rationale", "choose", "chosen"],
  },
  procedures: {
    purpose: "Procedures, runbooks, and repeatable ways of doing work.",
    memoryTypes: ["procedural"],
    scopeKinds: ["procedure", "runbook", "workflow"],
    keywords: ["procedure", "run", "workflow", "command", "step", "how to"],
  },
  recent_episodes: {
    purpose: "Recent events and progress that explain what just happened.",
    memoryTypes: ["episodic"],
    scopeKinds: ["episode", "recent", "session"],
    keywords: ["recent", "session", "happened", "completed", "failed", "passed"],
  },
  open_tasks: {
    purpose: "Open tasks, blockers, risks, and next actions.",
    memoryTypes: ["working", "semantic", "episodic"],
    scopeKinds: ["open_task", "task_state", "risk", "blocker"],
    keywords: ["open", "next", "todo", "task", "blocker", "risk"],
  },
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "with",
  "this",
  "that",
  "is",
  "are",
  "be",
  "as",
  "it",
  "from",
  "by",
])

function words(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_@/.:-]+/g)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function overlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0
  const rightSet = new Set(right)
  const hits = unique(left).filter((word) => rightSet.has(word)).length
  return hits / Math.max(1, Math.min(unique(left).length, unique(right).length))
}

function memoryText(memory: MemoryRecord) {
  return [
    memory.memoryType,
    memory.namespace,
    memory.content,
    JSON.stringify(memory.scope ?? {}),
    JSON.stringify(memory.structuredContent ?? {}),
  ].join(" ")
}

function ageScore(memory: MemoryRecord) {
  const updated = Date.parse(memory.updatedAt)
  if (Number.isNaN(updated)) return 0.4
  const ageDays = Math.max(0, (Date.now() - updated) / 86_400_000)
  if (ageDays <= 1) return 1
  if (ageDays <= 7) return 0.85
  if (ageDays <= 30) return 0.65
  if (ageDays <= 180) return 0.4
  return 0.2
}

function sectionAffinity(memory: MemoryRecord, section: ContextSectionPlan) {
  const reasons: string[] = []
  let score = 0

  if (section.memoryTypes.includes(memory.memoryType)) {
    score += 0.34
    reasons.push(`memory type ${memory.memoryType} matches ${section.name}`)
  }

  const scopeKind = typeof memory.scope.kind === "string" ? memory.scope.kind : undefined
  if (scopeKind && section.scopeKinds.includes(scopeKind)) {
    score += 0.3
    reasons.push(`scope kind ${scopeKind} matches ${section.name}`)
  }

  const keywordScore = overlapScore(section.keywords.flatMap(words), words(memoryText(memory)))
  if (keywordScore > 0) {
    score += Math.min(0.24, keywordScore * 0.24)
    reasons.push("section keywords matched memory content")
  }

  if (
    section.name === "open_tasks" &&
    /\b(open|next|todo|blocker|risk|failed|remaining)\b/i.test(memory.content)
  ) {
    score += 0.12
    reasons.push("content looks like unfinished work")
  }

  if (
    section.name === "user_preferences" &&
    /\b(prefer|preference|default|style|workflow)\b/i.test(memory.content)
  ) {
    score += 0.12
    reasons.push("content looks like a user preference")
  }

  return { score: Math.min(1, score), reasons }
}

function taskRelevance(
  memory: MemoryRecord,
  request: ParsedContextBuildRequest,
  section: ContextSectionPlan,
) {
  const taskWords = words(
    [request.task, request.query ?? "", section.name, section.purpose].join(" "),
  )
  const textWords = words(memoryText(memory))
  const score = overlapScore(taskWords, textWords)
  const reasons = score > 0 ? ["task/query terms matched memory content"] : []
  return { score, reasons }
}

function projectScopeScore(memory: MemoryRecord, projectId: string | undefined) {
  if (!projectId) return { score: 0.5, reasons: ["no project filter requested"] }
  if (memory.scope.projectId === projectId || memory.namespace.includes(projectId)) {
    return { score: 1, reasons: ["memory matches requested project"] }
  }
  return { score: 0, reasons: ["memory did not match requested project"] }
}

function strategyWeights(strategy: ParsedContextBuildRequest["retrieval"]["strategy"]) {
  if (strategy === "precision") {
    return { section: 0.34, task: 0.28, confidence: 0.2, recency: 0.08, evidence: 0.1 }
  }
  if (strategy === "recall") {
    return { section: 0.24, task: 0.22, confidence: 0.16, recency: 0.18, evidence: 0.2 }
  }
  if (strategy === "handoff") {
    return { section: 0.28, task: 0.2, confidence: 0.18, recency: 0.22, evidence: 0.12 }
  }
  return { section: 0.3, task: 0.24, confidence: 0.2, recency: 0.14, evidence: 0.12 }
}

function scoreMemory(
  memory: MemoryRecord,
  section: ContextSectionPlan,
  request: ParsedContextBuildRequest,
) {
  const sectionScore = sectionAffinity(memory, section)
  const taskScore = taskRelevance(memory, request, section)
  const scopeScore = projectScopeScore(memory, request.projectId)
  const weights = strategyWeights(request.retrieval.strategy)
  const evidenceScore = memory.sourceEventIds.length || memory.sourceArtifactIds.length ? 1 : 0.2
  const sensitivityPenalty =
    memory.sensitivity === "secret" || memory.sensitivity === "sensitive" ? 0.15 : 0

  let score =
    sectionScore.score * weights.section +
    taskScore.score * weights.task +
    memory.confidence * weights.confidence +
    ageScore(memory) * weights.recency +
    evidenceScore * weights.evidence

  if (request.projectId) score *= scopeScore.score
  score = Math.max(0, Math.min(1, score - sensitivityPenalty))

  const reasons = [...sectionScore.reasons, ...taskScore.reasons]
  if (evidenceScore >= 1) reasons.push("memory has source evidence")
  if (memory.confidence >= 0.75) reasons.push("memory has high confidence")
  if (sensitivityPenalty) reasons.push("sensitivity reduced score")
  if (request.projectId) reasons.push(...scopeScore.reasons)

  return { score, reasons: unique(reasons) }
}

function renderMemoryForContext(
  memory: MemoryRecord,
  ranking: ContextRanking,
  includeEvidence: boolean,
) {
  const evidence = includeEvidence
    ? ` [memory:${memory.id}; confidence:${memory.confidence.toFixed(2)}; score:${ranking.score.toFixed(2)}]`
    : ""
  return `- ${memory.content}${evidence}`
}

export function createContextPlan(request: ParsedContextBuildRequest): ContextPlan {
  const sections: ContextSectionPlan[] = request.include.map((name) => {
    const definition = SECTION_DEFINITIONS[name] ?? {
      purpose: `General context for ${name}`,
      memoryTypes: [],
      scopeKinds: [],
      keywords: words(name.replace(/_/g, " ")),
    }

    return {
      name,
      purpose: definition.purpose,
      memoryTypes: definition.memoryTypes,
      scopeKinds: definition.scopeKinds,
      keywords: definition.keywords,
      maxItems: request.budget.maxMemoriesPerSection,
    }
  })

  const plan: ContextPlan = {
    id: randomUUID(),
    task: request.task,
    strategy: request.retrieval.strategy,
    sections,
    createdAt: now(),
  }

  if (request.projectId) plan.projectId = request.projectId
  if (request.query) plan.query = request.query

  return plan
}

export interface BuildContextPackResult {
  pack: ContextPack
  rankings: ContextRanking[]
}

export function buildContextPack(
  request: ParsedContextBuildRequest,
  memories: MemoryRecord[],
): BuildContextPackResult {
  const plan = createContextPlan(request)
  const sections: ContextSection[] = []
  const rankings: ContextRanking[] = []
  const citationsByMemory = new Map<string, ContextEvidence>()
  const maxInputTokens = request.budget.maxInputTokens
  const reserveOutputTokens = request.budget.reserveOutputTokens
  const availableInputTokens = Math.max(0, maxInputTokens - reserveOutputTokens)
  let usedTokens = estimateTokens(`# Context for ${request.task}`)

  for (const sectionPlan of plan.sections) {
    const rankedForSection = memories
      .filter((memory) => request.retrieval.includeSuperseded || memory.status !== "superseded")
      .filter(
        (memory) =>
          request.retrieval.allowSensitive || !["sensitive", "secret"].includes(memory.sensitivity),
      )
      .map((memory) => {
        const scored = scoreMemory(memory, sectionPlan, request)
        const estimatedTokens = estimateTokens(memory.content) + 12
        return { memory, score: scored.score, reasons: scored.reasons, estimatedTokens }
      })
      .filter((entry) => entry.score >= request.retrieval.minScore)
      .sort((a, b) => b.score - a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt))

    const rankedMemories = []
    const contentLines: string[] = []
    let sectionTokens = estimateTokens(`## ${sectionPlan.name}`)
    let rank = 1

    for (const entry of rankedForSection) {
      if (rank > sectionPlan.maxItems) break
      if (usedTokens + entry.estimatedTokens > availableInputTokens) break

      const ranking: ContextRanking = {
        memoryId: entry.memory.id,
        sectionName: sectionPlan.name,
        score: Number(entry.score.toFixed(4)),
        rank,
        reasons: entry.reasons,
        estimatedTokens: entry.estimatedTokens,
      }

      rankings.push(ranking)
      rankedMemories.push({ memory: entry.memory, ranking })
      contentLines.push(
        renderMemoryForContext(entry.memory, ranking, request.retrieval.includeEvidence),
      )
      sectionTokens += entry.estimatedTokens
      usedTokens += entry.estimatedTokens

      if (request.retrieval.includeEvidence && !citationsByMemory.has(entry.memory.id)) {
        citationsByMemory.set(entry.memory.id, {
          memoryId: entry.memory.id,
          sourceEventIds: entry.memory.sourceEventIds,
          sourceArtifactIds: entry.memory.sourceArtifactIds,
          confidence: entry.memory.confidence,
          sensitivity: entry.memory.sensitivity,
        })
      }

      rank += 1
    }

    sections.push({
      name: sectionPlan.name,
      purpose: sectionPlan.purpose,
      memories: rankedMemories.map((entry) => entry.memory),
      rankedMemories,
      content: contentLines.join("\n"),
      estimatedTokens: sectionTokens,
    })
  }

  const pack: ContextPack = {
    id: randomUUID(),
    task: request.task,
    plan,
    sections,
    citations: [...citationsByMemory.values()],
    tokenBudget: {
      maxInputTokens,
      reserveOutputTokens,
      estimatedUsedTokens: usedTokens,
      remainingInputTokens: availableInputTokens - usedTokens,
    },
    createdAt: now(),
  }

  if (request.projectId) pack.projectId = request.projectId
  if (request.query) pack.query = request.query

  return { pack, rankings }
}
