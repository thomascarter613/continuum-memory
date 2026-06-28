import type {
  CreateMemoryCandidate,
  ExtractMemoryCandidatesRequest,
  MemoryCandidateType,
  MemoryType,
} from "@continuum/domain"

const candidatePatterns: Array<{
  type: MemoryCandidateType
  suggestedMemoryType: MemoryType
  confidence: number
  pattern: RegExp
  rationale: string
}> = [
  {
    type: "preference",
    suggestedMemoryType: "semantic",
    confidence: 0.78,
    pattern: /\b(prefer|preference|like to|from now on|going forward|default to)\b/i,
    rationale: "The text appears to express a stable user or project preference.",
  },
  {
    type: "decision",
    suggestedMemoryType: "decision",
    confidence: 0.82,
    pattern: /\b(decided|decision|accepted|approved|we will|go with|use .+ as)\b/i,
    rationale: "The text appears to record an accepted decision.",
  },
  {
    type: "constraint",
    suggestedMemoryType: "semantic",
    confidence: 0.75,
    pattern: /\b(must|must not|never|always|constraint|required|do not|should not)\b/i,
    rationale: "The text appears to define a durable constraint or rule.",
  },
  {
    type: "task_state",
    suggestedMemoryType: "episodic",
    confidence: 0.7,
    pattern:
      /\b(todo|next action|next step|active work|current state|blocker|in progress|remaining)\b/i,
    rationale: "The text appears to describe task or session state.",
  },
  {
    type: "procedure",
    suggestedMemoryType: "procedural",
    confidence: 0.68,
    pattern: /\b(how to|procedure|workflow|runbook|steps|checklist|command)\b/i,
    rationale: "The text appears to describe a repeatable procedure.",
  },
  {
    type: "risk",
    suggestedMemoryType: "semantic",
    confidence: 0.66,
    pattern: /\b(risk|hazard|failure mode|concern|danger|mitigation)\b/i,
    rationale: "The text appears to describe a project risk or mitigation.",
  },
  {
    type: "open_question",
    suggestedMemoryType: "working",
    confidence: 0.62,
    pattern: /\?\s*$|\b(open question|unknown|need to decide|needs clarification)\b/i,
    rationale: "The text appears to contain an unresolved question.",
  },
]

function normalizeSegments(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((segment) => segment.trim().replace(/^[-*]\s+/, ""))
    .filter((segment) => segment.length >= 20)
    .slice(0, 24)
}

function classify(segment: string) {
  return candidatePatterns.find((candidatePattern) => candidatePattern.pattern.test(segment))
}

export function extractMemoryCandidates(
  input: ExtractMemoryCandidatesRequest,
): CreateMemoryCandidate[] {
  const scope: Record<string, unknown> = input.projectId ? { projectId: input.projectId } : {}
  const candidates: CreateMemoryCandidate[] = []

  for (const segment of normalizeSegments(input.text)) {
    const match = classify(segment)
    if (!match) continue

    candidates.push({
      candidateType: match.type,
      namespace: input.namespace,
      scope,
      content: segment,
      sourceEventIds: input.sourceEventIds ?? [],
      sourceArtifactIds: input.sourceArtifactIds ?? [],
      confidence: match.confidence,
      sensitivity: "normal",
      status: "proposed",
      rationale: match.rationale,
      suggestedMemoryType: match.suggestedMemoryType,
      suggestedActions: ["review", "promote_or_reject"],
    })
  }

  return candidates
}
