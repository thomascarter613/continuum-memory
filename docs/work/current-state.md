# Current State

## Active Objective

Build Continuum Memory: a model-agnostic persistent memory and context control plane for software-development assistance.

## Current Phase

Layer 6 LLM Gateway is complete for the first scaffold. The system can now persist durable memory, review/promote candidates, build ranked/audited context packs, compile handoff artifacts, enforce first-pass governance/evaluation checks, and route/provider-audit LLM calls through a model-agnostic gateway.

## Accepted Decisions

- Build Continuum Memory as a separate reusable monorepo.
- Use repo-local `.memory/` adapters in product monorepos.
- Use PostgreSQL as canonical memory store.
- Treat vector stores as indexes, not source of truth.
- Make handoff packs first-class artifacts.
- Use a storage interface so the API is not coupled to one persistence implementation.
- Keep in-memory storage only for tests and throwaway development.
- Use memory candidates as a reviewable buffer before durable memory writes.
- Build context through an explicit context plan rather than dumping all active memories into a prompt.
- Audit retrieval requests and included retrieval results.
- Compile handoffs as portable state-transfer artifacts from durable memory and context packs.
- Route all model calls through an audited model-agnostic LLM Gateway.
- Keep deterministic mock provider as the default local/CI provider.

## Layer 1 Completed

- Added `ContinuumStore` interface.
- Added `InMemoryContinuumStore`.
- Added `PostgresContinuumStore`.
- Added PostgreSQL pool and migration runner.
- Added durable persistence for `memory_events`, `memory_records`, and `handoff_packs`.
- Added supersession update behavior when a new memory supersedes an old memory.
- Added smoke-test script.
- Added durable-store ADR and work packet.

## Layer 2 Completed

- Added `memory_candidates` domain model.
- Added `memory_candidates` PostgreSQL table and indexes.
- Added candidate create, read, search, promote, and reject storage methods.
- Added candidate lifecycle API endpoints.
- Added deterministic heuristic candidate extraction endpoint for local testing.
- Added SDK candidate methods.
- Updated smoke test to exercise candidate create, promotion, extraction, rejection, and search.
- Added ADR-0005 and WP-0003.

## Layer 3 Completed

- Added context plan domain schema.
- Added ranked context memory schema.
- Added context evidence/citation schema.
- Added retrieval request/result audit domain schema.
- Added `context_retrieval_requests` and `context_retrieval_results` tables.
- Added retrieval audit persistence to in-memory and PostgreSQL stores.
- Added `/v1/context/plan` endpoint.
- Replaced simple context build with a section-aware context builder.
- Added scoring by section fit, task/query overlap, confidence, recency, evidence, sensitivity, and project scope.
- Added section-level max memory count and overall token-budget enforcement.
- Added retrieval audit id to context packs.
- Added citations/evidence metadata to context packs.
- Updated SDK and smoke test for context planning/building.
- Added ADR-0006 and WP-0004.

## Layer 4 Completed

- Added richer handoff payload schema.
- Added `HandoffCompileRequestSchema` and compile response schema.
- Added deterministic handoff compiler.
- Added `/v1/handoffs/compile` endpoint.
- Compiled handoffs now generate a handoff-oriented context pack, write retrieval audit records, bucket memories into handoff sections, and persist the resulting handoff pack.
- Added source memory IDs, context pack ID, compile metadata, and Markdown/JSON output.
- Added SDK support for `compileHandoff`.
- Updated smoke test to verify compiled handoff generation.
- Added ADR-0007 and WP-0005.

## Next Recommended Layer

Layer 5 should build governance and evaluation:

- Enforce policy checks before memory writes, retrieval, and handoff export.
- Add memory quality evals.
- Add stale-memory detection.
- Add supersession/contradiction assistance.
- Add retention and privacy tests.
- Add handoff completeness scoring.


## Layer 5 Update: Governance and Evaluation

Layer 5 adds policy decisions, memory evaluations, handoff completeness scoring, evidence enforcement for durable memory writes, and governance/evaluation API surfaces.


## Layer 6 Completed

- Added LLM provider domain model.
- Added prompt compilation domain model.
- Added route, chat, embedding, and audit schemas.
- Added `llm_provider_configs` and `llm_call_audits` tables.
- Added built-in provider registry for mock, OpenAI-compatible, Ollama, and Anthropic-compatible providers.
- Added provider routing by capability, priority, sensitivity, and context window.
- Added provider-neutral prompt compiler.
- Added deterministic mock chat response and deterministic mock embedding vectors.
- Added `/v1/llm/providers`, `/v1/llm/route`, `/v1/prompts/compile`, `/v1/llm/chat`, `/v1/llm/embeddings`, and `/v1/llm/audits/:id`.
- Added SDK and CLI support for LLM Gateway commands.
- Updated smoke test to verify provider listing, routing, prompt compilation, chat dry-run, embeddings dry-run, and audit lookup.
- Added ADR-0009 and WP-0007.

## Next Recommended Layer

Layer 7 should build artifact memory and repo/file indexing:

- Add artifact metadata table.
- Add file checksum and content-chunk tables.
- Add repo scanner for source/docs/config files.
- Add artifact-to-memory evidence links.
- Add Git-safe include/exclude policy.
- Prepare pgvector/Qdrant synchronization hooks for indexed artifacts.


## Layer 7 Complete: Artifact Memory + Repo Indexer

Continuum now has artifact records, repository index runs, artifact search, and local repository indexing. This allows future context packs and handoffs to reference files, docs, scripts, configs, generated outputs, and checksums.


## Layer 8 Complete: CLI Workflows

Continuum now includes CLI workflows for installing repo-local project adapters, reading project identity, indexing repositories, exporting context, saving handoffs, and closing software development sessions.

## Next Layer

Layer 9: Admin UI / memory browser.


## Layer 9 Complete: Admin UI / Memory Browser

Continuum now includes a lightweight `apps/web` admin UI and read-only admin endpoints for inspecting memory/control-plane state. It is suitable for local development and debugging, but should not be exposed publicly until Layer 10 hardening adds auth/deployment controls.
