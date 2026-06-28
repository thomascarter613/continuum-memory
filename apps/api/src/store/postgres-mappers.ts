import type {
  ArtifactRecord,
  RepoIndexRun,
  ContextRetrievalRequest,
  ContextRetrievalResult,
  HandoffPack,
  LlmCallAudit,
  LlmProviderConfig,
  MemoryCandidate,
  MemoryEvaluation,
  MemoryEvent,
  MemoryRecord,
  PolicyDecision,
} from "@continuum/domain"

function iso(value: Date | string | null | undefined) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function eventFromRow(row: Record<string, unknown>): MemoryEvent {
  const event: MemoryEvent = {
    id: String(row.id),
    eventType: String(row.event_type),
    actorType: String(row.actor_type),
    payload: (row.payload as Record<string, unknown>) ?? {},
    occurredAt: iso(row.occurred_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.actor_id) event.actorId = String(row.actor_id)
  if (row.subject_type) event.subjectType = String(row.subject_type)
  if (row.subject_id) event.subjectId = String(row.subject_id)
  if (row.project_id) event.projectId = String(row.project_id)
  if (row.conversation_id) event.conversationId = String(row.conversation_id)
  if (row.session_id) event.sessionId = String(row.session_id)
  if (row.run_id) event.runId = String(row.run_id)
  if (row.causation_id) event.causationId = String(row.causation_id)
  if (row.correlation_id) event.correlationId = String(row.correlation_id)

  return event
}

export function memoryFromRow(row: Record<string, unknown>): MemoryRecord {
  const memory: MemoryRecord = {
    id: String(row.id),
    memoryType: row.memory_type as MemoryRecord["memoryType"],
    namespace: String(row.namespace),
    scope: (row.scope as Record<string, unknown>) ?? {},
    content: String(row.content),
    sourceEventIds: (row.source_event_ids as string[]) ?? [],
    sourceArtifactIds: (row.source_artifact_ids as string[]) ?? [],
    confidence: Number(row.confidence ?? 0.5),
    sensitivity: row.sensitivity as MemoryRecord["sensitivity"],
    status: row.status as MemoryRecord["status"],
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.structured_content) memory.structuredContent = row.structured_content as Record<string, unknown>
  const validFrom = iso(row.valid_from as Date | string | null)
  const validTo = iso(row.valid_to as Date | string | null)
  if (validFrom) memory.validFrom = validFrom
  if (validTo) memory.validTo = validTo
  if (row.supersedes) memory.supersedes = String(row.supersedes)
  if (row.superseded_by) memory.supersededBy = String(row.superseded_by)

  return memory
}


export function candidateFromRow(row: Record<string, unknown>): MemoryCandidate {
  const candidate: MemoryCandidate = {
    id: String(row.id),
    candidateType: row.candidate_type as MemoryCandidate["candidateType"],
    namespace: String(row.namespace),
    scope: (row.scope as Record<string, unknown>) ?? {},
    content: String(row.content),
    sourceEventIds: (row.source_event_ids as string[]) ?? [],
    sourceArtifactIds: (row.source_artifact_ids as string[]) ?? [],
    confidence: Number(row.confidence ?? 0.5),
    sensitivity: row.sensitivity as MemoryCandidate["sensitivity"],
    status: row.status as MemoryCandidate["status"],
    suggestedActions: (row.suggested_actions as string[]) ?? [],
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.structured_content) candidate.structuredContent = row.structured_content as Record<string, unknown>
  if (row.rationale) candidate.rationale = String(row.rationale)
  if (row.suggested_memory_type) candidate.suggestedMemoryType = row.suggested_memory_type as MemoryCandidate["suggestedMemoryType"]
  if (row.rejection_reason) candidate.rejectionReason = String(row.rejection_reason)
  if (row.promoted_memory_id) candidate.promotedMemoryId = String(row.promoted_memory_id)
  const reviewedAt = iso(row.reviewed_at as Date | string | null)
  if (reviewedAt) candidate.reviewedAt = reviewedAt

  return candidate
}

export function handoffFromRow(row: Record<string, unknown>): HandoffPack {
  const handoff: HandoffPack = {
    id: String(row.id),
    title: String(row.title),
    objective: String(row.objective),
    markdown: String(row.markdown),
    payload: row.payload as HandoffPack["payload"],
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.project_id) handoff.projectId = String(row.project_id)

  return handoff
}


export function contextRetrievalRequestFromRow(row: Record<string, unknown>): ContextRetrievalRequest {
  const request: ContextRetrievalRequest = {
    id: String(row.id),
    task: String(row.task),
    strategy: row.strategy as ContextRetrievalRequest["strategy"],
    include: (row.include as string[]) ?? [],
    maxInputTokens: Number(row.max_input_tokens),
    parameters: (row.parameters as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.project_id) request.projectId = String(row.project_id)
  if (row.query) request.query = String(row.query)

  return request
}

export function contextRetrievalResultFromRow(row: Record<string, unknown>): ContextRetrievalResult {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    memoryId: String(row.memory_id),
    sectionName: String(row.section_name),
    rank: Number(row.rank),
    score: Number(row.score),
    reasons: (row.reasons as string[]) ?? [],
    included: Boolean(row.included),
    estimatedTokens: Number(row.estimated_tokens ?? 0),
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }
}


export function policyDecisionFromRow(row: Record<string, unknown>): PolicyDecision {
  const decision: PolicyDecision = {
    id: String(row.id),
    action: row.action as PolicyDecision["action"],
    decision: row.decision as PolicyDecision["decision"],
    sensitivity: row.sensitivity as PolicyDecision["sensitivity"],
    reasons: (row.reasons as string[]) ?? [],
    obligations: (row.obligations as string[]) ?? [],
    input: (row.input as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.project_id) decision.projectId = String(row.project_id)
  if (row.actor_id) decision.actorId = String(row.actor_id)
  if (row.namespace) decision.namespace = String(row.namespace)
  if (row.target_type) decision.targetType = String(row.target_type)
  if (row.target_id) decision.targetId = String(row.target_id)

  return decision
}

export function memoryEvaluationFromRow(row: Record<string, unknown>): MemoryEvaluation {
  const evaluation: MemoryEvaluation = {
    id: String(row.id),
    evaluationKind: row.evaluation_kind as MemoryEvaluation["evaluationKind"],
    targetType: row.target_type as MemoryEvaluation["targetType"],
    score: Number(row.score),
    passed: Boolean(row.passed),
    findings: (row.findings as MemoryEvaluation["findings"]) ?? [],
    recommendations: (row.recommendations as string[]) ?? [],
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.target_id) evaluation.targetId = String(row.target_id)
  if (row.project_id) evaluation.projectId = String(row.project_id)

  return evaluation
}


export function llmProviderFromRow(row: Record<string, unknown>): LlmProviderConfig {
  const provider: LlmProviderConfig = {
    id: String(row.id),
    providerKind: row.provider_kind as LlmProviderConfig["providerKind"],
    displayName: String(row.display_name),
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 100),
    capabilities: row.capabilities as LlmProviderConfig["capabilities"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }

  if (row.base_url) provider.baseUrl = String(row.base_url)
  if (row.default_model) provider.defaultModel = String(row.default_model)
  if (row.api_key_env) provider.apiKeyEnv = String(row.api_key_env)
  const createdAt = iso(row.created_at as Date | string | null)
  const updatedAt = iso(row.updated_at as Date | string | null)
  if (createdAt) provider.createdAt = createdAt
  if (updatedAt) provider.updatedAt = updatedAt

  return provider
}

export function llmCallAuditFromRow(row: Record<string, unknown>): LlmCallAudit {
  const audit: LlmCallAudit = {
    id: String(row.id),
    requestKind: row.request_kind as LlmCallAudit["requestKind"],
    status: row.status as LlmCallAudit["status"],
    inputSummary: String(row.input_summary ?? ""),
    inputTokens: Number(row.input_tokens ?? 0),
    outputTokens: Number(row.output_tokens ?? 0),
    latencyMs: Number(row.latency_ms ?? 0),
    request: (row.request as Record<string, unknown>) ?? {},
    response: (row.response as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.provider_id) audit.providerId = String(row.provider_id)
  if (row.provider_kind) audit.providerKind = row.provider_kind as LlmCallAudit["providerKind"]
  if (row.model) audit.model = String(row.model)
  if (row.project_id) audit.projectId = String(row.project_id)
  if (row.error) audit.error = String(row.error)

  return audit
}


export function artifactFromRow(row: Record<string, unknown>): ArtifactRecord {
  const artifact: ArtifactRecord = {
    id: String(row.id),
    artifactKind: row.artifact_kind as ArtifactRecord["artifactKind"],
    namespace: String(row.namespace),
    uri: String(row.uri),
    name: String(row.name),
    sensitivity: row.sensitivity as ArtifactRecord["sensitivity"],
    status: row.status as ArtifactRecord["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    sourceEventIds: (row.source_event_ids as string[]) ?? [],
    sourceMemoryIds: (row.source_memory_ids as string[]) ?? [],
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at as Date | string) ?? new Date().toISOString(),
  }

  if (row.project_id) artifact.projectId = String(row.project_id)
  if (row.path) artifact.path = String(row.path)
  if (row.mime_type) artifact.mimeType = String(row.mime_type)
  if (row.size_bytes !== null && row.size_bytes !== undefined) artifact.sizeBytes = Number(row.size_bytes)
  if (row.checksum) artifact.checksum = String(row.checksum)
  if (row.content_preview) artifact.contentPreview = String(row.content_preview)
  if (row.content_text) artifact.contentText = String(row.content_text)
  return artifact
}

export function repoIndexRunFromRow(row: Record<string, unknown>): RepoIndexRun {
  const run: RepoIndexRun = {
    id: String(row.id),
    namespace: String(row.namespace),
    rootPath: String(row.root_path),
    includeGlobs: (row.include_globs as string[]) ?? [],
    excludeGlobs: (row.exclude_globs as string[]) ?? [],
    maxBytesPerFile: Number(row.max_bytes_per_file),
    artifactCount: Number(row.artifact_count ?? 0),
    ignoredCount: Number(row.ignored_count ?? 0),
    status: row.status as RepoIndexRun["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at as Date | string) ?? new Date().toISOString(),
  }
  if (row.project_id) run.projectId = String(row.project_id)
  return run
}
