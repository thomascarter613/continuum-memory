# Roadmap

## Layer 0: Foundation Scaffold

Status: complete.

- Repository structure.
- Domain schemas.
- API shell.
- SDK shell.
- CLI shell.
- Docs, ADRs, policies, prompts.
- Project adapter template.

## Layer 1: Durable Store

Status: complete for first scaffold.

- PostgreSQL connection.
- Migration runner.
- Event repository.
- Memory repository.
- Handoff repository.
- Storage interface.
- In-memory test/dev store.
- Smoke test script.

## Layer 2: Memory Ingestion

Status: complete for first scaffold.

- Memory candidate schema.
- Candidate persistence.
- Candidate search.
- Candidate review workflow.
- Candidate-to-memory promotion.
- Candidate rejection with reason.
- Deterministic heuristic extraction endpoint.
- Smoke-test coverage.

## Layer 3: Context Builder

Status: complete for first scaffold.

- Retrieval request/result audit records.
- Context plan schema.
- Section-aware retrieval scaffolding.
- Relevance ranking.
- Token budgeting per section.
- Context pack assembly.
- Citation/evidence bundle.
- Context planning endpoint.
- Audited context build endpoint.

## Layer 4: Handoff Compiler

Status: complete for first scaffold.

- Handoff from ranked context packs.
- Handoff from durable project memory.
- Decision, constraint, procedure, risk, open-question, verification, and next-action buckets.
- Markdown/JSON compile response.
- Source memory IDs.
- Retrieval audit integration.
- SDK compile method.
- Smoke-test coverage.

## Layer 5: Governance and Evaluation

Status: complete for first scaffold.

- Policy decision records.
- Policy checks before memory write, candidate promotion, context retrieval, and handoff export.
- Memory quality evals.
- Handoff completeness scoring.
- Governance/evaluation endpoints.
- Smoke-test coverage.

## Layer 6: LLM Gateway

Status: complete for first scaffold.

- LLM provider schemas.
- Provider configuration persistence.
- LLM call audit persistence.
- Built-in mock, OpenAI-compatible, Ollama, and Anthropic-compatible provider registry.
- Provider routing endpoint.
- Prompt compilation endpoint.
- Mock chat dry-run endpoint.
- Deterministic embedding dry-run endpoint.
- SDK and CLI provider commands.
- Smoke-test coverage.

## Layer 7: Artifact Memory and Repo/File Indexer

Status: next.

- Artifact metadata table.
- File checksum and content chunk tables.
- Repo scanner.
- Include/exclude policy.
- Artifact-to-memory evidence links.
- Initial pgvector/Qdrant sync hooks.

## Layer 8: CLI Workflows and Project Adapter Automation

Status: planned.

- `continuum init` for project adapters.
- `continuum context export`.
- `continuum handoff write`.
- `continuum repo index`.
- Git-safe handoff file writer.
- ChatGPT/Claude/Cursor/Codex export formats.

## Layer 9: Admin UI / Memory Browser

Status: planned.

- Memory browser.
- Candidate review UI.
- Handoff browser.
- Policy decision browser.
- Evaluation dashboard.
- Provider/audit browser.

## Layer 10: Production Hardening and v1 Release Readiness

Status: planned.

- Auth boundary.
- Backup/restore runbooks.
- Migration safety checks.
- CI hardening.
- Docker image publishing.
- Release checklist.
- v1 docs pass.


## Layer 7 Completed

Artifact memory and repository indexing have been added. Remaining v1 layers: CLI workflow automation, admin UI / memory browser, production hardening and release readiness.


## Layer 8

CLI workflow automation has been added. Remaining v1 layers:

- Layer 9: Admin UI / memory browser — complete
- Layer 10: Production hardening + v1 release readiness
