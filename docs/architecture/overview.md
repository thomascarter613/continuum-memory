# Architecture Overview

Continuum Memory has four major paths:

1. **Write path**: interaction events become memory candidates, then durable typed memory records.
2. **Read path**: task intent becomes a context plan, which retrieves and compiles relevant memory.
3. **Handoff path**: project/session state becomes portable handoff artifacts.
4. **Governance path**: policy and evals decide what may be written, read, retained, or forgotten.

## Layer 0 components

```txt
apps/api            Hono API shell
apps/cli            CLI shell
packages/domain     shared TypeScript/Zod schemas
packages/sdk-js     API client shell
infra/migrations    planned PostgreSQL schema
infra/docker        local services
policies            Rego policy stubs
prompts             extraction and handoff prompt templates
templates           repo-local project adapter
```

## Planned canonical stores

- PostgreSQL for canonical memory and events
- pgvector for simple local vector retrieval
- Qdrant for optional high-performance vector index
- MinIO for artifacts
- Valkey for working memory/session state
- Git for project-safe procedural/decision artifacts

## Principle

Vector indexes are not source of truth. They are retrieval accelerators.
