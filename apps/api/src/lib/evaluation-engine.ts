import type {
  CreateMemoryEvaluation,
  EvaluationFinding,
  HandoffPack,
  MemoryCandidate,
  MemoryRecord,
} from "@continuum/domain"
import { now } from "./time"

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function projectIdFromScope(scope: Record<string, unknown> | undefined) {
  return typeof scope?.projectId === "string" ? scope.projectId : undefined
}

function evidenceCount(memory: Pick<MemoryRecord | MemoryCandidate, "sourceEventIds" | "sourceArtifactIds">) {
  return (memory.sourceEventIds?.length ?? 0) + (memory.sourceArtifactIds?.length ?? 0)
}

export function evaluateMemoryLike(input: {
  target: MemoryRecord | MemoryCandidate
  targetType: "memory" | "candidate"
}): CreateMemoryEvaluation {
  const findings: EvaluationFinding[] = []
  const recommendations: string[] = []
  const target = input.target
  let score = 1

  if (target.content.trim().length < 24) {
    score -= 0.18
    findings.push({ code: "memory.content.too_short", severity: "warning", message: "Memory content is very short." })
    recommendations.push("Add enough context for a future model to understand why this matters.")
  }

  const sources = evidenceCount(target)
  if (sources === 0) {
    score -= 0.35
    findings.push({ code: "memory.evidence.missing", severity: "error", message: "Memory has no source event or artifact evidence." })
    recommendations.push("Attach at least one sourceEventId or sourceArtifactId.")
  }

  if (target.confidence < 0.5) {
    score -= 0.16
    findings.push({ code: "memory.confidence.low", severity: "warning", message: "Memory confidence is below 0.5." })
    recommendations.push("Treat this as a candidate until more evidence is available.")
  }

  if (!target.namespace.includes(":")) {
    score -= 0.08
    findings.push({ code: "memory.namespace.weak", severity: "info", message: "Namespace is not strongly typed." })
    recommendations.push("Use names such as project:demo/decisions or user:default/preferences.")
  }

  if (target.sensitivity === "secret") {
    score -= 0.35
    findings.push({ code: "memory.sensitivity.secret", severity: "error", message: "Secret material should not be stored as ordinary memory." })
    recommendations.push("Replace secret values with a redacted vault reference.")
  } else if (target.sensitivity === "sensitive") {
    score -= 0.1
    findings.push({ code: "memory.sensitivity.sensitive", severity: "warning", message: "Sensitive memory requires stricter retrieval policy." })
    recommendations.push("Verify retrieval policies exclude this unless explicitly allowed.")
  }

  if (!projectIdFromScope(target.scope) && target.namespace.startsWith("project:")) {
    score -= 0.08
    findings.push({ code: "memory.scope.project_id_missing", severity: "info", message: "Project namespace does not include scope.projectId." })
    recommendations.push("Add scope.projectId to improve project-bounded retrieval.")
  }

  const finalScore = clamp01(Number(score.toFixed(4)))
  const evaluation: CreateMemoryEvaluation = {
    evaluationKind: "memory_quality",
    targetType: input.targetType,
    targetId: target.id,
    score: finalScore,
    passed: finalScore >= 0.72 && !findings.some((finding) => finding.severity === "error"),
    findings,
    recommendations,
    metrics: {
      evidenceCount: sources,
      confidence: target.confidence,
      contentLength: target.content.length,
      sensitivity: target.sensitivity,
    },
    createdAt: now(),
  }

  const projectId = projectIdFromScope(target.scope)
  if (projectId) evaluation.projectId = projectId

  return evaluation
}

function listLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

export function evaluateHandoffCompleteness(handoff: HandoffPack): CreateMemoryEvaluation {
  const payload = handoff.payload
  const findings: EvaluationFinding[] = []
  const recommendations: string[] = []
  const requiredSections = [
    ["currentState", typeof payload.currentState === "string" && payload.currentState.trim().length > 0],
    ["acceptedDecisions", listLength(payload.acceptedDecisions) > 0],
    ["nextActions", listLength(payload.nextActions) > 0],
    ["sourceMemoryIds", listLength(payload.sourceMemoryIds) > 0],
  ] as const

  let score = 1
  for (const [section, present] of requiredSections) {
    if (!present) {
      score -= 0.18
      findings.push({
        code: `handoff.${section}.missing`,
        severity: section === "sourceMemoryIds" ? "warning" : "error",
        message: `Handoff is missing a useful ${section} section.`,
      })
      recommendations.push(`Populate ${section} before relying on this handoff for cross-session transfer.`)
    }
  }

  if (!payload.contextPackId) {
    score -= 0.08
    findings.push({ code: "handoff.context_pack.missing", severity: "info", message: "Handoff is not linked to a context pack." })
    recommendations.push("Prefer compiled handoffs so contextPackId and retrieval audit records are preserved.")
  }

  const finalScore = clamp01(Number(score.toFixed(4)))
  const evaluation: CreateMemoryEvaluation = {
    evaluationKind: "handoff_completeness",
    targetType: "handoff",
    targetId: handoff.id,
    score: finalScore,
    passed: finalScore >= 0.72 && !findings.some((finding) => finding.severity === "error"),
    findings,
    recommendations,
    metrics: {
      markdownLength: handoff.markdown.length,
      sourceMemoryCount: listLength(payload.sourceMemoryIds),
      nextActionCount: listLength(payload.nextActions),
      decisionCount: listLength(payload.acceptedDecisions),
    },
    createdAt: now(),
  }

  if (handoff.projectId) evaluation.projectId = handoff.projectId

  return evaluation
}
