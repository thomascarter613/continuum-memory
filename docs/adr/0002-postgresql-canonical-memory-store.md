# ADR-0002: Use PostgreSQL as the Canonical Memory Store

## Status

Accepted

## Context

The system needs durable, auditable, transactional memory with support for structured records, JSON metadata, evidence links, and future vector search.

## Decision

Use PostgreSQL as the canonical memory store. Use pgvector and Qdrant as retrieval indexes, not source of truth.

## Consequences

- Strong local-first development path.
- Easy migration to Supabase or managed PostgreSQL.
- Good fit for auditability and governance.
- Requires disciplined schema design and migrations.
