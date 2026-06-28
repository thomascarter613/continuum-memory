# Agent Instructions

This repository implements Continuum Memory, a model-agnostic persistent memory and context control plane.

## Operating doctrine

- Treat chats as disposable and memory as durable.
- Do not store raw private data in Git.
- Every durable memory must have evidence.
- Vector stores are indexes, not source of truth.
- PostgreSQL is the planned canonical store.
- Handoffs are typed artifacts, not casual summaries.
- Project repos get a thin `.memory/` adapter; this repo contains the reusable memory platform.

## Before changing code

1. Read `docs/work/current-state.md`.
2. Read `docs/adr/`.
3. Read the relevant package or app README if present.
4. Prefer small, verifiable changes.
5. Update docs, ADRs, and current-state when decisions change.

## Verification commands

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run check
```

## Memory-specific rules

- Do not commit raw chat transcripts.
- Do not commit `.continuum-data/` or database volumes.
- Do not commit embeddings, vector indexes, secrets, or private user memory.
- Commit project-safe docs, schemas, policy, prompts, ADRs, and handoff templates.


## Production readiness rules

Before marking work complete for v1 readiness:

1. Run `bun run doctor`.
2. Run `bun run release:check`.
3. Confirm `/readyz` reports `ok: true` in a local runtime.
4. Update `CHANGELOG.md` for release-relevant changes.
5. Do not commit `.env`, `.continuum-data/`, backups, raw private memory, or provider secrets.
