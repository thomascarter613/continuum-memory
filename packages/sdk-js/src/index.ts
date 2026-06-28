import type {
  ArtifactSearchRequest,
  CreateArtifactRecord,
  ContextBuildRequest,
  CreateLlmProviderConfig,
  HandoffCompletenessEvaluationRequest,
  CreateMemoryCandidate,
  CreateMemoryEvent,
  CreateMemoryRecord,
  ExtractMemoryCandidatesRequest,
  HandoffCompileRequest,
  HandoffCreateRequest,
  LlmChatRequest,
  LlmEmbeddingRequest,
  LlmRouteRequest,
  MemoryCandidateSearchRequest,
  MemoryQualityEvaluationRequest,
  MemorySearchRequest,
  PolicyCheckRequest,
  PromptCompileRequest,
  PromoteMemoryCandidateRequest,
  RejectMemoryCandidateRequest,
  RepoIndexRequest,
} from "@continuum/domain"

export class ContinuumClient {
  constructor(private readonly baseUrl = "http://localhost:3030") {}

  async health() {
    return this.get("/healthz")
  }

  async adminOverview(input: { projectId?: string } = {}) {
    const query = new URLSearchParams()
    if (input.projectId) query.set("projectId", input.projectId)
    return this.get(`/v1/admin/overview${query.toString() ? `?${query}` : ""}`)
  }

  async listAdminHandoffs(input: { projectId?: string; limit?: number } = {}) {
    return this.adminList("/v1/admin/handoffs", input)
  }

  async listPolicyDecisions(input: { projectId?: string; limit?: number } = {}) {
    return this.adminList("/v1/admin/policy-decisions", input)
  }

  async listEvaluations(input: { projectId?: string; limit?: number } = {}) {
    return this.adminList("/v1/admin/evaluations", input)
  }

  async listLlmAudits(input: { projectId?: string; limit?: number } = {}) {
    return this.adminList("/v1/admin/llm-audits", input)
  }

  async listRepoIndexRuns(input: { projectId?: string; limit?: number } = {}) {
    return this.adminList("/v1/admin/repo-index-runs", input)
  }


  async listLlmProviders() {
    return this.get("/v1/llm/providers")
  }

  async upsertLlmProvider(input: CreateLlmProviderConfig) {
    return this.post("/v1/llm/providers", input)
  }

  async routeLlm(input: LlmRouteRequest) {
    return this.post("/v1/llm/route", input)
  }

  async compilePrompt(input: PromptCompileRequest) {
    return this.post("/v1/prompts/compile", input)
  }

  async chat(input: LlmChatRequest) {
    return this.post("/v1/llm/chat", input)
  }

  async embeddings(input: LlmEmbeddingRequest) {
    return this.post("/v1/llm/embeddings", input)
  }

  async getLlmAudit(id: string) {
    return this.get(`/v1/llm/audits/${id}`)
  }



  async createArtifact(input: CreateArtifactRecord) {
    return this.post("/v1/artifacts", input)
  }

  async getArtifact(id: string) {
    return this.get(`/v1/artifacts/${id}`)
  }

  async searchArtifacts(input: ArtifactSearchRequest) {
    return this.post("/v1/artifacts/search", input)
  }

  async indexRepo(input: RepoIndexRequest) {
    return this.post("/v1/artifacts/index-repo", input)
  }

  async checkPolicy(input: PolicyCheckRequest) {
    return this.post("/v1/policy/check", input)
  }

  async evaluateMemory(input: MemoryQualityEvaluationRequest) {
    return this.post("/v1/evals/memory", input)
  }

  async evaluateHandoff(input: HandoffCompletenessEvaluationRequest) {
    return this.post("/v1/evals/handoff", input)
  }

  async createEvent(input: CreateMemoryEvent) {
    return this.post("/v1/events", input)
  }

  async createMemory(input: CreateMemoryRecord) {
    return this.post("/v1/memory", input)
  }

  async getMemory(id: string) {
    return this.get(`/v1/memory/${id}`)
  }

  async searchMemory(input: MemorySearchRequest) {
    return this.post("/v1/memory/search", input)
  }

  async createCandidate(input: CreateMemoryCandidate) {
    return this.post("/v1/memory/candidates", input)
  }

  async extractCandidates(input: ExtractMemoryCandidatesRequest) {
    return this.post("/v1/memory/candidates/extract", input)
  }

  async searchCandidates(input: MemoryCandidateSearchRequest) {
    return this.post("/v1/memory/candidates/search", input)
  }

  async getCandidate(id: string) {
    return this.get(`/v1/memory/candidates/${id}`)
  }

  async promoteCandidate(id: string, input: PromoteMemoryCandidateRequest) {
    return this.post(`/v1/memory/candidates/${id}/promote`, input)
  }

  async rejectCandidate(id: string, input: RejectMemoryCandidateRequest) {
    return this.post(`/v1/memory/candidates/${id}/reject`, input)
  }

  async planContext(input: ContextBuildRequest) {
    return this.post("/v1/context/plan", input)
  }

  async buildContext(input: ContextBuildRequest) {
    return this.post("/v1/context/build", input)
  }

  async createHandoff(input: HandoffCreateRequest) {
    return this.post("/v1/handoffs", input)
  }

  async compileHandoff(input: HandoffCompileRequest) {
    return this.post("/v1/handoffs/compile", input)
  }

  async getHandoff(id: string) {
    return this.get(`/v1/handoffs/${id}`)
  }

  private adminList(path: string, input: { projectId?: string; limit?: number }) {
    const query = new URLSearchParams()
    if (input.projectId) query.set("projectId", input.projectId)
    if (input.limit) query.set("limit", String(input.limit))
    return this.get(`${path}${query.toString() ? `?${query}` : ""}`)
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`)
    if (!response.ok) throw new Error(`Continuum GET ${path} failed: ${response.status}`)
    return response.json()
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Continuum POST ${path} failed: ${response.status} ${text}`)
    }
    return response.json()
  }
}
