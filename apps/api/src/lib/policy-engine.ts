import type { CreatePolicyDecision, ParsedPolicyCheckRequest, PolicyDecisionKind } from "@continuum/domain"
import { now } from "./time"

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
]

function payloadText(input: ParsedPolicyCheckRequest) {
  return JSON.stringify(input.payload ?? {})
}

function hasSecretLikePayload(input: ParsedPolicyCheckRequest) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(payloadText(input)))
}

export function checkPolicy(input: ParsedPolicyCheckRequest): CreatePolicyDecision {
  const reasons: string[] = []
  const obligations: string[] = []
  let decision: PolicyDecisionKind = "allow"

  if (input.projectId) reasons.push(`project scope ${input.projectId} declared`)
  if (!input.projectId && ["context.retrieve", "handoff.export"].includes(input.action)) {
    reasons.push("no project scope was supplied")
    obligations.push("prefer project-scoped retrieval and handoff compilation")
  }

  if (["memory.write", "candidate.promote"].includes(input.action) && input.evidenceCount === 0) {
    decision = "deny"
    reasons.push("durable memory writes require at least one source event or artifact")
    obligations.push("attach sourceEventIds or sourceArtifactIds before writing durable memory")
  }

  if (input.sensitivity === "secret") {
    decision = "deny"
    reasons.push("secret memory cannot be stored, retrieved, or exported by default")
    obligations.push("store only a redacted pointer or vault reference")
  } else if (input.sensitivity === "sensitive" && !input.allowSensitive) {
    decision = decision === "deny" ? decision : "review"
    reasons.push("sensitive memory requires explicit allowSensitive=true or human review")
    obligations.push("redact unrelated sensitive details from context products")
  }

  if (hasSecretLikePayload(input)) {
    decision = "deny"
    reasons.push("payload appears to contain secret-like material")
    obligations.push("redact secret values and retry with non-secret metadata")
  }

  if (input.action === "handoff.export") {
    obligations.push("include sourceMemoryIds and avoid raw private transcripts in handoff artifacts")
  }

  if (input.action === "context.retrieve") {
    obligations.push("exclude superseded memories unless explicitly requested")
    obligations.push("include evidence citations when possible")
  }

  if (["artifact.write", "artifact.index", "artifact.export"].includes(input.action)) {
    obligations.push("store artifact metadata and checksums before full content where possible")
    obligations.push("exclude generated directories, dependency folders, and private runtime data from repository indexes")
  }

  if (["llm.route", "llm.call", "llm.embed", "prompt.compile"].includes(input.action)) {
    obligations.push("audit provider, model, latency, token usage, and dry-run/execution status")
    obligations.push("prefer mock or local providers for smoke tests and sensitive development data")
  }

  if (!reasons.length) reasons.push("no deny or review condition matched")

  const result: CreatePolicyDecision = {
    action: input.action,
    decision,
    sensitivity: input.sensitivity,
    reasons,
    obligations,
    input: input as unknown as Record<string, unknown>,
    createdAt: now(),
  }

  if (input.projectId) result.projectId = input.projectId
  if (input.actorId) result.actorId = input.actorId
  if (input.namespace) result.namespace = input.namespace
  if (input.targetType) result.targetType = input.targetType
  if (input.targetId) result.targetId = input.targetId

  return result
}
