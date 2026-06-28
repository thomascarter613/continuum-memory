# ADR-0012: Add Admin UI / Memory Browser

## Status
Accepted

## Context
Continuum now stores durable memory, candidates, handoffs, artifacts, policy decisions, evaluations, provider configs, and LLM call audits. API and CLI access are enough for automation, but not enough for routine inspection, debugging, and trust-building.

## Decision
Add a lightweight `apps/web` admin UI that consumes the public API and new read-only admin endpoints. The v1 admin UI is intentionally non-destructive by default. It browses and searches memory state, shows governance and evaluation records, surfaces provider/audit activity, and exposes manual context/handoff compilation tools.

## Consequences
- Operators can inspect what Continuum remembers and why.
- Memory debugging becomes possible without direct database access.
- The UI creates a clear surface for future review/approval flows.
- v1 still needs authentication and authorization before network exposure.
