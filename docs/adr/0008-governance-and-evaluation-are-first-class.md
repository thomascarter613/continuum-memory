# ADR-0008: Governance and Evaluation Are First-Class

## Status

Accepted

## Context

Persistent memory improves continuity, but it also creates risk. A system that remembers across chats can preserve stale, sensitive, unsupported, or contradictory information unless memory writes, retrieval, and handoff exports are governed and evaluated.

## Decision

Continuum treats policy decisions and quality evaluations as first-class persistent records.

Layer 5 adds:

- deterministic policy checks before durable memory writes, candidate promotion, context retrieval, and handoff export;
- `policy_decisions` as an auditable store of allow/deny/review outcomes;
- `memory_evaluations` as an auditable store of quality and completeness scoring;
- memory-quality evaluation for records and candidates;
- handoff-completeness evaluation for portable state-transfer artifacts;
- policy and evaluation endpoints for explicit inspection.

## Consequences

Positive:

- Memory writes now require evidence.
- Secret-like payloads are denied by default.
- Sensitive memory is routed toward review unless explicitly allowed.
- Handoffs are scored for resumability.
- Governance behavior can be regression-tested.

Trade-offs:

- The initial policy engine is deterministic and intentionally conservative.
- Future layers should integrate OPA execution, user consent workflows, retention jobs, and richer contradiction detection.
