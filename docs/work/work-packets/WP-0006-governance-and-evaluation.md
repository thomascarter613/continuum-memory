# WP-0006: Governance and Evaluation

## Objective

Add first-class governance and quality evaluation to the durable memory spine.

## Scope

- Add policy decision schemas.
- Add memory evaluation schemas.
- Persist policy decisions and evaluations.
- Add deterministic policy checks.
- Add memory-quality evaluation.
- Add handoff-completeness evaluation.
- Add API, SDK, CLI, smoke-test, runbook, and ADR coverage.

## Acceptance Criteria

- `POST /v1/policy/check` stores and returns an allow/deny/review decision.
- `POST /v1/memory` denies memory writes without evidence.
- Candidate promotion is policy-checked before durable memory creation.
- Context building and handoff compilation create policy decisions.
- Memory writes create quality evaluations.
- Handoff creation/compilation creates completeness evaluations.
- `POST /v1/evals/memory` can evaluate an existing memory or candidate.
- `POST /v1/evals/handoff` can evaluate an existing handoff.
- Smoke test covers policy and evaluation endpoints.
