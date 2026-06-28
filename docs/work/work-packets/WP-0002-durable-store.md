# WP-0002: Durable Store

## Status

Complete for Layer 1 scaffold.

## Objective

Replace Layer 0's process-local API maps with a storage interface and a PostgreSQL-backed durable implementation.

## Scope

Included:

- Storage interface.
- In-memory store implementation.
- PostgreSQL store implementation.
- Migration runner.
- SQL migration indexes.
- Durable persistence for events, memory records, and handoff packs.
- API route refactor to use the storage interface.
- Smoke test script.

Not included yet:

- Embeddings.
- pgvector semantic retrieval.
- Qdrant synchronization.
- OPA policy enforcement.
- LLM memory extraction.

## Acceptance criteria

- `bun run infra:up` starts local dependencies.
- `bun run db:migrate` applies migrations.
- `bun run dev` starts the API with `postgres` store.
- `POST /v1/events` persists events.
- `POST /v1/memory` persists memory records.
- `GET /v1/memory/:id` reads durable records.
- `POST /v1/memory/search` searches durable records.
- `POST /v1/handoffs` persists handoff packs.
- `GET /v1/handoffs/:id` reads durable handoff packs.

## Next work packet

WP-0003 should implement the memory candidate extraction pipeline:

- candidate extraction prompt contract
- candidate schema
- ingestion endpoint
- policy pre-check stub
- candidate-to-memory promotion flow
