import {
  ArtifactSearchRequestSchema,
  ContextBuildRequestSchema,
  CreateArtifactRecordSchema,
  CreateLlmProviderConfigSchema,
  CreateMemoryCandidateSchema,
  CreateMemoryEventSchema,
  CreateMemoryRecordSchema,
  ExtractMemoryCandidatesRequestSchema,
  HandoffCompileRequestSchema,
  HandoffCompletenessEvaluationRequestSchema,
  HandoffCreateRequestSchema,
  LlmChatRequestSchema,
  type LlmChatResponse,
  LlmEmbeddingRequestSchema,
  type LlmEmbeddingResponse,
  LlmRouteRequestSchema,
  type MemoryCandidate,
  MemoryCandidateSearchRequestSchema,
  MemoryQualityEvaluationRequestSchema,
  type MemoryRecord,
  MemorySearchRequestSchema,
  PolicyCheckRequestSchema,
  PromoteMemoryCandidateRequestSchema,
  PromptCompileRequestSchema,
  RejectMemoryCandidateRequestSchema,
  RepoIndexRequestSchema,
} from "@continuum/domain"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { ZodError } from "zod"
import { getConfig } from "./config"
import { indexLocalRepository } from "./lib/artifact-indexer"
import { extractMemoryCandidates } from "./lib/candidate-extraction"
import { buildContextPack } from "./lib/context-builder"
import { validateRuntimeConfig } from "./lib/env-validation"
import { evaluateHandoffCompleteness, evaluateMemoryLike } from "./lib/evaluation-engine"
import { compileHandoff } from "./lib/handoff-compiler"
import {
  chatWithProvider,
  compilePrompt,
  configuredLlmProviders,
  embedWithProvider,
  inputSummaryForChat,
  mergeProviders,
  routeLlmProvider,
} from "./lib/llm-gateway"
import { checkPolicy } from "./lib/policy-engine"
import { runtimeInfo } from "./lib/release-info"
import { type ContinuumStore, createStore } from "./store"

const config = getConfig()
const store = createStore(config)
const app = createApp(store)

export function createApp(activeStore: ContinuumStore) {
  const api = new Hono()

  api.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      allowHeaders: ["content-type"],
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  )

  async function persistPolicyCheck(input: unknown) {
    const parsed = PolicyCheckRequestSchema.parse(input)
    const decision = checkPolicy(parsed)
    return activeStore.createPolicyDecision(decision)
  }

  async function loadLlmProviders() {
    return mergeProviders(configuredLlmProviders(config), await activeStore.listLlmProviders())
  }

  async function auditLlmResponse(
    requestKind: "chat" | "embedding",
    request: Record<string, unknown>,
    response:
      | LlmChatResponse
      | LlmEmbeddingResponse
      | {
          providerId: string
          providerKind: LlmChatResponse["providerKind"]
          model: string
          status: LlmChatResponse["status"]
          usage: LlmChatResponse["usage"]
          latencyMs: number
          error?: string
        },
    inputSummary: string,
    projectId?: string,
  ) {
    return activeStore.createLlmCallAudit({
      requestKind,
      providerId: response.providerId,
      providerKind: response.providerKind,
      model: response.model,
      ...(projectId ? { projectId } : {}),
      status: response.status,
      inputSummary,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latencyMs: response.latencyMs,
      request,
      response: response as unknown as Record<string, unknown>,
      ...(response.error ? { error: response.error } : {}),
    })
  }

  api.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json({ error: "invalid_request", issues: error.issues }, 400)
    }

    console.error(error)
    return c.json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    )
  })

  function adminLimit(value: string | undefined, fallback = 25, max = 250) {
    const parsed = Number(value ?? fallback)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.min(Math.floor(parsed), max)
  }

  function adminProjectId(value: string | undefined) {
    return value && value.trim().length > 0 ? value.trim() : undefined
  }

  api.get("/v1/admin/overview", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const memoryInput = projectId ? { projectId } : undefined
    const [
      health,
      activeMemories,
      proposedCandidates,
      recentArtifacts,
      recentHandoffs,
      recentPolicyDecisions,
      recentEvaluations,
      recentLlmAudits,
      recentRepoIndexRuns,
      providers,
    ] = await Promise.all([
      activeStore.health(),
      activeStore.listActiveMemories(memoryInput),
      activeStore.searchCandidates({
        ...(projectId ? { projectId } : {}),
        statuses: ["proposed"],
        limit: 250,
      }),
      activeStore.searchArtifacts({ ...(projectId ? { projectId } : {}), limit: 10 }),
      activeStore.listHandoffs({ ...(projectId ? { projectId } : {}), limit: 10 }),
      activeStore.listPolicyDecisions({ ...(projectId ? { projectId } : {}), limit: 10 }),
      activeStore.listMemoryEvaluations({ ...(projectId ? { projectId } : {}), limit: 10 }),
      activeStore.listLlmCallAudits({ ...(projectId ? { projectId } : {}), limit: 10 }),
      activeStore.listRepoIndexRuns({ ...(projectId ? { projectId } : {}), limit: 10 }),
      loadLlmProviders(),
    ])

    return c.json({
      projectId,
      health,
      counts: {
        activeMemories: activeMemories.length,
        proposedCandidates: proposedCandidates.length,
        recentArtifacts: recentArtifacts.length,
        recentHandoffs: recentHandoffs.length,
        recentPolicyDecisions: recentPolicyDecisions.length,
        recentEvaluations: recentEvaluations.length,
        recentLlmAudits: recentLlmAudits.length,
        recentRepoIndexRuns: recentRepoIndexRuns.length,
        providers: providers.length,
      },
      recent: {
        memories: activeMemories.slice(0, 10),
        candidates: proposedCandidates.slice(0, 10),
        artifacts: recentArtifacts,
        handoffs: recentHandoffs,
        policyDecisions: recentPolicyDecisions,
        evaluations: recentEvaluations,
        llmAudits: recentLlmAudits,
        repoIndexRuns: recentRepoIndexRuns,
      },
      providers,
    })
  })

  api.get("/v1/admin/handoffs", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const limit = adminLimit(c.req.query("limit"), 25)
    const results = await activeStore.listHandoffs({ ...(projectId ? { projectId } : {}), limit })
    return c.json({ results })
  })

  api.get("/v1/admin/policy-decisions", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const limit = adminLimit(c.req.query("limit"), 50)
    const results = await activeStore.listPolicyDecisions({
      ...(projectId ? { projectId } : {}),
      limit,
    })
    return c.json({ results })
  })

  api.get("/v1/admin/evaluations", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const limit = adminLimit(c.req.query("limit"), 50)
    const results = await activeStore.listMemoryEvaluations({
      ...(projectId ? { projectId } : {}),
      limit,
    })
    return c.json({ results })
  })

  api.get("/v1/admin/llm-audits", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const limit = adminLimit(c.req.query("limit"), 50)
    const results = await activeStore.listLlmCallAudits({
      ...(projectId ? { projectId } : {}),
      limit,
    })
    return c.json({ results })
  })

  api.get("/v1/admin/repo-index-runs", async (c) => {
    const projectId = adminProjectId(c.req.query("projectId"))
    const limit = adminLimit(c.req.query("limit"), 25)
    const results = await activeStore.listRepoIndexRuns({
      ...(projectId ? { projectId } : {}),
      limit,
    })
    return c.json({ results })
  })

  api.get("/livez", (c) => {
    return c.json({ ok: true, service: "continuum-memory-api", ...runtimeInfo() })
  })

  api.get("/version", (c) => {
    return c.json(runtimeInfo())
  })

  api.get("/readyz", async (c) => {
    const configValidation = validateRuntimeConfig(config)
    try {
      const health = await activeStore.health()
      const ready = configValidation.ok && health.ok
      return c.json(
        {
          ok: ready,
          service: "continuum-memory-api",
          config: configValidation,
          store: health,
          ...runtimeInfo(),
        },
        ready ? 200 : 503,
      )
    } catch (error) {
      return c.json(
        {
          ok: false,
          service: "continuum-memory-api",
          config: configValidation,
          store: {
            ok: false,
            kind: activeStore.kind,
            message: error instanceof Error ? error.message : "Store readiness check failed",
          },
          ...runtimeInfo(),
        },
        503,
      )
    }
  })

  api.get("/healthz", async (c) => {
    try {
      const health = await activeStore.health()
      return c.json({ ok: health.ok, service: "continuum-memory-api", store: health })
    } catch (error) {
      return c.json(
        {
          ok: false,
          service: "continuum-memory-api",
          store: {
            ok: false,
            kind: activeStore.kind,
            message: error instanceof Error ? error.message : "Store health check failed",
          },
        },
        503,
      )
    }
  })

  api.get("/v1/llm/providers", async (c) => {
    const providers = await loadLlmProviders()
    return c.json({ providers })
  })

  api.post("/v1/llm/providers", async (c) => {
    const body = await c.req.json()
    const parsed = CreateLlmProviderConfigSchema.parse(body)
    const provider = await activeStore.upsertLlmProvider(parsed)
    return c.json(provider, 201)
  })

  api.post("/v1/llm/route", async (c) => {
    const body = await c.req.json()
    const parsed = LlmRouteRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "llm.route",
      projectId: parsed.projectId,
      targetType: "llm_provider",
      sensitivity: parsed.sensitivity,
      purpose: parsed.task,
      payload: parsed,
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const route = routeLlmProvider(await loadLlmProviders(), parsed)
    const audit = await activeStore.createLlmCallAudit({
      requestKind: "route",
      providerId: route.provider.id,
      providerKind: route.provider.providerKind,
      model: route.model,
      ...(parsed.projectId ? { projectId: parsed.projectId } : {}),
      status: "succeeded",
      inputSummary: parsed.task,
      request: parsed,
      response: route as unknown as Record<string, unknown>,
    })
    return c.json({ ...route, auditId: audit.id })
  })

  api.post("/v1/prompts/compile", async (c) => {
    const body = await c.req.json()
    const parsed = PromptCompileRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "prompt.compile",
      projectId: parsed.projectId,
      targetType: "prompt",
      sensitivity: "normal",
      purpose: parsed.userMessage,
      payload: { userMessage: parsed.userMessage, metadata: parsed.metadata },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const compiled = compilePrompt(parsed)
    const audit = await activeStore.createLlmCallAudit({
      requestKind: "prompt.compile",
      ...(parsed.projectId ? { projectId: parsed.projectId } : {}),
      status: "succeeded",
      inputSummary: parsed.userMessage,
      inputTokens: compiled.estimatedInputTokens,
      request: parsed,
      response: compiled as unknown as Record<string, unknown>,
    })
    return c.json({ ...compiled, auditId: audit.id })
  })

  api.post("/v1/llm/chat", async (c) => {
    const body = await c.req.json()
    const parsed = LlmChatRequestSchema.parse(body)
    const lastMessage = parsed.messages.at(-1)?.content ?? "chat"
    const route = routeLlmProvider(
      await loadLlmProviders(),
      LlmRouteRequestSchema.parse({
        projectId: parsed.projectId,
        task: lastMessage,
        preferredProviderId:
          parsed.providerId ?? parsed.route?.preferredProviderId ?? config.defaultLlmProviderId,
        requiredCapabilities: ["chat"],
        sensitivity: parsed.route?.sensitivity ?? "normal",
        minContextWindow: parsed.route?.minContextWindow,
      }),
    )

    const policyDecision = await persistPolicyCheck({
      action: "llm.call",
      projectId: parsed.projectId,
      targetType: "llm_provider",
      targetId: route.provider.id,
      sensitivity: parsed.route?.sensitivity ?? "normal",
      purpose: lastMessage,
      payload: {
        providerId: route.provider.id,
        model: parsed.model ?? route.model,
        execute: parsed.execute,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    let response: LlmChatResponse
    try {
      response = await chatWithProvider(parsed, route.provider, parsed.model ?? route.model)
    } catch (error) {
      response = {
        id: crypto.randomUUID(),
        providerId: route.provider.id,
        providerKind: route.provider.providerKind,
        model: parsed.model ?? route.model,
        status: "failed",
        message: { role: "assistant", content: "", metadata: {} },
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        latencyMs: 0,
        error: error instanceof Error ? error.message : "Unknown LLM provider failure",
        createdAt: new Date().toISOString(),
      }
    }

    const audit = await auditLlmResponse(
      "chat",
      parsed as unknown as Record<string, unknown>,
      response,
      inputSummaryForChat(parsed),
      parsed.projectId,
    )
    response.auditId = audit.id
    const statusCode = response.status === "failed" ? 502 : 200
    return c.json(response, statusCode)
  })

  api.post("/v1/llm/embeddings", async (c) => {
    const body = await c.req.json()
    const parsed = LlmEmbeddingRequestSchema.parse(body)
    const route = routeLlmProvider(
      await loadLlmProviders(),
      LlmRouteRequestSchema.parse({
        projectId: parsed.projectId,
        task: "create embeddings",
        preferredProviderId: parsed.providerId ?? config.defaultLlmProviderId,
        requiredCapabilities: ["embeddings"],
      }),
    )

    const policyDecision = await persistPolicyCheck({
      action: "llm.embed",
      projectId: parsed.projectId,
      targetType: "llm_provider",
      targetId: route.provider.id,
      sensitivity: "normal",
      purpose: "create embeddings",
      payload: {
        providerId: route.provider.id,
        model: parsed.model ?? route.model,
        count: parsed.input.length,
        execute: parsed.execute,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const response = await embedWithProvider(parsed, route.provider, parsed.model ?? route.model)
    const audit = await auditLlmResponse(
      "embedding",
      parsed as unknown as Record<string, unknown>,
      response,
      parsed.input.join("\n").slice(0, 1200),
      parsed.projectId,
    )
    response.auditId = audit.id
    return c.json(response)
  })

  api.get("/v1/llm/audits/:id", async (c) => {
    const audit = await activeStore.getLlmCallAudit(c.req.param("id"))
    if (!audit) return c.json({ error: "llm_audit_not_found" }, 404)
    return c.json(audit)
  })

  api.post("/v1/artifacts", async (c) => {
    const body = await c.req.json()
    const parsed = CreateArtifactRecordSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "artifact.write",
      projectId: parsed.projectId,
      namespace: parsed.namespace,
      targetType: "artifact",
      targetId: parsed.id,
      sensitivity: parsed.sensitivity ?? "normal",
      purpose: `store artifact ${parsed.name}`,
      payload: { artifactKind: parsed.artifactKind, path: parsed.path, uri: parsed.uri },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const artifact = await activeStore.createArtifact(parsed)
    return c.json(artifact, 201)
  })

  api.get("/v1/artifacts/:id", async (c) => {
    const artifact = await activeStore.getArtifact(c.req.param("id"))
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404)
    return c.json(artifact)
  })

  api.post("/v1/artifacts/search", async (c) => {
    const body = await c.req.json()
    const parsed = ArtifactSearchRequestSchema.parse(body)
    const results = await activeStore.searchArtifacts(parsed)
    return c.json({ results })
  })

  api.post("/v1/artifacts/index-repo", async (c) => {
    const body = await c.req.json()
    const parsed = RepoIndexRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "artifact.index",
      projectId: parsed.projectId,
      namespace: parsed.namespace,
      targetType: "repository",
      sensitivity: parsed.captureContent ? "sensitive" : "normal",
      purpose: `index repository at ${parsed.rootPath}`,
      payload: {
        rootPath: parsed.rootPath,
        maxFiles: parsed.maxFiles,
        maxBytesPerFile: parsed.maxBytesPerFile,
        captureContent: parsed.captureContent,
        dryRun: parsed.dryRun,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const indexed = await indexLocalRepository(parsed)
    const run = await activeStore.createRepoIndexRun({
      projectId: parsed.projectId,
      namespace: parsed.namespace,
      rootPath: indexed.rootPath,
      includeGlobs: parsed.includeGlobs,
      excludeGlobs: parsed.excludeGlobs,
      maxBytesPerFile: parsed.maxBytesPerFile,
      artifactCount: indexed.artifacts.length,
      ignoredCount: indexed.ignoredCount,
      status: "succeeded",
      metadata: { dryRun: parsed.dryRun, captureContent: parsed.captureContent },
    })

    const artifacts = []
    if (parsed.dryRun) {
      for (const artifact of indexed.artifacts) {
        artifacts.push({
          ...artifact,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } else {
      for (const artifact of indexed.artifacts) {
        artifacts.push(await activeStore.createArtifact(artifact))
      }
    }

    return c.json({ run, artifacts, dryRun: parsed.dryRun }, 201)
  })

  api.post("/v1/policy/check", async (c) => {
    const body = await c.req.json()
    const decision = await persistPolicyCheck(body)
    if (decision.decision === "deny") {
      return c.json(decision, 403)
    }
    return c.json(decision)
  })

  api.post("/v1/evals/memory", async (c) => {
    const body = await c.req.json()
    const parsed = MemoryQualityEvaluationRequestSchema.parse(body)
    let target: MemoryRecord | MemoryCandidate | undefined = parsed.memory
    let targetType: "memory" | "candidate" = "memory"

    if (!target && parsed.memoryId) {
      target = (await activeStore.getMemory(parsed.memoryId)) ?? undefined
    }

    if (!target && parsed.candidate) {
      target = parsed.candidate
      targetType = "candidate"
    }

    if (!target && parsed.candidateId) {
      target = (await activeStore.getCandidate(parsed.candidateId)) ?? undefined
      targetType = "candidate"
    }

    if (!target) {
      return c.json({ error: "evaluation_target_not_found" }, 404)
    }

    const evaluation = await activeStore.createMemoryEvaluation(
      evaluateMemoryLike({ target, targetType }),
    )
    return c.json(evaluation, 201)
  })

  api.post("/v1/evals/handoff", async (c) => {
    const body = await c.req.json()
    const parsed = HandoffCompletenessEvaluationRequestSchema.parse(body)
    let handoff = parsed.handoff

    if (!handoff && parsed.handoffId) {
      handoff = (await activeStore.getHandoff(parsed.handoffId)) ?? undefined
    }

    if (!handoff) {
      return c.json({ error: "evaluation_target_not_found" }, 404)
    }

    const evaluation = await activeStore.createMemoryEvaluation(
      evaluateHandoffCompleteness(handoff),
    )
    return c.json(evaluation, 201)
  })

  api.post("/v1/events", async (c) => {
    const body = await c.req.json()
    const parsed = CreateMemoryEventSchema.parse(body)
    const event = await activeStore.createEvent(parsed)
    return c.json(event, 201)
  })

  api.post("/v1/memory", async (c) => {
    const body = await c.req.json()
    const parsed = CreateMemoryRecordSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "memory.write",
      projectId: typeof parsed.scope?.projectId === "string" ? parsed.scope.projectId : undefined,
      namespace: parsed.namespace,
      targetType: "memory",
      targetId: parsed.id,
      memoryType: parsed.memoryType,
      sensitivity: parsed.sensitivity ?? "normal",
      evidenceCount: (parsed.sourceEventIds?.length ?? 0) + (parsed.sourceArtifactIds?.length ?? 0),
      payload: { content: parsed.content, structuredContent: parsed.structuredContent },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const memory = await activeStore.createMemory(parsed)
    await activeStore.createMemoryEvaluation(
      evaluateMemoryLike({ target: memory, targetType: "memory" }),
    )
    return c.json(memory, 201)
  })

  api.get("/v1/memory/:id", async (c) => {
    const memory = await activeStore.getMemory(c.req.param("id"))
    if (!memory) {
      return c.json({ error: "memory_not_found" }, 404)
    }
    return c.json(memory)
  })

  api.post("/v1/memory/search", async (c) => {
    const body = await c.req.json()
    const parsed = MemorySearchRequestSchema.parse(body)
    const results = await activeStore.searchMemory(parsed)
    return c.json({ results })
  })

  api.post("/v1/memory/candidates", async (c) => {
    const body = await c.req.json()
    const parsed = CreateMemoryCandidateSchema.parse(body)
    const candidate = await activeStore.createCandidate(parsed)
    return c.json(candidate, 201)
  })

  api.post("/v1/memory/candidates/extract", async (c) => {
    const body = await c.req.json()
    const parsed = ExtractMemoryCandidatesRequestSchema.parse(body)
    const candidateInputs = extractMemoryCandidates(parsed)
    const candidates: MemoryCandidate[] = []

    for (const candidateInput of candidateInputs) {
      candidates.push(await activeStore.createCandidate(candidateInput))
    }

    return c.json({ candidates }, 201)
  })

  api.post("/v1/memory/candidates/search", async (c) => {
    const body = await c.req.json()
    const parsed = MemoryCandidateSearchRequestSchema.parse(body)
    const results = await activeStore.searchCandidates(parsed)
    return c.json({ results })
  })

  api.get("/v1/memory/candidates/:id", async (c) => {
    const candidate = await activeStore.getCandidate(c.req.param("id"))
    if (!candidate) {
      return c.json({ error: "candidate_not_found" }, 404)
    }
    return c.json(candidate)
  })

  api.post("/v1/memory/candidates/:id/promote", async (c) => {
    const body = await c.req.json()
    const parsed = PromoteMemoryCandidateRequestSchema.parse(body)
    const candidate = await activeStore.getCandidate(c.req.param("id"))
    if (!candidate) {
      return c.json({ error: "candidate_not_found" }, 404)
    }

    const policyDecision = await persistPolicyCheck({
      action: "candidate.promote",
      projectId:
        typeof candidate.scope?.projectId === "string" ? candidate.scope.projectId : undefined,
      namespace: parsed.namespace ?? candidate.namespace,
      targetType: "candidate",
      targetId: candidate.id,
      candidateType: candidate.candidateType,
      memoryType: parsed.memoryType ?? candidate.suggestedMemoryType,
      sensitivity: parsed.sensitivity ?? candidate.sensitivity,
      evidenceCount: candidate.sourceEventIds.length + candidate.sourceArtifactIds.length,
      payload: {
        content: parsed.content ?? candidate.content,
        structuredContent: parsed.structuredContent ?? candidate.structuredContent,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const result = await activeStore.promoteCandidate(c.req.param("id"), parsed)
    if (!result) {
      return c.json({ error: "candidate_not_found" }, 404)
    }
    await activeStore.createMemoryEvaluation(
      evaluateMemoryLike({ target: result.memory, targetType: "memory" }),
    )
    return c.json(result)
  })

  api.post("/v1/memory/candidates/:id/reject", async (c) => {
    const body = await c.req.json()
    const parsed = RejectMemoryCandidateRequestSchema.parse(body)
    const candidate = await activeStore.rejectCandidate(c.req.param("id"), parsed.reason)
    if (!candidate) {
      return c.json({ error: "candidate_not_found" }, 404)
    }
    return c.json(candidate)
  })

  api.post("/v1/context/plan", async (c) => {
    const body = await c.req.json()
    const parsed = ContextBuildRequestSchema.parse(body)
    const { pack } = buildContextPack(parsed, [])
    return c.json(pack.plan)
  })

  api.post("/v1/context/build", async (c) => {
    const body = await c.req.json()
    const parsed = ContextBuildRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "context.retrieve",
      projectId: parsed.projectId,
      targetType: "context_pack",
      sensitivity: parsed.retrieval.allowSensitive ? "sensitive" : "normal",
      allowSensitive: parsed.retrieval.allowSensitive,
      purpose: parsed.task,
      payload: { query: parsed.query, include: parsed.include, retrieval: parsed.retrieval },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const activeMemories = await activeStore.listActiveMemories(
      parsed.projectId ? { projectId: parsed.projectId } : {},
    )
    const { pack, rankings } = buildContextPack(parsed, activeMemories)

    const auditInput = {
      task: parsed.task,
      strategy: parsed.retrieval.strategy,
      include: parsed.include,
      maxInputTokens: parsed.budget.maxInputTokens,
      parameters: {
        model: parsed.model,
        budget: parsed.budget,
        retrieval: parsed.retrieval,
        planId: pack.plan.id,
        candidateMemoryCount: activeMemories.length,
      },
      ...(parsed.projectId ? { projectId: parsed.projectId } : {}),
      ...(parsed.query ? { query: parsed.query } : {}),
    }

    const auditRequest = await activeStore.createContextRetrievalRequest(auditInput)

    for (const ranking of rankings) {
      await activeStore.createContextRetrievalResult({
        requestId: auditRequest.id,
        memoryId: ranking.memoryId,
        sectionName: ranking.sectionName,
        rank: ranking.rank,
        score: ranking.score,
        reasons: ranking.reasons,
        included: true,
        estimatedTokens: ranking.estimatedTokens,
      })
    }

    pack.retrievalAuditId = auditRequest.id
    return c.json(pack)
  })

  api.post("/v1/handoffs/compile", async (c) => {
    const body = await c.req.json()
    const parsed = HandoffCompileRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "handoff.export",
      projectId: parsed.projectId,
      targetType: "handoff",
      sensitivity: parsed.retrieval?.allowSensitive ? "sensitive" : "normal",
      allowSensitive: parsed.retrieval?.allowSensitive ?? false,
      purpose: parsed.objective,
      payload: {
        title: parsed.title,
        objective: parsed.objective,
        include: parsed.include,
        artifactRefs: parsed.artifactRefs,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const contextRequest = ContextBuildRequestSchema.parse({
      projectId: parsed.projectId,
      task: parsed.task ?? parsed.objective,
      query: parsed.query,
      include: parsed.include,
      model: parsed.model,
      budget: parsed.budget,
      retrieval: parsed.retrieval,
    })

    const activeMemories = await activeStore.listActiveMemories(
      contextRequest.projectId ? { projectId: contextRequest.projectId } : {},
    )
    const { pack, rankings } = buildContextPack(contextRequest, activeMemories)

    const auditRequest = await activeStore.createContextRetrievalRequest({
      task: contextRequest.task,
      strategy: contextRequest.retrieval.strategy,
      include: contextRequest.include,
      maxInputTokens: contextRequest.budget.maxInputTokens,
      parameters: {
        model: contextRequest.model,
        budget: contextRequest.budget,
        retrieval: contextRequest.retrieval,
        planId: pack.plan.id,
        candidateMemoryCount: activeMemories.length,
        compileHandoff: true,
      },
      ...(contextRequest.projectId ? { projectId: contextRequest.projectId } : {}),
      ...(contextRequest.query ? { query: contextRequest.query } : {}),
    })

    for (const ranking of rankings) {
      await activeStore.createContextRetrievalResult({
        requestId: auditRequest.id,
        memoryId: ranking.memoryId,
        sectionName: ranking.sectionName,
        rank: ranking.rank,
        score: ranking.score,
        reasons: ranking.reasons,
        included: true,
        estimatedTokens: ranking.estimatedTokens,
      })
    }

    pack.retrievalAuditId = auditRequest.id
    const compiled = compileHandoff(parsed, pack)
    const handoff = await activeStore.createHandoff(compiled.handoffInput)
    await activeStore.createMemoryEvaluation(evaluateHandoffCompleteness(handoff))

    return c.json(
      {
        compileId: compiled.compileId,
        handoff,
        contextPack: pack,
        sourceMemoryIds: compiled.sourceMemoryIds,
        markdown: handoff.markdown,
        json: { ...compiled.json, handoffId: handoff.id },
        createdAt: compiled.createdAt,
      },
      201,
    )
  })
  api.post("/v1/handoffs", async (c) => {
    const body = await c.req.json()
    const parsed = HandoffCreateRequestSchema.parse(body)
    const policyDecision = await persistPolicyCheck({
      action: "handoff.export",
      projectId: parsed.projectId,
      targetType: "handoff",
      sensitivity: "normal",
      purpose: parsed.objective,
      payload: {
        title: parsed.title,
        objective: parsed.objective,
        sourceMemoryIds: parsed.sourceMemoryIds,
      },
    })

    if (policyDecision.decision === "deny") {
      return c.json({ error: "policy_denied", policyDecision }, 403)
    }

    const pack = await activeStore.createHandoff(parsed)
    await activeStore.createMemoryEvaluation(evaluateHandoffCompleteness(pack))
    return c.json(pack, 201)
  })

  api.get("/v1/handoffs/:id", async (c) => {
    const handoff = await activeStore.getHandoff(c.req.param("id"))
    if (!handoff) {
      return c.json({ error: "handoff_not_found" }, 404)
    }
    return c.json(handoff)
  })

  return api
}

export default {
  port: config.apiPort,
  fetch: app.fetch,
}

console.log(
  `continuum-memory-api listening on http://localhost:${config.apiPort} with ${store.kind} store`,
)
