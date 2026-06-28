# Continuum Memory

Continuum Memory is a model-agnostic persistent memory and context control plane for software-development agents and LLM-assisted work.

## Canonical repository

This project is intended to live at:

```txt
https://github.com/thomascarter613/continuum-memory.git
```

It is designed around this rule:

> Chats are disposable. Memory is durable. Context is assembled. Handoffs are explicit artifacts.

This repository is the reusable memory system itself. Product/application monorepos should not embed this whole system. Instead, product repos should include a thin `.memory/` adapter, `AGENTS.md`, ADRs, work packets, current-state docs, and handoff files.

## Layer 6 status

Layer 6 adds the first model-agnostic **LLM Gateway** workflow on top of governance, context packs, and handoff compilation.

Included now:

- Bun workspace
- TypeScript packages
- Hono API
- shared domain schemas
- JavaScript SDK shell
- CLI shell
- PostgreSQL-backed storage repositories
- in-memory storage implementation for tests/dev
- migration runner
- SQL migrations for events, memory records, semantic facts, handoff packs, memory candidates, and retrieval audit records
- Docker Compose for Postgres/pgvector, Qdrant, Valkey, and MinIO
- memory candidate create/search/review APIs
- memory candidate promotion into durable memory records
- memory candidate rejection with review reason
- heuristic candidate extraction endpoint for local testing
- context planning endpoint
- ranked/audited context pack builder
- deterministic handoff compiler
- section-level context planning for project state, preferences, decisions, procedures, recent episodes, and open tasks
- relevance scoring based on section fit, task/query overlap, confidence, recency, evidence, sensitivity, and project scope
- token-budget enforcement with reserved output budget
- citation/evidence metadata in context packs
- retrieval request/result audit tables
- smoke-test script covering candidate creation, promotion, extraction, rejection, context planning, context build, retrieval audit creation, handoff creation, and compiled handoff generation
- memory taxonomy docs
- ADRs
- work planning docs
- OPA/Rego policy stubs
- prompt templates
- project-adapter template for other monorepos
- governance and evaluation API surfaces
- policy decision audit table
- memory quality evaluation table
- LLM provider domain schemas
- built-in mock, OpenAI-compatible, Ollama, and Anthropic-compatible provider definitions
- provider routing by capability, sensitivity, context window, and priority
- provider-neutral prompt compiler
- chat and embedding request contracts
- deterministic mock LLM chat and embedding dry-runs
- LLM call audit table
- SDK and CLI LLM gateway commands

Still intentionally deferred to later layers:

- full provider-specific streaming/tool-call execution
- full Anthropic-native execution
- production-grade embedding adapters beyond deterministic mock vectors
- embedding-backed semantic retrieval
- pgvector similarity ranking
- Qdrant synchronization
- LLM-based candidate extraction with provider routing
- policy enforcement runtime for candidate review and retrieval authorization
- artifact/blob indexing
- temporal knowledge graph
- admin UI
- Git-writing handoff exporter

## Quickstart with durable PostgreSQL storage

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
curl http://localhost:3030/healthz
```

Expected shape:

```json
{
  "ok": true,
  "service": "continuum-memory-api",
  "store": {
    "ok": true,
    "kind": "postgres"
  }
}
```

Run the smoke test:

```bash
bun run smoke:api
```

The smoke test lists LLM providers, routes a model task, compiles a provider-neutral prompt, runs mock chat and embedding dry-runs, verifies LLM audit records, creates a memory event, writes a decision memory, creates and promotes a candidate, extracts additional candidates from text, rejects one candidate, searches memory, searches candidates, plans context, builds a ranked/audited context pack, verifies the retrieval audit id, creates a manual handoff pack, and compiles a handoff from durable memory.

## Quickstart with process-local in-memory storage

Use this only for throwaway development or tests:

```bash
cp .env.example .env
printf '\nCONTINUUM_STORE=memory\n' >> .env
bun install
bun run dev
```

The in-memory store is useful for API shape testing, but it does not survive process restarts.

## Recommended workspace layout

```txt
Workspace/
├── continuum-memory/       # this reusable memory system
├── your-product-monorepo/  # product repo using a thin .memory adapter
└── .continuum-data/        # local runtime data, not committed
```

## Apply the project adapter to another repo

From this repository:

```bash
./scripts/create-project-adapter.sh ../your-product-monorepo
```

This copies the template files that let Continuum understand a software project.

## Main concepts

- **Working memory**: current run/session/task state.
- **Episodic memory**: what happened, when, and with what evidence.
- **Semantic memory**: durable facts, preferences, project state, and stable knowledge.
- **Procedural memory**: reusable workflows, runbooks, prompts, and executable skills.
- **Decision memory**: ADR-like decision records with rationale and alternatives.
- **Artifact memory**: files, generated outputs, logs, diagrams, and external documents.
- **Handoff memory**: portable state packages for resuming work in new chats or models.
- **Memory candidate**: a proposed memory that has evidence but has not yet been accepted as durable memory.
- **Context plan**: a retrieval plan describing what sections are needed and which memory types/scopes/keywords are relevant.
- **Context pack**: a model-ready bundle of ranked memories, section content, citations, token budget metadata, and retrieval audit id.
- **Retrieval audit**: durable record of what was considered/included in a context pack and why.
- **Compiled handoff**: a persisted Markdown/JSON transfer artifact generated from durable memory plus a handoff-oriented context pack.
- **LLM Gateway**: provider-neutral routing, prompt compilation, dry-run/execution, embeddings, and audit boundary for model calls.

## Candidate lifecycle

```txt
observed text/event/tool result
→ memory candidate
→ review
→ promote to durable memory OR reject with reason
```

## Context lifecycle

```txt
incoming task/query
→ context plan
→ active memory retrieval
→ section-aware ranking
→ token budgeting
→ citations/evidence bundle
→ retrieval audit records
→ context pack
```

Layer 3 implements the storage and API foundation for this lifecycle. Layer 4 uses the context lifecycle to compile portable handoff artifacts. Layer 6 routes model calls through an audited provider gateway.

## Development commands

```bash
bun run infra:up
bun run db:migrate
bun run dev
bun run smoke:api
bun run format
bun run lint
bun run typecheck
bun run test
bun run check
```

## API endpoints

```txt
GET  /healthz
GET  /v1/llm/providers
POST /v1/llm/providers
POST /v1/llm/route
POST /v1/prompts/compile
POST /v1/llm/chat
POST /v1/llm/embeddings
GET  /v1/llm/audits/:id
POST /v1/events
POST /v1/memory
GET  /v1/memory/:id
POST /v1/memory/search
POST /v1/memory/candidates
POST /v1/memory/candidates/extract
POST /v1/memory/candidates/search
GET  /v1/memory/candidates/:id
POST /v1/memory/candidates/:id/promote
POST /v1/memory/candidates/:id/reject
POST /v1/context/plan
POST /v1/context/build
POST /v1/handoffs
POST /v1/handoffs/compile
GET  /v1/handoffs/:id
```

## LLM Gateway example

List providers:

```bash
curl -X GET http://localhost:3030/v1/llm/providers
```

Route a task:

```bash
curl -X POST http://localhost:3030/v1/llm/route \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue implementation",
    "preferredProviderId":"mock",
    "requiredCapabilities":["chat"]
  }'
```

Run a deterministic mock chat dry-run:

```bash
curl -X POST http://localhost:3030/v1/llm/chat \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "providerId":"mock",
    "execute":false,
    "messages":[{"role":"user","content":"Confirm the gateway is wired."}]
  }'
```

## Context example

Plan context:

```bash
curl -X POST http://localhost:3030/v1/context/plan \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue architecture implementation",
    "query":"PostgreSQL canonical memory architecture",
    "include":["decisions","project_state"],
    "retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true}
  }'
```

Build a ranked/audited context pack:

```bash
curl -X POST http://localhost:3030/v1/context/build \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue architecture implementation",
    "query":"PostgreSQL canonical memory architecture",
    "include":["decisions","project_state"],
    "retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true},
    "budget":{"maxInputTokens":12000,"reserveOutputTokens":2000,"maxMemoriesPerSection":5}
  }'
```


## Handoff compile example

Compile a handoff from durable memory and context retrieval:

```bash
curl -X POST http://localhost:3030/v1/handoffs/compile \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "title":"Demo Compiled Handoff",
    "objective":"Resume implementation from the latest durable memory state.",
    "query":"decisions constraints next actions verification",
    "retrieval":{"strategy":"handoff","minScore":0.1,"includeEvidence":true}
  }'
```

The response includes:

```txt
compileId
handoff
contextPack
sourceMemoryIds
markdown
json
createdAt
```

## Candidate examples

Create a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates \
  -H 'content-type: application/json' \
  -d '{
    "candidateType":"decision",
    "namespace":"project:demo/decisions",
    "scope":{"projectId":"demo"},
    "content":"Decision: memory candidates must be reviewed before promotion.",
    "confidence":0.9,
    "suggestedMemoryType":"decision"
  }'
```

Extract candidates from text:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/extract \
  -H 'content-type: application/json' \
  -d '{
    "namespace":"project:demo/session",
    "projectId":"demo",
    "text":"Going forward, prefer explicit handoff packs. Next action: add policy hooks. Open question: should promotion require human approval?"
  }'
```

Promote a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/<candidate-id>/promote \
  -H 'content-type: application/json' \
  -d '{}'
```

Reject a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/<candidate-id>/reject \
  -H 'content-type: application/json' \
  -d '{"reason":"Too trivial to preserve as durable memory."}'
```

## Storage contract

The API depends on a storage interface, not a concrete database implementation. Current implementations:

```txt
apps/api/src/store/in-memory-store.ts
apps/api/src/store/postgres-store.ts
```

Use PostgreSQL for real work:

```env
CONTINUUM_STORE=postgres
```


## Layer 5 Update: Governance and Evaluation

Layer 5 adds policy decisions, memory evaluations, handoff completeness scoring, evidence enforcement for durable memory writes, and governance/evaluation API surfaces.


## Layer 7: Artifact Memory + Repo Indexing

Layer 7 adds first-class artifact records, repository index runs, artifact create/read/search APIs, and a local repository indexer. Git remains canonical; Continuum stores metadata, checksums, previews, and optional content capture for context and handoff use.


## Layer 8: CLI workflows

Layer 8 adds the operator workflow layer for software development.

```bash
# Install a repo-local adapter into another monorepo
bun run cli -- adapter-install ../your-product-monorepo --id your-product --name "Your Product"

# Inspect the attached project
bun run cli -- project-status ../your-product-monorepo

# Index repository artifacts under the adapter namespace
bun run cli -- repo-index-workflow ../your-product-monorepo

# Export context for a new chat/session
bun run cli -- context-export ../your-product-monorepo --task "continue current implementation work"

# Save a durable handoff
bun run cli -- handoff-save ../your-product-monorepo --objective "resume in the next chat"

# Close a session: index artifacts + save latest handoff
bun run cli -- session-close ../your-product-monorepo --objective "resume software development work"
```

The project adapter stays inside the product repo. Runtime memory, databases, indexes, and private state stay outside the product repo.

### Layer 9: Admin UI / Memory Browser

Layer 9 adds the first human-facing browser for Continuum state.

```bash
bun run web:dev
```

The UI connects to `http://localhost:3030` by default and can browse memories, candidates, artifacts, handoffs, policy decisions, evaluations, provider configs, LLM call audits, and repo index runs.


## Layer 10: Production hardening and v1 release readiness

Layer 10 adds the v1 release-readiness surface:

```txt
/livez
/readyz
/healthz
/version
```

It also adds release verification, backup/restore scripts, production-like Docker Compose, CI/security workflows, security policy, changelog, and the v1 readiness checklist.

Recommended final local verification:

```bash
bun install
bun run doctor
bun run infra:up
bun run db:migrate
bun run dev
bun run release:check
bun run web:build
```

Continuum v1 is suitable for local-first developer memory workflows. Do not expose it publicly without adding authentication, authorization, TLS, secret management, restricted CORS, and backup automation.
