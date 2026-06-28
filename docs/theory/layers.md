# Continuum-Memory: Layers

## Layer 0: Scaffold

Started. I created **Layer 0** as a downloadable scaffold:

[Download `continuum-memory-layer0.zip`](sandbox:/mnt/data/continuum-memory-layer0.zip)

This contains the first working foundation for the separate reusable memory system.

## What I created

```txt
continuum-memory/
├── apps/
│   ├── api/                  # Hono API shell
│   └── cli/                  # CLI shell
├── packages/
│   ├── domain/               # shared memory/context/handoff schemas
│   └── sdk-js/               # JavaScript SDK shell
├── infra/
│   ├── docker/compose.yaml   # Postgres, Qdrant, Valkey, MinIO
│   └── migrations/           # initial SQL foundation
├── policies/                 # OPA/Rego policy stubs
├── prompts/                  # memory extraction + handoff prompts
├── templates/
│   └── project-adapter/      # .memory adapter for product monorepos
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── work/
│   └── handoffs/
├── scripts/
│   └── create-project-adapter.sh
├── README.md
├── AGENTS.md
├── package.json
├── biome.json
└── tsconfig.base.json
```

## What this layer does

It establishes the system architecture and gives us a runnable starting point:

```txt
GET  /healthz
POST /v1/events
POST /v1/memory
GET  /v1/memory/:id
POST /v1/memory/search
POST /v1/context/build
POST /v1/handoffs
GET  /v1/handoffs/:id
```

The API currently uses an **in-memory store** so the first layer is easy to run. The next layer should replace that with PostgreSQL persistence.

## How to run it

After downloading and unzipping:

```bash
cd continuum-memory
cp .env.example .env
bun install
bun run dev
```

Then test:

```bash
curl http://localhost:3030/healthz
```

Expected:

```json
{"ok":true,"service":"continuum-memory-api"}
```

I could not run the Bun verification in this environment because Bun is not installed here, so treat this as a generated Layer 0 scaffold that should be verified locally.

## How to add the repo-local adapter to another monorepo

From inside `continuum-memory`:

```bash
./scripts/create-project-adapter.sh ../your-product-monorepo
```

That installs:

```txt
your-product-monorepo/
├── .memory/
│   ├── project.yaml
│   ├── namespaces.yaml
│   ├── context-budget.yaml
│   ├── handoff-policy.yaml
│   └── procedures/
├── AGENTS.md
└── docs/
    ├── adr/
    ├── handoffs/
    └── work/current-state.md
```

## Recommended next layer

Next I would build **Layer 1: Durable Store**:

```txt
1. Add PostgreSQL connection module.
2. Add migration runner.
3. Replace in-memory maps with repositories.
4. Persist memory_events.
5. Persist memory_records.
6. Persist handoff_packs.
7. Add tests for event, memory, search, and handoff APIs.
```

The important thing is that we now have the split we wanted:

```txt
continuum-memory/          # reusable external memory/control-plane system
your-product-monorepo/     # software project with thin .memory adapter
.continuum-data/           # private runtime data, not committed
```

## Layer 1: Durable Store

Done. I created **Layer 1: Durable Store**.

[Download `continuum-memory-layer1.zip`](sandbox:/mnt/data/continuum-memory-layer1.zip)

## What changed from Layer 0

Layer 1 adds real persistence:

```txt
continuum-memory-layer1/
├── apps/api/src/store/
│   ├── types.ts
│   ├── in-memory-store.ts
│   ├── postgres-store.ts
│   ├── postgres-mappers.ts
│   └── index.ts
├── apps/api/src/db/
│   ├── pool.ts
│   └── migrations.ts
├── apps/api/src/migrate.ts
├── infra/migrations/
│   ├── 0001_memory_foundation.sql
│   └── 0002_indexes_and_supersession.sql
├── scripts/smoke-test-api.sh
├── docs/adr/0004-add-postgresql-backed-durable-store.md
├── docs/work/work-packets/WP-0002-durable-store.md
└── docs/runbooks/local-postgres-durable-store.md
```

## What Layer 1 now supports

The API now has a storage interface with two implementations:

```txt
PostgresContinuumStore      # real durable storage
InMemoryContinuumStore      # throwaway dev/test storage
```

Durable PostgreSQL persistence now exists for:

```txt
memory_events
memory_records
semantic_facts
handoff_packs
```

It also adds:

```txt
migration runner
database indexes
memory supersession update behavior
API smoke test script
SDK methods for getMemory and getHandoff
```

## How to run it

After unzipping:

```bash
cd continuum-memory-layer1
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

Then in another terminal:

```bash
curl http://localhost:3030/healthz
```

Run the smoke test:

```bash
bun run smoke:api
```

That creates:

```txt
1. a memory event
2. a decision memory
3. a memory search
4. a context pack
5. a handoff pack
```

## Important note

I could not run Bun verification in this environment because Bun is not installed here. I did create the scaffold, source files, migrations, scripts, and docs, but you should verify locally with:

```bash
bun install
bun run infra:up
bun run db:migrate
bun run check
bun run dev
bun run smoke:api
```

## Next layer

The next correct layer is **Layer 2: Memory Ingestion**.

That should add:

```txt
memory_candidates table
candidate extraction schema
POST /v1/memory/candidates
candidate review/promote/reject flow
candidate-to-memory promotion
evidence enforcement
policy pre-check hooks
```

This is the point where the system starts turning conversations/tool results into proposed durable memories.


## Layer 2: Memory Ingestion

Done. I created **Layer 2: Memory Ingestion** and aligned it to your canonical repo:

```txt
https://github.com/thomascarter613/continuum-memory.git
```

[Download `continuum-memory-layer2.zip`](sandbox:/mnt/data/continuum-memory-layer2.zip)

I also checked the GitHub repo metadata. It appears to be a fresh/empty public repository, so this zip is structured with the root folder named:

```txt
continuum-memory/
```

## What Layer 2 adds

Layer 2 adds the first real **memory ingestion lifecycle**:

```txt
observed text/event/tool result
→ memory candidate
→ review
→ promote to durable memory OR reject with reason
```

New major additions:

```txt
memory_candidates table
candidate domain schemas
candidate create/search/read APIs
candidate promotion API
candidate rejection API
deterministic candidate extraction endpoint
PostgreSQL-backed candidate repository methods
in-memory candidate repository methods
SDK candidate methods
updated smoke test
ADR-0005
WP-0003
memory ingestion runbook
GitHub CI workflow
GitHub push runbook
```

## New API endpoints

```txt
POST /v1/memory/candidates
POST /v1/memory/candidates/extract
POST /v1/memory/candidates/search
GET  /v1/memory/candidates/:id
POST /v1/memory/candidates/:id/promote
POST /v1/memory/candidates/:id/reject
```

## Push it to your GitHub repo

After downloading the zip:

```bash
unzip continuum-memory-layer2.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: scaffold continuum memory layer 2"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified the zip integrity successfully. I could not run the Bun install/check pipeline inside this environment because Bun is not installed here, so run this locally after pushing:

```bash
bun install
bun run check
bun run smoke:api
```

## Next layer

Next should be **Layer 3: Context Retrieval + Context Pack Builder**:

```txt
retrieval request/result audit tables
context plan schema
memory ranking by relevance/confidence/recency/scope
section-level token budgeting
evidence/citation metadata in context packs
exclusion of unpromoted candidates by default
```


## Layer 3: Context Retrieval + Context Pack Builder

Done. I created **Layer 3: Context Retrieval + Context Pack Builder**.

[Download `continuum-memory-layer3.zip`](sandbox:/mnt/data/continuum-memory-layer3.zip)

## What Layer 3 adds

Layer 3 turns context building from a simple memory dump into a real retrieval pipeline:

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

New major additions:

```txt
POST /v1/context/plan
POST /v1/context/build  # now ranked, budgeted, cited, and audited
```

New persistence:

```txt
context_retrieval_requests
context_retrieval_results
```

New files include:

```txt
infra/migrations/0004_context_retrieval_audit.sql
apps/api/src/lib/context-builder.ts
docs/adr/0006-context-packs-are-planned-ranked-and-audited.md
docs/work/work-packets/WP-0004-context-builder.md
docs/runbooks/context-builder.md
docs/runbooks/push-layer3-to-github.md
policies/context-retrieval.rego
prompts/retrieval/context-plan.md
```

## What the context builder now scores

Memories are ranked by:

```txt
section fit
task/query overlap
confidence
recency
source evidence
project scope
sensitivity
token budget
```

Context packs now include:

```txt
retrievalAuditId
plan
sections
rankedMemories
citations
tokenBudget
```

## Push it to your GitHub repo

After downloading and unzipping:

```bash
unzip continuum-memory-layer3.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: scaffold continuum memory layer 3"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified the zip integrity and shell-script syntax. I still could not run the Bun install/check pipeline in this environment because Bun is not installed here, so run this locally:

```bash
bun install
bun run check
bun run smoke:api
```

## Next layer

Next should be **Layer 4: Handoff Compiler**:

```txt
Generate handoffs from durable memory
Compile recent episodes + decisions + open tasks
Add Markdown/JSON handoff contracts
Add project-adapter handoff writer
Add POST /v1/handoffs/compile
Add Git-safe handoff output conventions
```


## Layer 4: Handoff Compiler

Done. I created **Layer 4: Handoff Compiler**.

[Download `continuum-memory-layer4.zip`](sandbox:/mnt/data/continuum-memory-layer4.zip)

## What Layer 4 adds

Layer 4 turns handoffs into real compiled state-transfer artifacts:

```txt
durable memories
→ handoff-oriented context pack
→ retrieval audit records
→ source memory IDs
→ bucketed handoff sections
→ persisted Markdown/JSON handoff
```

New endpoint:

```txt
POST /v1/handoffs/compile
```

New/updated capabilities:

```txt
HandoffCompileRequestSchema
HandoffCompileResponseSchema
deterministic handoff compiler
richer handoff payload schema
compiled Markdown renderer
sourceMemoryIds in handoffs
contextPackId in handoffs
compile metadata
SDK compileHandoff method
CLI handoff-compile command
handoff compiler smoke test
handoff compiler runbook
ADR-0007
WP-0005
handoff compile policy stub
handoff compile prompt contract
```

## Example compile request

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

## Push to your GitHub repo

```bash
unzip continuum-memory-layer4.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add compiled handoff layer"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified the zip integrity and shell-script syntax. I could not run the full Bun pipeline here because Bun/dependencies are not installed in this environment, so run this locally after unzipping:

```bash
bun install
bun run check
bun run smoke:api
```

## Next layer

Next should be **Layer 5: Governance and Evaluation**:

```txt
policy checks before memory write/retrieval/handoff export
memory quality evals
stale-memory detection
supersession/contradiction assistance
privacy and retention tests
handoff completeness scoring
```


## Layer 5: Governance and Evaluation


Done. I created **Layer 5: Governance + Evaluation**.

[Download `continuum-memory-layer5.zip`](sandbox:/mnt/data/continuum-memory-layer5.zip)

## How many layers remain?

My recommended v1 plan is **11 total layers**, numbered **Layer 0 through Layer 10**.

We have now completed:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
```

So after this, **5 layers remain**:

```txt
Layer 6: LLM Gateway + provider adapters
Layer 7: Artifact memory + repo/file indexer
Layer 8: CLI workflows + project adapter automation
Layer 9: Admin UI / memory browser
Layer 10: Production hardening + v1 release readiness
```

## What Layer 5 adds

Layer 5 makes governance and quality checks first-class:

```txt
policy_decisions table
memory_evaluations table
POST /v1/policy/check
POST /v1/evals/memory
POST /v1/evals/handoff
policy checks before durable memory writes
policy checks before candidate promotion
policy checks before context retrieval
policy checks before handoff export
memory quality scoring
handoff completeness scoring
governance runbook
ADR-0008
WP-0006
```

It also fixes an inherited Layer 4 issue in the context builder where a duplicate loop line had slipped into the generated code.

## Push to your GitHub repo

```bash
unzip continuum-memory-layer5.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add governance and evaluation layer"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified the zip integrity and shell script syntax here. I still could not run the Bun pipeline in this environment because Bun is not installed, so run this locally:

```bash
bun install
bun run check
bun run smoke:api
```

## Next layer

Next is **Layer 6: LLM Gateway + Provider Adapters**.

That will add the model-agnostic execution layer:

```txt
provider abstraction
OpenAI-compatible adapter
Anthropic-style adapter placeholder
Ollama/local adapter placeholder
embedding provider interface
prompt compiler interface
model capability registry
provider routing policy
LLM call audit events
```


## Layer 6: LLM Gateway + Provider Adapters

Done. I created **Layer 6: LLM Gateway + Provider Adapters**.

[Download `continuum-memory-layer6.zip`](sandbox:/mnt/data/continuum-memory-layer6.zip)

## Layers remaining

We are now through:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
Layer 6: LLM Gateway + provider adapters
```

Remaining for v1:

```txt
Layer 7: Artifact memory + repo/file indexer
Layer 8: CLI workflows + project adapter automation
Layer 9: Admin UI / memory browser
Layer 10: Production hardening + v1 release readiness
```

So **4 layers remain**.

## What Layer 6 adds

New model-agnostic LLM infrastructure:

```txt
LLM provider domain schemas
provider configuration persistence
LLM call audit persistence
built-in mock provider
OpenAI-compatible provider adapter path
Ollama/local provider adapter path
Anthropic-compatible placeholder provider
provider routing by capability / priority / sensitivity / context window
provider-neutral prompt compiler
mock chat dry-run endpoint
deterministic embedding dry-run endpoint
LLM audit lookup endpoint
SDK support
CLI support
smoke-test coverage
ADR-0009
WP-0007
LLM Gateway runbook
```

## New API endpoints

```txt
GET  /v1/llm/providers
POST /v1/llm/providers
POST /v1/llm/route
POST /v1/prompts/compile
POST /v1/llm/chat
POST /v1/llm/embeddings
GET  /v1/llm/audits/:id
```

## Why this layer matters

This is the layer that makes Continuum truly **model-agnostic**.

The system can now say:

```txt
Build durable context
→ compile a provider-neutral prompt
→ route to a provider
→ dry-run or execute the call
→ audit provider/model/token/status metadata
```

The default provider is `mock`, so local development and smoke tests work without paid APIs, API keys, or local model servers.

## Push to GitHub

```bash
unzip continuum-memory-layer6.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add llm gateway layer"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified:

```txt
zip integrity
shell script syntax
TypeScript syntax/type shape with local compiler shims
```

I still could not run the full Bun install/check/smoke pipeline here because Bun and project dependencies are not installed in this environment. Run locally:

```bash
bun install
bun run check
bun run smoke:api
```

Next is **Layer 7: Artifact memory + repo/file indexer**.


## Layer 7: Artifact memory + repo/file indexer

Done. I created **Layer 7: Artifact Memory + Repo/File Indexer**.

[Download `continuum-memory-layer7.zip`](sandbox:/mnt/data/continuum-memory-layer7.zip)

## Layers remaining

We are now through:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
Layer 6: LLM gateway + provider adapters
Layer 7: Artifact memory + repo/file indexer
```

Remaining for v1:

```txt
Layer 8: CLI workflows + project adapter automation
Layer 9: Admin UI / memory browser
Layer 10: Production hardening + v1 release readiness
```

So **3 layers remain**.

## What Layer 7 adds

Layer 7 makes Continuum useful for real software development by adding durable artifact memory:

```txt
source files
documentation
config files
scripts
schemas
tests
generated outputs
command logs
repository index runs
file checksums
content previews
optional full content capture
```

New API endpoints:

```txt
POST /v1/artifacts
GET  /v1/artifacts/:id
POST /v1/artifacts/search
POST /v1/artifacts/index-repo
```

New persistence:

```txt
artifact_records
repo_index_runs
```

New files include:

```txt
packages/domain/src/artifact.ts
infra/migrations/0007_artifact_memory.sql
apps/api/src/lib/artifact-indexer.ts
docs/adr/0010-add-artifact-memory-and-repository-indexing.md
docs/work/work-packets/WP-0008-artifact-memory.md
docs/runbooks/artifact-memory-and-repo-indexing.md
policies/artifact-index.rego
prompts/artifacts/repo-indexing.md
examples/api/artifacts.sh
```

## Important behavior

The repository indexer excludes common unsafe/noisy paths by default:

```txt
.git/
node_modules/
dist/
build/
coverage/
.turbo/
.next/
.moon/
.continuum-data/
```

It stores metadata, paths, checksums, MIME type, size, and content preview. Full file content capture is **off by default** and must be explicitly enabled with:

```json
"captureContent": true
```

## Push to GitHub

```bash
unzip continuum-memory-layer7.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add artifact memory and repo indexing"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```

## Verification note

I verified the zip integrity. I could not run the full Bun pipeline here because Bun and project dependencies are not installed in this environment. Run locally:

```bash
bun install
bun run check
bun run smoke:api
```

Next is **Layer 8: CLI workflows + project adapter automation**.


## Layer 8: CLI workflows + project adapter automation

Done. I created **Layer 8: CLI Workflows + Project Adapter Automation**.

[Download `continuum-memory-layer8.zip`](sandbox:/mnt/data/continuum-memory-layer8.zip)

## Layers remaining

We are now through:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
Layer 6: LLM gateway + provider adapters
Layer 7: Artifact memory + repo/file indexer
Layer 8: CLI workflows + project adapter automation
```

Remaining for v1:

```txt
Layer 9: Admin UI / memory browser
Layer 10: Production hardening + v1 release readiness
```

So **2 layers remain**.

## What Layer 8 adds

Layer 8 makes Continuum usable as a day-to-day software development tool from the terminal.

New CLI workflow commands:

```bash
continuum adapter-install [path] --id <id> --name <name> [--force]
continuum project-status [path]
continuum repo-index-workflow [path]
continuum context-export [path] --task <task> [--output <file>]
continuum handoff-save [path] --objective <objective> [--output <file>]
continuum session-close [path] --objective <objective>
```

These are designed for exactly your use case: attaching Continuum to a software monorepo without putting the whole memory system inside that monorepo.

## Example workflow

From the Continuum repo:

```bash
bun run cli -- adapter-install ../your-product-monorepo --id your-product --name "Your Product"
bun run cli -- project-status ../your-product-monorepo
bun run cli -- repo-index-workflow ../your-product-monorepo
bun run cli -- context-export ../your-product-monorepo --task "continue current implementation work"
bun run cli -- handoff-save ../your-product-monorepo --objective "resume in the next chat"
```

Or close a work session in one command:

```bash
bun run cli -- session-close ../your-product-monorepo --objective "resume software development work in the next chat"
```

That will:

```txt
1. Read the project adapter.
2. Index repo artifacts.
3. Compile a handoff from durable memory.
4. Save timestamped Markdown and JSON handoff files.
5. Update docs/handoffs/latest.md and docs/handoffs/latest.json.
```

## New files added

```txt
docs/adr/0011-cli-workflows-and-project-adapter-automation.md
docs/work/work-packets/WP-0009-cli-workflows.md
docs/runbooks/cli-workflows.md
docs/runbooks/push-layer8-to-github.md
examples/cli/software-dev-session.sh
scripts/smoke-test-cli-workflows.sh
templates/project-adapter/.memory/procedures/session-close.yaml
templates/project-adapter/.memory/procedures/context-export.yaml
```

## Push to GitHub

```bash
unzip continuum-memory-layer8.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add cli workflow automation layer"
git push -u origin main
```

## Run locally

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run smoke:api
bun run smoke:cli
```

## Verification note

I verified:

```txt
zip integrity
shell script syntax
CLI workflow files were generated
```

I still could not run the full Bun install/check/smoke pipeline here because Bun and project dependencies are not installed in this environment.

Next is **Layer 9: Admin UI / Memory Browser**.


## Layer 9: Admin UI / Memory Browser

Done. I created **Layer 9: Admin UI / Memory Browser**.

[Download `continuum-memory-layer9.zip`](sandbox:/mnt/data/continuum-memory-layer9.zip)

## Layers remaining

We are now through:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
Layer 6: LLM gateway + provider adapters
Layer 7: Artifact memory + repo/file indexer
Layer 8: CLI workflows + project adapter automation
Layer 9: Admin UI / memory browser
```

Remaining for v1:

```txt
Layer 10: Production hardening + v1 release readiness
```

So **1 layer remains**.

## What Layer 9 adds

New frontend app:

```txt
apps/web/
├── index.html
├── package.json
├── tsconfig.json
├── vite-env.d.ts
└── src/
    ├── main.ts
    └── styles.css
```

New backend admin read endpoints:

```txt
GET /v1/admin/overview
GET /v1/admin/handoffs
GET /v1/admin/policy-decisions
GET /v1/admin/evaluations
GET /v1/admin/llm-audits
GET /v1/admin/repo-index-runs
```

The UI can browse:

```txt
health and overview counts
durable memories
memory candidates
artifacts
handoff packs
policy decisions
memory evaluations
LLM providers
LLM call audits
repo index runs
```

It also includes local tools for:

```txt
building a context pack
compiling a handoff
filtering by project ID
configuring the API URL
```

## New commands

```bash
bun run web:dev
bun run web:build
bun run web:preview
bun run admin:dev
bun run smoke:web
```

## Run locally

```bash
cd continuum-memory
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run web:dev
```

Open:

```txt
http://localhost:5173
```

## Push to GitHub

```bash
unzip continuum-memory-layer9.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add admin ui memory browser"
git push -u origin main
```

## Verification note

I verified:

```txt
zip integrity
admin UI source files exist
admin API endpoints are declared
web scripts are present
shell smoke test passes
```

I could not run the full Bun install/build pipeline here because Bun and project dependencies are not installed in this environment. After unzipping locally, run:

```bash
bun install
bun run check
bun run smoke:api
bun run smoke:cli
bun run smoke:web
bun run web:build
```

Next is **Layer 10: Production hardening + v1 release readiness**.


## Layer 10: Production hardening + v1 release readiness

Done. I created **Layer 10: Production Hardening + v1 Release Readiness**.

[Download `continuum-memory-layer10.zip`](sandbox:/mnt/data/continuum-memory-layer10.zip)

## Layers remaining

**0 layers remain for the planned v1 scaffold.**

We have now completed:

```txt
Layer 0: Foundation scaffold
Layer 1: Durable PostgreSQL store
Layer 2: Memory ingestion
Layer 3: Context retrieval + context pack builder
Layer 4: Handoff compiler
Layer 5: Governance + evaluation
Layer 6: LLM gateway + provider adapters
Layer 7: Artifact memory + repo/file indexer
Layer 8: CLI workflows + project adapter automation
Layer 9: Admin UI / memory browser
Layer 10: Production hardening + v1 release readiness
```

## What Layer 10 adds

New production/readiness endpoints:

```txt
GET /livez
GET /readyz
GET /healthz
GET /version
```

New hardening files:

```txt
SECURITY.md
CHANGELOG.md
VERSION
LICENSE
.dockerignore
renovate.json
.github/dependabot.yml
.github/workflows/security.yml
apps/api/Dockerfile
apps/web/Dockerfile
infra/docker/compose.prod.yaml
```

New scripts:

```txt
scripts/doctor.ts
scripts/verify-release.sh
scripts/wait-for-api.sh
scripts/backup-postgres.sh
scripts/restore-postgres.sh
scripts/create-release-archive.sh
```

New docs:

```txt
docs/adr/0013-production-hardening-and-v1-release-readiness.md
docs/work/work-packets/WP-0010-production-hardening.md
docs/release/v1-readiness-checklist.md
docs/runbooks/release-process.md
docs/runbooks/backup-and-restore.md
docs/runbooks/deployment.md
docs/runbooks/operational-monitoring.md
docs/handoffs/v1-release-handoff.md
```

## New commands

```bash
bun run doctor
bun run release:check
bun run release:archive
bun run backup:postgres
bun run restore:postgres
bun run wait:api
bun run ci:local
```

## Push to GitHub

```bash
unzip continuum-memory-layer10.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add v1 production hardening layer"
git push -u origin main
```

## Final local verification

```bash
cd continuum-memory-github
cp .env.example .env
bun install
bun run doctor
bun run infra:up
bun run db:migrate
bun run dev
```

In another terminal:

```bash
bun run wait:api
curl http://localhost:3030/livez
curl http://localhost:3030/readyz
curl http://localhost:3030/version
bun run release:check
bun run web:build
```

## Verification note

I verified the zip integrity and shell script syntax here. I could not run the full Bun dependency/install/test pipeline in this environment because Bun is not installed here, so run the commands above locally.

At this point, the **v1 scaffold is complete**. The next work should move from “layer generation” into **local verification, fixes from actual Bun output, then v1.1 planning**.


