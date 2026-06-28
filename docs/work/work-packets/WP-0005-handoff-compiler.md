# WP-0005: Handoff Compiler

## Objective

Add a deterministic compiler that turns durable memory and ranked context retrieval into portable handoff artifacts.

## Scope

Included:

- `HandoffCompileRequestSchema` and compile response contract.
- `POST /v1/handoffs/compile`.
- Deterministic handoff compiler library.
- Richer handoff payload fields.
- Markdown rendering with source memory IDs.
- SDK support for `compileHandoff`.
- Smoke-test coverage for the compile endpoint.
- Runbook, prompt stub, and policy stub.

Excluded for this layer:

- LLM-assisted narrative summarization.
- Git file writing from the API.
- Human approval workflows.
- Artifact object storage.

## Acceptance criteria

- A compiled handoff can be generated from active memories for a project.
- The compiled handoff includes a persisted `handoff.id`.
- The compile response includes `contextPack`, `sourceMemoryIds`, Markdown, and JSON.
- Retrieval used for handoff compilation is audited.
- The smoke test reaches the compile endpoint and verifies that at least one source memory was included.
