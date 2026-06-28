# WP-0010: Admin UI / Memory Browser

## Goal
Create the first human-facing browser for Continuum memory/control-plane state.

## Scope
- Add `apps/web` Vite-based frontend.
- Add read-only admin list endpoints.
- Show overview metrics, memory records, candidates, artifacts, handoffs, policy decisions, evaluations, provider configs, LLM audits, and repo index runs.
- Add manual context-build and handoff-compile tools.

## Acceptance Criteria
- `bun run web:dev` starts the admin UI.
- `bun run web:build` builds the static UI bundle.
- UI can connect to `http://localhost:3030`.
- UI can filter by project ID.
- UI does not require paid LLM APIs.
- UI does not perform destructive memory operations.
