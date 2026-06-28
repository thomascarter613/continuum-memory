import type {
  ArtifactRecord,
  ArtifactSearchRequest,
  ContextRetrievalRequest,
  ContextRetrievalResult,
  CreateArtifactRecord,
  CreateContextRetrievalRequest,
  CreateContextRetrievalResult,
  CreateLlmCallAudit,
  CreateLlmProviderConfig,
  CreateMemoryCandidate,
  CreateMemoryEvaluation,
  CreateMemoryEvent,
  CreateMemoryRecord,
  CreatePolicyDecision,
  CreateRepoIndexRun,
  HandoffCreateRequest,
  HandoffPack,
  LlmCallAudit,
  LlmProviderConfig,
  MemoryCandidate,
  MemoryCandidatePromotionResult,
  MemoryCandidateSearchRequest,
  MemoryEvaluation,
  MemoryEvent,
  MemoryRecord,
  MemorySearchRequest,
  PolicyDecision,
  PromoteMemoryCandidateRequest,
  RepoIndexRun,
} from "@continuum/domain"

export interface StoreHealth {
  ok: boolean
  kind: "memory" | "postgres"
  details?: Record<string, unknown>
}

export interface ContinuumStore {
  kind: "memory" | "postgres"
  health(): Promise<StoreHealth>
  createEvent(input: CreateMemoryEvent): Promise<MemoryEvent>
  createMemory(input: CreateMemoryRecord): Promise<MemoryRecord>
  getMemory(id: string): Promise<MemoryRecord | null>
  searchMemory(input: MemorySearchRequest): Promise<MemoryRecord[]>
  listActiveMemories(input?: { projectId?: string }): Promise<MemoryRecord[]>
  createContextRetrievalRequest(
    input: CreateContextRetrievalRequest,
  ): Promise<ContextRetrievalRequest>
  createContextRetrievalResult(input: CreateContextRetrievalResult): Promise<ContextRetrievalResult>
  createCandidate(input: CreateMemoryCandidate): Promise<MemoryCandidate>
  getCandidate(id: string): Promise<MemoryCandidate | null>
  searchCandidates(input: MemoryCandidateSearchRequest): Promise<MemoryCandidate[]>
  promoteCandidate(
    id: string,
    input: PromoteMemoryCandidateRequest,
  ): Promise<MemoryCandidatePromotionResult | null>
  rejectCandidate(id: string, reason: string): Promise<MemoryCandidate | null>
  createPolicyDecision(input: CreatePolicyDecision): Promise<PolicyDecision>
  listPolicyDecisions(input?: { projectId?: string; limit?: number }): Promise<PolicyDecision[]>
  createMemoryEvaluation(input: CreateMemoryEvaluation): Promise<MemoryEvaluation>
  listMemoryEvaluations(input?: { projectId?: string; limit?: number }): Promise<MemoryEvaluation[]>
  createHandoff(input: HandoffCreateRequest): Promise<HandoffPack>
  getHandoff(id: string): Promise<HandoffPack | null>
  listHandoffs(input?: { projectId?: string; limit?: number }): Promise<HandoffPack[]>
  upsertLlmProvider(input: CreateLlmProviderConfig): Promise<LlmProviderConfig>
  listLlmProviders(): Promise<LlmProviderConfig[]>
  createLlmCallAudit(input: CreateLlmCallAudit): Promise<LlmCallAudit>
  getLlmCallAudit(id: string): Promise<LlmCallAudit | null>
  listLlmCallAudits(input?: { projectId?: string; limit?: number }): Promise<LlmCallAudit[]>
  createArtifact(input: CreateArtifactRecord): Promise<ArtifactRecord>
  getArtifact(id: string): Promise<ArtifactRecord | null>
  searchArtifacts(input: ArtifactSearchRequest): Promise<ArtifactRecord[]>
  createRepoIndexRun(input: CreateRepoIndexRun): Promise<RepoIndexRun>
  listRepoIndexRuns(input?: { projectId?: string; limit?: number }): Promise<RepoIndexRun[]>
}
