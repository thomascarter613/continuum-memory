# ADR-0004: Add PostgreSQL-backed durable store

## Status

Accepted

## Context

Layer 0 proved the API shape with process-local in-memory maps. That is useful for a first scaffold, but it violates the core Continuum rule: memory must survive chat sessions, process restarts, model switches, and handoffs.

The system needs a canonical durable store before higher-level memory ingestion, retrieval, policy, or handoff automation can be trustworthy.

## Decision

Add a storage abstraction and provide two implementations:

1. `InMemoryContinuumStore` for tests and throwaway local API shape checks.
2. `PostgresContinuumStore` for durable events, memory records, and handoff packs.

PostgreSQL remains the canonical source of truth. Vector databases and graph databases may be added later as indexes or accelerators, not as the canonical memory store.

## Consequences

Positive:

- Events, memories, and handoffs can survive process restarts.
- The API is no longer coupled to a single storage implementation.
- Future pgvector retrieval can be added without changing the public API.
- Supersession behavior can be enforced transactionally.

Trade-offs:

- Local development now requires Docker or a reachable PostgreSQL instance for durable mode.
- Database migrations become part of the normal development lifecycle.
- Tests need to distinguish durable integration tests from fast in-memory unit tests.

## Alternatives considered

### Keep the in-memory store for another layer

Rejected because durable memory is foundational. Candidate extraction without durable storage would create misleading progress.

### Use Qdrant or another vector database as the first durable store

Rejected because vector stores are retrieval indexes, not canonical audit stores.

### Use SQLite first

Deferred. SQLite may be useful for an ultra-local single-binary mode, but PostgreSQL better matches the desired governance-grade and multi-project roadmap.
