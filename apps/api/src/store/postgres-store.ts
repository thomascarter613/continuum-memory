import { randomUUID } from "node:crypto"
import {
  HandoffCreateRequestSchema,
  LlmProviderConfigSchema,
  type ArtifactRecord,
  type ArtifactSearchRequest,
  type ContextRetrievalRequest,
  type CreateArtifactRecord,
  type ContextRetrievalResult,
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
  type HandoffPack,
  type LlmCallAudit,
  type LlmProviderConfig,
  type MemoryCandidate,
  type MemoryCandidatePromotionResult,
  type MemoryEvaluation,
  type MemoryCandidateSearchRequest,
  type MemoryEvent,
  type MemoryRecord,
  type MemorySearchRequest,
  type PolicyDecision,
  type RepoIndexRun,
  type PromoteMemoryCandidateRequest,
} from "@continuum/domain"
import type { PgPool } from "../db/pool"
import { renderHandoffMarkdown } from "../lib/handoff-markdown"
import { now } from "../lib/time"
import {
  artifactFromRow,
  candidateFromRow,
  contextRetrievalRequestFromRow,
  contextRetrievalResultFromRow,
  eventFromRow,
  handoffFromRow,
  llmCallAuditFromRow,
  llmProviderFromRow,
  memoryEvaluationFromRow,
  memoryFromRow,
  policyDecisionFromRow,
  repoIndexRunFromRow,
} from "./postgres-mappers"
import type { ContinuumStore, StoreHealth } from "./types"

export class PostgresContinuumStore implements ContinuumStore {
  readonly kind = "postgres" as const

  constructor(private readonly pool: PgPool) {}

  async health(): Promise<StoreHealth> {
    const result = await this.pool.query<{
      events: string
      memories: string
      candidates: string
      handoffs: string
      retrieval_requests: string
      retrieval_results: string
      policy_decisions: string
      evaluations: string
      llm_provider_configs: string
      llm_call_audits: string
      artifacts: string
      repo_index_runs: string
    }>(`select
        (select count(*) from memory_events)::text as events,
        (select count(*) from memory_records)::text as memories,
        (select count(*) from memory_candidates)::text as candidates,
        (select count(*) from handoff_packs)::text as handoffs,
        (select count(*) from context_retrieval_requests)::text as retrieval_requests,
        (select count(*) from context_retrieval_results)::text as retrieval_results,
        (select count(*) from policy_decisions)::text as policy_decisions,
        (select count(*) from memory_evaluations)::text as evaluations,
        (select count(*) from llm_provider_configs)::text as llm_provider_configs,
        (select count(*) from llm_call_audits)::text as llm_call_audits,
        (select count(*) from artifact_records)::text as artifacts,
        (select count(*) from repo_index_runs)::text as repo_index_runs`)

    return {
      ok: true,
      kind: this.kind,
      details: {
        events: Number(result.rows[0]?.events ?? 0),
        memories: Number(result.rows[0]?.memories ?? 0),
        candidates: Number(result.rows[0]?.candidates ?? 0),
        handoffs: Number(result.rows[0]?.handoffs ?? 0),
        retrievalRequests: Number(result.rows[0]?.retrieval_requests ?? 0),
        retrievalResults: Number(result.rows[0]?.retrieval_results ?? 0),
        policyDecisions: Number(result.rows[0]?.policy_decisions ?? 0),
        evaluations: Number(result.rows[0]?.evaluations ?? 0),
        llmProviders: Number(result.rows[0]?.llm_provider_configs ?? 0),
        llmCallAudits: Number(result.rows[0]?.llm_call_audits ?? 0),
        artifacts: Number(result.rows[0]?.artifacts ?? 0),
        repoIndexRuns: Number(result.rows[0]?.repo_index_runs ?? 0),
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

    const result = await this.pool.query(
      `insert into memory_events (
        id, event_type, actor_type, actor_id, subject_type, subject_id,
        project_id, conversation_id, session_id, run_id, payload,
        occurred_at, causation_id, correlation_id
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11::jsonb,
        $12::timestamptz, $13, $14
      ) returning *`,
      [
        event.id,
        event.eventType,
        event.actorType,
        event.actorId ?? null,
        event.subjectType ?? null,
        event.subjectId ?? null,
        event.projectId ?? null,
        event.conversationId ?? null,
        event.sessionId ?? null,
        event.runId ?? null,
        JSON.stringify(event.payload ?? {}),
        event.occurredAt,
        event.causationId ?? null,
        event.correlationId ?? null,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert memory event")
    return eventFromRow(row)
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

    const client = await this.pool.connect()
    try {
      await client.query("begin")
      const result = await client.query(
        `insert into memory_records (
          id, memory_type, namespace, scope, content, structured_content,
          source_event_ids, source_artifact_ids, confidence, sensitivity, status,
          valid_from, valid_to, supersedes, superseded_by, created_at, updated_at
        ) values (
          $1, $2, $3, $4::jsonb, $5, $6::jsonb,
          $7::uuid[], $8::uuid[], $9, $10, $11,
          $12::timestamptz, $13::timestamptz, $14, $15, $16::timestamptz, $17::timestamptz
        ) returning *`,
        [
          memory.id,
          memory.memoryType,
          memory.namespace,
          JSON.stringify(memory.scope),
          memory.content,
          memory.structuredContent ? JSON.stringify(memory.structuredContent) : null,
          memory.sourceEventIds,
          memory.sourceArtifactIds,
          memory.confidence,
          memory.sensitivity,
          memory.status,
          memory.validFrom ?? null,
          memory.validTo ?? null,
          memory.supersedes ?? null,
          memory.supersededBy ?? null,
          memory.createdAt,
          memory.updatedAt,
        ],
      )

      if (memory.supersedes) {
        await client.query(
          `update memory_records
           set status = 'superseded', superseded_by = $1, updated_at = now()
           where id = $2 and status <> 'forgotten'`,
          [memory.id, memory.supersedes],
        )
      }

      await client.query("commit")
      const row = result.rows[0]
      if (!row) throw new Error("Failed to insert memory record")
      return memoryFromRow(row)
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  }

  async getMemory(id: string): Promise<MemoryRecord | null> {
    const result = await this.pool.query(`select * from memory_records where id = $1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return memoryFromRow(row)
  }

  async searchMemory(input: MemorySearchRequest): Promise<MemoryRecord[]> {
    const where: string[] = []
    const params: unknown[] = []

    if (!input.includeSuperseded) {
      params.push("superseded")
      where.push(`status <> $${params.length}`)
    }

    if (input.namespace) {
      params.push(input.namespace)
      where.push(`namespace = $${params.length}`)
    }

    if (input.memoryTypes?.length) {
      params.push(input.memoryTypes)
      where.push(`memory_type = any($${params.length}::text[])`)
    }

    if (input.projectId) {
      params.push(JSON.stringify({ projectId: input.projectId }))
      const scopeParam = params.length
      params.push(`%${input.projectId}%`)
      const namespaceParam = params.length
      where.push(`(scope @> $${scopeParam}::jsonb or namespace ilike $${namespaceParam})`)
    }

    if (input.query) {
      params.push(`%${input.query}%`)
      where.push(`content ilike $${params.length}`)
    }

    params.push(input.limit ?? 20)
    const limitParam = params.length
    const sql = `select * from memory_records
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by updated_at desc
      limit $${limitParam}`

    const result = await this.pool.query(sql, params)
    return result.rows.map(memoryFromRow)
  }

  async listActiveMemories(input?: { projectId?: string }): Promise<MemoryRecord[]> {
    const params: unknown[] = ["active"]
    const where = [`status = $1`]

    if (input?.projectId) {
      params.push(JSON.stringify({ projectId: input.projectId }))
      const scopeParam = params.length
      params.push(`%${input.projectId}%`)
      const namespaceParam = params.length
      where.push(`(scope @> $${scopeParam}::jsonb or namespace ilike $${namespaceParam})`)
    }

    const result = await this.pool.query(
      `select * from memory_records where ${where.join(" and ")} order by updated_at desc`,
      params,
    )
    return result.rows.map(memoryFromRow)
  }


  async createContextRetrievalRequest(input: CreateContextRetrievalRequest): Promise<ContextRetrievalRequest> {
    const request: ContextRetrievalRequest = {
      ...input,
      id: input.id ?? randomUUID(),
      include: input.include ?? [],
      parameters: input.parameters ?? {},
      createdAt: input.createdAt ?? now(),
    }

    const result = await this.pool.query(
      `insert into context_retrieval_requests (
        id, project_id, task, query, strategy, include, max_input_tokens, parameters, created_at
      ) values (
        $1, $2, $3, $4, $5, $6::text[], $7, $8::jsonb, $9::timestamptz
      ) returning *`,
      [
        request.id,
        request.projectId ?? null,
        request.task,
        request.query ?? null,
        request.strategy,
        request.include,
        request.maxInputTokens,
        JSON.stringify(request.parameters ?? {}),
        request.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert context retrieval request")
    return contextRetrievalRequestFromRow(row)
  }

  async createContextRetrievalResult(input: CreateContextRetrievalResult): Promise<ContextRetrievalResult> {
    const resultRecord: ContextRetrievalResult = {
      ...input,
      id: input.id ?? randomUUID(),
      reasons: input.reasons ?? [],
      createdAt: input.createdAt ?? now(),
    }

    const result = await this.pool.query(
      `insert into context_retrieval_results (
        id, request_id, memory_id, section_name, rank, score, reasons, included, estimated_tokens, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10::timestamptz
      ) returning *`,
      [
        resultRecord.id,
        resultRecord.requestId,
        resultRecord.memoryId,
        resultRecord.sectionName,
        resultRecord.rank,
        resultRecord.score,
        resultRecord.reasons,
        resultRecord.included,
        resultRecord.estimatedTokens,
        resultRecord.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert context retrieval result")
    return contextRetrievalResultFromRow(row)
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

    const result = await this.pool.query(
      `insert into memory_candidates (
        id, candidate_type, namespace, scope, content, structured_content,
        source_event_ids, source_artifact_ids, confidence, sensitivity, status,
        rationale, suggested_memory_type, suggested_actions, created_at, updated_at
      ) values (
        $1, $2, $3, $4::jsonb, $5, $6::jsonb,
        $7::uuid[], $8::uuid[], $9, $10, $11,
        $12, $13, $14::text[], $15::timestamptz, $16::timestamptz
      ) returning *`,
      [
        candidate.id,
        candidate.candidateType,
        candidate.namespace,
        JSON.stringify(candidate.scope),
        candidate.content,
        candidate.structuredContent ? JSON.stringify(candidate.structuredContent) : null,
        candidate.sourceEventIds,
        candidate.sourceArtifactIds,
        candidate.confidence,
        candidate.sensitivity,
        candidate.status,
        candidate.rationale ?? null,
        candidate.suggestedMemoryType ?? null,
        candidate.suggestedActions,
        candidate.createdAt,
        candidate.updatedAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert memory candidate")
    return candidateFromRow(row)
  }

  async getCandidate(id: string): Promise<MemoryCandidate | null> {
    const result = await this.pool.query(`select * from memory_candidates where id = $1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return candidateFromRow(row)
  }

  async searchCandidates(input: MemoryCandidateSearchRequest): Promise<MemoryCandidate[]> {
    const where: string[] = []
    const params: unknown[] = []

    if (input.namespace) {
      params.push(input.namespace)
      where.push(`namespace = $${params.length}`)
    }

    if (input.candidateTypes?.length) {
      params.push(input.candidateTypes)
      where.push(`candidate_type = any($${params.length}::text[])`)
    }

    if (input.statuses?.length) {
      params.push(input.statuses)
      where.push(`status = any($${params.length}::text[])`)
    }

    if (input.projectId) {
      params.push(JSON.stringify({ projectId: input.projectId }))
      const scopeParam = params.length
      params.push(`%${input.projectId}%`)
      const namespaceParam = params.length
      where.push(`(scope @> $${scopeParam}::jsonb or namespace ilike $${namespaceParam})`)
    }

    if (input.query) {
      params.push(`%${input.query}%`)
      where.push(`content ilike $${params.length}`)
    }

    params.push(input.limit ?? 20)
    const limitParam = params.length
    const sql = `select * from memory_candidates
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by updated_at desc
      limit $${limitParam}`

    const result = await this.pool.query(sql, params)
    return result.rows.map(candidateFromRow)
  }

  async promoteCandidate(
    id: string,
    input: PromoteMemoryCandidateRequest,
  ): Promise<MemoryCandidatePromotionResult | null> {
    const client = await this.pool.connect()
    try {
      await client.query("begin")
      const candidateResult = await client.query(`select * from memory_candidates where id = $1 for update`, [id])
      const candidateRow = candidateResult.rows[0]
      if (!candidateRow) {
        await client.query("rollback")
        return null
      }

      const candidate = candidateFromRow(candidateRow)
      const timestamp = now()
      const memory: MemoryRecord = {
        id: randomUUID(),
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
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      const memoryResult = await client.query(
        `insert into memory_records (
          id, memory_type, namespace, scope, content, structured_content,
          source_event_ids, source_artifact_ids, confidence, sensitivity, status,
          supersedes, created_at, updated_at
        ) values (
          $1, $2, $3, $4::jsonb, $5, $6::jsonb,
          $7::uuid[], $8::uuid[], $9, $10, $11,
          $12, $13::timestamptz, $14::timestamptz
        ) returning *`,
        [
          memory.id,
          memory.memoryType,
          memory.namespace,
          JSON.stringify(memory.scope),
          memory.content,
          memory.structuredContent ? JSON.stringify(memory.structuredContent) : null,
          memory.sourceEventIds,
          memory.sourceArtifactIds,
          memory.confidence,
          memory.sensitivity,
          memory.status,
          memory.supersedes ?? null,
          memory.createdAt,
          memory.updatedAt,
        ],
      )

      if (memory.supersedes) {
        await client.query(
          `update memory_records
           set status = 'superseded', superseded_by = $1, updated_at = now()
           where id = $2 and status <> 'forgotten'`,
          [memory.id, memory.supersedes],
        )
      }

      const updatedCandidateResult = await client.query(
        `update memory_candidates
         set status = 'promoted', promoted_memory_id = $1, reviewed_at = now(), updated_at = now()
         where id = $2
         returning *`,
        [memory.id, id],
      )

      await client.query("commit")
      const memoryRow = memoryResult.rows[0]
      const updatedCandidateRow = updatedCandidateResult.rows[0]
      if (!memoryRow || !updatedCandidateRow) throw new Error("Failed to promote memory candidate")
      return {
        candidate: candidateFromRow(updatedCandidateRow),
        memory: memoryFromRow(memoryRow),
      }
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  }

  async rejectCandidate(id: string, reason: string): Promise<MemoryCandidate | null> {
    const result = await this.pool.query(
      `update memory_candidates
       set status = 'rejected', rejection_reason = $1, reviewed_at = now(), updated_at = now()
       where id = $2
       returning *`,
      [reason, id],
    )
    const row = result.rows[0]
    if (!row) return null
    return candidateFromRow(row)
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

    const result = await this.pool.query(
      `insert into policy_decisions (
        id, action, decision, project_id, actor_id, namespace, target_type, target_id,
        sensitivity, reasons, obligations, input, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10::text[], $11::text[], $12::jsonb, $13::timestamptz
      ) returning *`,
      [
        decision.id,
        decision.action,
        decision.decision,
        decision.projectId ?? null,
        decision.actorId ?? null,
        decision.namespace ?? null,
        decision.targetType ?? null,
        decision.targetId ?? null,
        decision.sensitivity,
        decision.reasons,
        decision.obligations,
        JSON.stringify(decision.input ?? {}),
        decision.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert policy decision")
    return policyDecisionFromRow(row)
  }

  async listPolicyDecisions(input?: { projectId?: string; limit?: number }): Promise<PolicyDecision[]> {
    const params: unknown[] = []
    const where: string[] = []
    if (input?.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    params.push(input?.limit ?? 50)
    const result = await this.pool.query(
      `select * from policy_decisions
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit $${params.length}`,
      params,
    )
    return result.rows.map(policyDecisionFromRow)
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

    const result = await this.pool.query(
      `insert into memory_evaluations (
        id, evaluation_kind, target_type, target_id, project_id, score, passed,
        findings, recommendations, metrics, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8::jsonb, $9::text[], $10::jsonb, $11::timestamptz
      ) returning *`,
      [
        evaluation.id,
        evaluation.evaluationKind,
        evaluation.targetType,
        evaluation.targetId ?? null,
        evaluation.projectId ?? null,
        evaluation.score,
        evaluation.passed,
        JSON.stringify(evaluation.findings ?? []),
        evaluation.recommendations ?? [],
        JSON.stringify(evaluation.metrics ?? {}),
        evaluation.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert memory evaluation")
    return memoryEvaluationFromRow(row)
  }

  async listMemoryEvaluations(input?: { projectId?: string; limit?: number }): Promise<MemoryEvaluation[]> {
    const params: unknown[] = []
    const where: string[] = []
    if (input?.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    params.push(input?.limit ?? 50)
    const result = await this.pool.query(
      `select * from memory_evaluations
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit $${params.length}`,
      params,
    )
    return result.rows.map(memoryEvaluationFromRow)
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

    const result = await this.pool.query(
      `insert into handoff_packs (id, project_id, title, objective, markdown, payload, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
       returning *`,
      [
        pack.id,
        pack.projectId ?? null,
        pack.title,
        pack.objective,
        pack.markdown,
        JSON.stringify(pack.payload),
        pack.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert handoff pack")
    return handoffFromRow(row)
  }

  async getHandoff(id: string): Promise<HandoffPack | null> {
    const result = await this.pool.query(`select * from handoff_packs where id = $1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return handoffFromRow(row)
  }

  async listHandoffs(input?: { projectId?: string; limit?: number }): Promise<HandoffPack[]> {
    const params: unknown[] = []
    const where: string[] = []
    if (input?.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    params.push(input?.limit ?? 25)
    const result = await this.pool.query(
      `select * from handoff_packs
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit $${params.length}`,
      params,
    )
    return result.rows.map(handoffFromRow)
  }

  async upsertLlmProvider(input: CreateLlmProviderConfig): Promise<LlmProviderConfig> {
    const parsed = LlmProviderConfigSchema.parse(input)
    const timestamp = now()
    const provider: LlmProviderConfig = {
      id: parsed.id,
      providerKind: parsed.providerKind,
      displayName: parsed.displayName,
      enabled: parsed.enabled,
      priority: parsed.priority,
      capabilities: parsed.capabilities,
      metadata: parsed.metadata,
      createdAt: parsed.createdAt ?? timestamp,
      updatedAt: parsed.updatedAt ?? timestamp,
    }
    if (parsed.baseUrl) provider.baseUrl = parsed.baseUrl
    if (parsed.defaultModel) provider.defaultModel = parsed.defaultModel
    if (parsed.apiKeyEnv) provider.apiKeyEnv = parsed.apiKeyEnv

    const result = await this.pool.query(
      `insert into llm_provider_configs (
        id, provider_kind, display_name, base_url, default_model, api_key_env,
        enabled, priority, capabilities, metadata, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9::jsonb, $10::jsonb, $11::timestamptz, $12::timestamptz
      )
      on conflict (id) do update set
        provider_kind = excluded.provider_kind,
        display_name = excluded.display_name,
        base_url = excluded.base_url,
        default_model = excluded.default_model,
        api_key_env = excluded.api_key_env,
        enabled = excluded.enabled,
        priority = excluded.priority,
        capabilities = excluded.capabilities,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
      returning *`,
      [
        provider.id,
        provider.providerKind,
        provider.displayName,
        provider.baseUrl ?? null,
        provider.defaultModel ?? null,
        provider.apiKeyEnv ?? null,
        provider.enabled,
        provider.priority,
        JSON.stringify(provider.capabilities),
        JSON.stringify(provider.metadata ?? {}),
        provider.createdAt,
        provider.updatedAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to upsert LLM provider")
    return llmProviderFromRow(row)
  }

  async listLlmProviders(): Promise<LlmProviderConfig[]> {
    const result = await this.pool.query(
      `select * from llm_provider_configs order by priority asc, id asc`,
    )
    return result.rows.map(llmProviderFromRow)
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

    const result = await this.pool.query(
      `insert into llm_call_audits (
        id, request_kind, provider_id, provider_kind, model, project_id, status,
        input_summary, input_tokens, output_tokens, latency_ms, request, response, error, created_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15::timestamptz
      ) returning *`,
      [
        audit.id,
        audit.requestKind,
        audit.providerId ?? null,
        audit.providerKind ?? null,
        audit.model ?? null,
        audit.projectId ?? null,
        audit.status,
        audit.inputSummary,
        audit.inputTokens,
        audit.outputTokens,
        audit.latencyMs,
        JSON.stringify(audit.request ?? {}),
        JSON.stringify(audit.response ?? {}),
        audit.error ?? null,
        audit.createdAt,
      ],
    )

    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert LLM call audit")
    return llmCallAuditFromRow(row)
  }

  async getLlmCallAudit(id: string): Promise<LlmCallAudit | null> {
    const result = await this.pool.query(`select * from llm_call_audits where id = $1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return llmCallAuditFromRow(row)
  }


  async listLlmCallAudits(input?: { projectId?: string; limit?: number }): Promise<LlmCallAudit[]> {
    const params: unknown[] = []
    const where: string[] = []
    if (input?.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    params.push(input?.limit ?? 50)
    const result = await this.pool.query(
      `select * from llm_call_audits
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit $${params.length}`,
      params,
    )
    return result.rows.map(llmCallAuditFromRow)
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

    const result = await this.pool.query(
      `insert into artifact_records (
        id, artifact_kind, namespace, project_id, uri, path, name, mime_type, size_bytes,
        checksum, sensitivity, status, content_preview, content_text, metadata,
        source_event_ids, source_memory_ids, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15::jsonb,
        $16::uuid[], $17::uuid[], $18::timestamptz, $19::timestamptz
      ) returning *`,
      [
        artifact.id,
        artifact.artifactKind,
        artifact.namespace,
        artifact.projectId ?? null,
        artifact.uri,
        artifact.path ?? null,
        artifact.name,
        artifact.mimeType ?? null,
        artifact.sizeBytes ?? null,
        artifact.checksum ?? null,
        artifact.sensitivity,
        artifact.status,
        artifact.contentPreview ?? null,
        artifact.contentText ?? null,
        JSON.stringify(artifact.metadata ?? {}),
        artifact.sourceEventIds ?? [],
        artifact.sourceMemoryIds ?? [],
        artifact.createdAt,
        artifact.updatedAt,
      ],
    )
    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert artifact record")
    return artifactFromRow(row)
  }

  async getArtifact(id: string): Promise<ArtifactRecord | null> {
    const result = await this.pool.query(`select * from artifact_records where id = $1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return artifactFromRow(row)
  }

  async searchArtifacts(input: ArtifactSearchRequest): Promise<ArtifactRecord[]> {
    const where: string[] = []
    const params: unknown[] = []

    if (input.namespace) {
      params.push(input.namespace)
      where.push(`namespace = $${params.length}`)
    }
    if (input.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    if (input.artifactKinds?.length) {
      params.push(input.artifactKinds)
      where.push(`artifact_kind = any($${params.length}::text[])`)
    }
    if (input.statuses?.length) {
      params.push(input.statuses)
      where.push(`status = any($${params.length}::text[])`)
    }
    if (input.pathPrefix) {
      params.push(`${input.pathPrefix}%`)
      where.push(`path ilike $${params.length}`)
    }
    if (input.query) {
      params.push(`%${input.query}%`)
      const param = params.length
      where.push(`(name ilike $${param} or path ilike $${param} or uri ilike $${param} or content_preview ilike $${param} or content_text ilike $${param})`)
    }

    params.push(input.limit ?? 50)
    const limitParam = params.length
    const result = await this.pool.query(
      `select ${input.includeContent ? "*" : "id, artifact_kind, namespace, project_id, uri, path, name, mime_type, size_bytes, checksum, sensitivity, status, content_preview, null::text as content_text, metadata, source_event_ids, source_memory_ids, created_at, updated_at"}
       from artifact_records
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by updated_at desc
       limit $${limitParam}`,
      params,
    )
    return result.rows.map(artifactFromRow)
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

    const result = await this.pool.query(
      `insert into repo_index_runs (
        id, project_id, namespace, root_path, include_globs, exclude_globs, max_bytes_per_file,
        artifact_count, ignored_count, status, metadata, created_at
      ) values (
        $1, $2, $3, $4, $5::text[], $6::text[], $7,
        $8, $9, $10, $11::jsonb, $12::timestamptz
      ) returning *`,
      [
        run.id,
        run.projectId ?? null,
        run.namespace,
        run.rootPath,
        run.includeGlobs,
        run.excludeGlobs,
        run.maxBytesPerFile,
        run.artifactCount,
        run.ignoredCount,
        run.status,
        JSON.stringify(run.metadata ?? {}),
        run.createdAt,
      ],
    )
    const row = result.rows[0]
    if (!row) throw new Error("Failed to insert repo index run")
    return repoIndexRunFromRow(row)
  }

  async listRepoIndexRuns(input?: { projectId?: string; limit?: number }): Promise<RepoIndexRun[]> {
    const params: unknown[] = []
    const where: string[] = []
    if (input?.projectId) {
      params.push(input.projectId)
      where.push(`project_id = $${params.length}`)
    }
    params.push(input?.limit ?? 25)
    const result = await this.pool.query(
      `select * from repo_index_runs
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit $${params.length}`,
      params,
    )
    return result.rows.map(repoIndexRunFromRow)
  }

}
