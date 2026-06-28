# ADR-0005: Use memory candidates before durable memory writes

## Status

Accepted

## Context

Continuum should not store every observed statement as durable memory. A useful memory system needs a reviewable boundary between raw observations and long-term recall. Without this boundary, the system is likely to preserve trivial facts, stale task notes, sensitive data, or unverified inferences.

Layer 1 added durable memory records, but it did not include an ingestion workflow. Layer 2 introduces memory candidates as the first managed stage between observation and accepted memory.

## Decision

Add `memory_candidates` as a first-class concept with create, search, promote, reject, and heuristic extract APIs.

A memory candidate contains:

- candidate type
- namespace
- scope
- content
- evidence references
- confidence
- sensitivity
- status
- rationale
- suggested durable memory type
- review result

Promotion creates a durable `memory_records` row and marks the candidate as `promoted` with a `promoted_memory_id`. Rejection preserves the candidate as `rejected` with a review reason.

## Consequences

Positive:

- Durable memory writes become more intentional.
- Review and policy hooks have a clear integration point.
- False or trivial memories can be rejected without losing audit evidence.
- Candidate extraction can improve over time without changing the durable memory schema.

Negative:

- The ingestion flow is more complex than direct writes.
- Users or agents need a review step before memory becomes durable.
- Later policy enforcement must decide which candidates can auto-promote.

## Alternatives considered

### Direct memory writes only

Rejected because it has no safe buffer between observation and long-term recall.

### Store raw transcripts and summarize later

Rejected as the only strategy because it delays memory quality control and does not provide a clear review/promotion workflow.

### LLM-only memory extraction in Layer 2

Deferred. Layer 2 uses a deterministic heuristic extractor for local development and API testing. LLM-based extraction should be added after provider routing and policy enforcement exist.
