# WP-0003: Memory Ingestion

## Status

Completed in Layer 2 scaffold.

## Goal

Add a first ingestion workflow that turns observations into reviewable memory candidates before those candidates become durable memory records.

## Scope

Included:

- `memory_candidates` database table
- candidate domain schemas
- candidate storage interface methods
- in-memory candidate store implementation
- PostgreSQL candidate store implementation
- candidate mapper
- candidate create/search/read APIs
- candidate promotion API
- candidate rejection API
- deterministic heuristic extraction API
- SDK methods
- smoke-test coverage
- ADR and runbook updates

Deferred:

- LLM-based extraction
- user approval UI
- OPA policy enforcement
- embedding generation
- graph writes

## Acceptance criteria

- A client can create a memory candidate.
- A client can search memory candidates by query, project, namespace, type, and status.
- A client can promote a candidate into a durable memory record.
- Promotion preserves evidence references.
- Promotion updates candidate status to `promoted`.
- A client can reject a candidate with a reason.
- Rejection updates candidate status to `rejected`.
- The API can extract simple candidates from text for local testing.
- The smoke test exercises the full candidate lifecycle.
