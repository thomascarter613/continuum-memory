import { randomUUID } from "node:crypto"
import {
  type ArtifactRecord,
  type ArtifactSearchRequest,
  type ContextRetrievalRequest,
  type ContextRetrievalResult,
  type CreateArtifactRecord,
  type CreateContextRetrievalRequest,
  type CreateContextRetrievalResult,
  type CreateLlmCallAudit,
  type CreateLlmProviderConfig,
  type CreateMemoryCandidate,
  type CreateMemoryEvaluation,
  type CreateMemoryEvent,
  type CreateMemoryRecord,
  type CreatePolicyDecision,
  type CreateRepoIndexRun,
  type HandoffCreateRequest,
  HandoffCreateRequestSchema,
  type HandoffPack,
  type LlmCallAudit,
  type LlmProviderConfig,
  LlmProviderConfigSchema,
  type MemoryCandidate,
  type MemoryCandidatePromotionResult,
  type MemoryCandidateSearchRequest,
  type MemoryEvaluation,
  type MemoryEvent,
  type MemoryRecord,
  type MemorySearchRequest,
  type PolicyDecision,
  type PromoteMemoryCandidateRequest,
  type RepoIndexRun,
} from "@continuum/domain"
import { renderHandoffMarkdown } from "../lib/handoff-markdown"
import { now } from "../lib/time"
import type { ContinuumStore, StoreHealth } from "./types"

export class InMemoryContinuumStore implements ContinuumStore {
  readonly kind = "memory" as const

  private readonly events = new Map<string, MemoryEvent>()
  private readonly memories = new Map<string, MemoryRecord>()
  private readonly candidates = new Map<string, MemoryCandidate>()
  private readonly handoffs = new Map<string, HandoffPack>()
  private readonly retrievalRequests = new Map<string, ContextRetrievalRequest>()
  private readonly retrievalResults = new Map<string, ContextRetrievalResult>()
  private readonly policyDecisions = new Map<string, PolicyDecision>()
  private readonly evaluations = new Map<string, MemoryEvaluation>()
  private readonly llmProviders = new Map<string, LlmProviderConfig>()
  private readonly llmCallAudits = new Map<string, LlmCallAudit>()
  private readonly artifacts = new Map<string, ArtifactRecord>()
  private readonly repoIndexRuns = new Map<string, RepoIndexRun>()

  async health(): Promise<StoreHealth> {
    return {
      ok: true,
      kind: this.kind,
      details: {
        events: this.events.size,
        memories: this.memories.size,
        candidates: this.candidates.size,
        handoffs: this.handoffs.size,
        retrievalRequests: this.retrievalRequests.size,
        retrievalResults: this.retrievalResults.size,
        policyDecisions: this.policyDecisions.size,
        evaluations: this.evaluations.size,
        llmProviders: this.llmProviders.size,
        llmCallAudits: this.llmCallAudits.size,
        artifacts: this.artifacts.size,
        repoIndexRuns: this.repoIndexRuns.size,
      },
    }
  }

  async createEvent(input: CreateMemoryEvent): Promise<MemoryEvent> {
    const event: MemoryEvent = {
      ...input,
      id: input.id ?? randomUUID(),
      occurredAt: input.occurredAt ?? now(),
      payload: input.payload ?? {},
    }
    this.events.set(event.id, event)
    return event
  }

  async createMemory(input: CreateMemoryRecord): Promise<MemoryRecord> {
    const timestamp = now()
    const memory: MemoryRecord = {
      ...input,
      id: input.id ?? randomUUID(),
      sourceEventIds: input.sourceEventIds ?? [],
      sourceArtifactIds: input.sourceArtifactIds ?? [],
      scope: input.scope ?? {},
      confidence: input.confidence ?? 0.5,
      sensitivity: input.sensitivity ?? "normal",
      status: input.status ?? "active",
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp,
    }

    if (memory.supersedes) {
      const superseded = this.memories.get(memory.supersedes)
      if (superseded && superseded.status !== "forgotten") {
        this.memories.set(superseded.id, {
          ...superseded,
          status: "superseded",
          supersededBy: memory.id,
          updatedAt: timestamp,
        })
      }
    }

    this.memories.set(memory.id, memory)
    return memory
  }

  async getMemory(id: string): Promise<MemoryRecord | null> {
    return this.memories.get(id) ?? null
  }

  async searchMemory(input: MemorySearchRequest): Promise<MemoryRecord[]> {
    const query = input.query?.toLowerCase()
    return [...this.memories.values()]
      .filter((memory) => input.includeSuperseded || memory.status !== "superseded")
      .filter((memory) => !input.namespace || memory.namespace === input.namespace)
      .filter((memory) => !input.memoryTypes || input.memoryTypes.includes(memory.memoryType))
      .filter(
        (memory) =>
          !input.projectId ||
          memory.scope.projectId === input.projectId ||
          memory.namespace.includes(input.projectId),
      )
      .filter((memory) => !query || memory.content.toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, input.limit ?? 20)
  }

  async listActiveMemories(input?: { projectId?: string }): Promise<MemoryRecord[]> {
    return [...this.memories.values()]
      .filter((memory) => memory.status === "active")
      .filter(
        (memory) =>
          !input?.projectId ||
          memory.scope.projectId === input.projectId ||
          memory.namespace.includes(input.projectId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async createContextRetrievalRequest(
    input: CreateContextRetrievalRequest,
  ): Promise<ContextRetrievalRequest> {
    const request: ContextRetrievalRequest = {
      ...input,
      id: input.id ?? randomUUID(),
      include: input.include ?? [],
      parameters: input.parameters ?? {},
      createdAt: input.createdAt ?? now(),
    }
    this.retrievalRequests.set(request.id, request)
    return request
  }

  async createContextRetrievalResult(
    input: CreateContextRetrievalResult,
  ): Promise<ContextRetrievalResult> {
    const result: ContextRetrievalResult = {
      ...input,
      id: input.id ?? randomUUID(),
      reasons: input.reasons ?? [],
      createdAt: input.createdAt ?? now(),
    }
    this.retrievalResults.set(result.id, result)
    return result
  }

  async createCandidate(input: CreateMemoryCandidate): Promise<MemoryCandidate> {
    const timestamp = now()
    const candidate: MemoryCandidate = {
      ...input,
      id: input.id ?? randomUUID(),
      sourceEventIds: input.sourceEventIds ?? [],
      sourceArtifactIds: input.sourceArtifactIds ?? [],
      scope: input.scope ?? {},
      confidence: input.confidence ?? 0.5,
      sensitivity: input.sensitivity ?? "normal",
      status: input.status ?? "proposed",
      suggestedActions: input.suggestedActions ?? [],
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp,
    }
    this.candidates.set(candidate.id, candidate)
    return candidate
  }

  async getCandidate(id: string): Promise<MemoryCandidate | null> {
    return this.candidates.get(id) ?? null
  }

  async searchCandidates(input: MemoryCandidateSearchRequest): Promise<MemoryCandidate[]> {
    const query = input.query?.toLowerCase()
    return [...this.candidates.values()]
      .filter((candidate) => !input.namespace || candidate.namespace === input.namespace)
      .filter(
        (candidate) =>
          !input.candidateTypes || input.candidateTypes.includes(candidate.candidateType),
      )
      .filter((candidate) => !input.statuses || input.statuses.includes(candidate.status))
      .filter(
        (candidate) =>
          !input.projectId ||
          candidate.scope.projectId === input.projectId ||
          candidate.namespace.includes(input.projectId),
      )
      .filter((candidate) => !query || candidate.content.toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, input.limit ?? 20)
  }

  async promoteCandidate(
    id: string,
    input: PromoteMemoryCandidateRequest,
  ): Promise<MemoryCandidatePromotionResult | null> {
    const candidate = this.candidates.get(id)
    if (!candidate) return null

    const memory = await this.createMemory({
      memoryType: input.memoryType ?? candidate.suggestedMemoryType ?? "semantic",
      namespace: input.namespace ?? candidate.namespace,
      scope: candidate.scope,
      content: input.content ?? candidate.content,
      structuredContent: input.structuredContent ?? candidate.structuredContent,
      sourceEventIds: candidate.sourceEventIds,
      sourceArtifactIds: candidate.sourceArtifactIds,
      confidence: input.confidence ?? candidate.confidence,
      sensitivity: input.sensitivity ?? candidate.sensitivity,
      status: input.status ?? "active",
      supersedes: input.supersedes,
    })

    const updated: MemoryCandidate = {
      ...candidate,
      status: "promoted",
      promotedMemoryId: memory.id,
      reviewedAt: now(),
      updatedAt: now(),
    }
    this.candidates.set(updated.id, updated)
    return { candidate: updated, memory }
  }

  async rejectCandidate(id: string, reason: string): Promise<MemoryCandidate | null> {
    const candidate = this.candidates.get(id)
    if (!candidate) return null
    const updated: MemoryCandidate = {
      ...candidate,
      status: "rejected",
      rejectionReason: reason,
      reviewedAt: now(),
      updatedAt: now(),
    }
    this.candidates.set(updated.id, updated)
    return updated
  }

  async createPolicyDecision(input: CreatePolicyDecision): Promise<PolicyDecision> {
    const decision: PolicyDecision = {
      id: input.id ?? randomUUID(),
      action: input.action,
      decision: input.decision,
      sensitivity: input.sensitivity ?? "normal",
      reasons: input.reasons ?? [],
      obligations: input.obligations ?? [],
      input: input.input ?? {},
      createdAt: input.createdAt ?? now(),
    }

    if (input.projectId) decision.projectId = input.projectId
    if (input.actorId) decision.actorId = input.actorId
    if (input.namespace) decision.namespace = input.namespace
    if (input.targetType) decision.targetType = input.targetType
    if (input.targetId) decision.targetId = input.targetId
    this.policyDecisions.set(decision.id, decision)
    return decision
  }

  async listPolicyDecisions(input?: {
    projectId?: string
    limit?: number
  }): Promise<PolicyDecision[]> {
    return [...this.policyDecisions.values()]
      .filter((decision) => !input?.projectId || decision.projectId === input.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, input?.limit ?? 50)
  }

  async createMemoryEvaluation(input: CreateMemoryEvaluation): Promise<MemoryEvaluation> {
    const evaluation: MemoryEvaluation = {
      id: input.id ?? randomUUID(),
      evaluationKind: input.evaluationKind,
      targetType: input.targetType,
      score: input.score,
      passed: input.passed,
      findings: input.findings ?? [],
      recommendations: input.recommendations ?? [],
      metrics: input.metrics ?? {},
      createdAt: input.createdAt ?? now(),
    }

    if (input.targetId) evaluation.targetId = input.targetId
    if (input.projectId) evaluation.projectId = input.projectId
    this.evaluations.set(evaluation.id, evaluation)
    return evaluation
  }

  async listMemoryEvaluations(input?: {
    projectId?: string
    limit?: number
  }): Promise<MemoryEvaluation[]> {
    return [...this.evaluations.values()]
      .filter((evaluation) => !input?.projectId || evaluation.projectId === input.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, input?.limit ?? 50)
  }

  async createHandoff(input: HandoffCreateRequest): Promise<HandoffPack> {
    const parsed = HandoffCreateRequestSchema.parse(input)
    const pack: HandoffPack = {
      id: randomUUID(),
      ...(parsed.projectId ? { projectId: parsed.projectId } : {}),
      title: parsed.title,
      objective: parsed.objective,
      markdown: renderHandoffMarkdown(parsed),
      payload: parsed,
      createdAt: now(),
    }
    this.handoffs.set(pack.id, pack)
    return pack
  }

  async getHandoff(id: string): Promise<HandoffPack | null> {
    return this.handoffs.get(id) ?? null
  }

  async listHandoffs(input?: { projectId?: string; limit?: number }): Promise<HandoffPack[]> {
    return [...this.handoffs.values()]
      .filter((handoff) => !input?.projectId || handoff.projectId === input.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, input?.limit ?? 25)
  }

  async upsertLlmProvider(input: CreateLlmProviderConfig): Promise<LlmProviderConfig> {
    const parsed = LlmProviderConfigSchema.parse(input)
    const timestamp = now()
    const existing = this.llmProviders.get(parsed.id)
    const provider: LlmProviderConfig = {
      id: parsed.id,
      providerKind: parsed.providerKind,
      displayName: parsed.displayName,
      enabled: parsed.enabled,
      priority: parsed.priority,
      capabilities: parsed.capabilities,
      metadata: parsed.metadata,
      createdAt: existing?.createdAt ?? parsed.createdAt ?? timestamp,
      updatedAt: parsed.updatedAt ?? timestamp,
    }
    if (parsed.baseUrl) provider.baseUrl = parsed.baseUrl
    if (parsed.defaultModel) provider.defaultModel = parsed.defaultModel
    if (parsed.apiKeyEnv) provider.apiKeyEnv = parsed.apiKeyEnv
    this.llmProviders.set(provider.id, provider)
    return provider
  }

  async listLlmProviders(): Promise<LlmProviderConfig[]> {
    return [...this.llmProviders.values()].sort(
      (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
    )
  }

  async createLlmCallAudit(input: CreateLlmCallAudit): Promise<LlmCallAudit> {
    const audit: LlmCallAudit = {
      id: input.id ?? randomUUID(),
      requestKind: input.requestKind,
      status: input.status,
      inputSummary: input.inputSummary ?? "",
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      latencyMs: input.latencyMs ?? 0,
      request: input.request ?? {},
      response: input.response ?? {},
      createdAt: input.createdAt ?? now(),
    }
    if (input.providerId) audit.providerId = input.providerId
    if (input.providerKind) audit.providerKind = input.providerKind
    if (input.model) audit.model = input.model
    if (input.projectId) audit.projectId = input.projectId
    if (input.error) audit.error = input.error
    this.llmCallAudits.set(audit.id, audit)
    return audit
  }

  async getLlmCallAudit(id: string): Promise<LlmCallAudit | null> {
    return this.llmCallAudits.get(id) ?? null
  }

  async listLlmCallAudits(input?: { projectId?: string; limit?: number }): Promise<LlmCallAudit[]> {
    return [...this.llmCallAudits.values()]
      .filter((audit) => !input?.projectId || audit.projectId === input.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, input?.limit ?? 50)
  }

  async createArtifact(input: CreateArtifactRecord): Promise<ArtifactRecord> {
    const timestamp = now()
    const artifact: ArtifactRecord = {
      ...input,
      id: input.id ?? randomUUID(),
      metadata: input.metadata ?? {},
      sourceEventIds: input.sourceEventIds ?? [],
      sourceMemoryIds: input.sourceMemoryIds ?? [],
      sensitivity: input.sensitivity ?? "normal",
      status: input.status ?? "active",
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp,
    }
    this.artifacts.set(artifact.id, artifact)
    return artifact
  }

  async getArtifact(id: string): Promise<ArtifactRecord | null> {
    return this.artifacts.get(id) ?? null
  }

  async searchArtifacts(input: ArtifactSearchRequest): Promise<ArtifactRecord[]> {
    const query = input.query?.toLowerCase()
    return [...this.artifacts.values()]
      .filter((artifact) => !input.namespace || artifact.namespace === input.namespace)
      .filter(
        (artifact) =>
          !input.projectId ||
          artifact.projectId === input.projectId ||
          artifact.namespace.includes(input.projectId),
      )
      .filter(
        (artifact) => !input.artifactKinds || input.artifactKinds.includes(artifact.artifactKind),
      )
      .filter((artifact) => !input.statuses || input.statuses.includes(artifact.status))
      .filter((artifact) => !input.pathPrefix || artifact.path?.startsWith(input.pathPrefix))
      .filter(
        (artifact) =>
          !query ||
          [
            artifact.name,
            artifact.path,
            artifact.uri,
            artifact.contentPreview,
            artifact.contentText,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
      )
      .map((artifact) =>
        input.includeContent ? artifact : { ...artifact, contentText: undefined },
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, input.limit ?? 50)
  }

  async createRepoIndexRun(input: CreateRepoIndexRun): Promise<RepoIndexRun> {
    const run: RepoIndexRun = {
      id: input.id ?? randomUUID(),
      namespace: input.namespace,
      rootPath: input.rootPath,
      includeGlobs: input.includeGlobs ?? [],
      excludeGlobs: input.excludeGlobs ?? [],
      maxBytesPerFile: input.maxBytesPerFile,
      artifactCount: input.artifactCount,
      ignoredCount: input.ignoredCount,
      status: input.status,
      metadata: input.metadata ?? {},
      createdAt: input.createdAt ?? now(),
    }
    if (input.projectId) run.projectId = input.projectId
    this.repoIndexRuns.set(run.id, run)
    return run
  }

  async listRepoIndexRuns(input?: { projectId?: string; limit?: number }): Promise<RepoIndexRun[]> {
    return [...this.repoIndexRuns.values()]
      .filter((run) => !input?.projectId || run.projectId === input.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, input?.limit ?? 25)
  }
}
