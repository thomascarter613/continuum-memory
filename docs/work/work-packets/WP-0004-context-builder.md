# WP-0004: Context Builder

## Status

Complete for Layer 3 scaffold.

## Goal

Replace naive context assembly with a context builder that plans, ranks, budgets, cites, and audits memory retrieval.

## Scope

- Add context planning domain schemas.
- Add ranking and evidence schemas.
- Add retrieval audit schemas.
- Add retrieval audit SQL migration.
- Add store methods for retrieval request/result persistence.
- Add `/v1/context/plan` endpoint.
- Replace `/v1/context/build` internals with section-aware ranking.
- Add token-budget enforcement.
- Add citations/evidence metadata to context packs.
- Update SDK and smoke test.

## Acceptance Criteria

- A client can ask for a context plan without retrieving memories.
- A client can build a context pack for a project/task/query.
- Context packs include sections, ranked memories, citations, and token budget metadata.
- Context packs include a retrieval audit id.
- PostgreSQL stores retrieval request/result audit records.
- In-memory store supports the same retrieval audit contract.
- Unpromoted candidates are excluded from context packs by default because context is built from active memories only.

## Out of Scope

- Embeddings.
- pgvector similarity search.
- Qdrant sync.
- Runtime OPA policy enforcement.
- Human review UI.
