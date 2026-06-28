# WP-0008: Artifact Memory + Repo Indexer

## Goal

Add durable artifact memory so Continuum can index and retrieve repository files,
documents, generated outputs, scripts, schemas, and other development artifacts.

## Scope

- Artifact domain schemas
- PostgreSQL tables for artifacts and repo index runs
- In-memory and PostgreSQL store methods
- Artifact create/read/search APIs
- Local repository indexing API
- SDK and CLI support
- Smoke-test coverage
- Governance stubs

## Acceptance Criteria

- A file/document artifact can be created and retrieved.
- Artifact search supports query, project, namespace, kind, status, and path prefix.
- A repository can be indexed into artifact records.
- Index runs are auditable.
- Full content capture is opt-in.
- Generated indexes exclude `.git`, `node_modules`, build outputs, coverage, and runtime data by default.
