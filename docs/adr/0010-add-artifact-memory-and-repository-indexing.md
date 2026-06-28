# ADR-0010: Add artifact memory and repository indexing

## Status

Accepted

## Context

Software development memory cannot be limited to chat transcripts, semantic
facts, and handoffs. The system also needs durable references to files,
repositories, generated outputs, command logs, schemas, docs, and checksums.

Git remains the canonical source of repository content, but Continuum needs an
artifact memory index so context builders and handoff compilers can refer to
project artifacts without re-scanning everything manually.

## Decision

Add first-class artifact memory with:

- `artifact_records`
- `repo_index_runs`
- artifact domain schemas
- artifact create/read/search APIs
- local repository indexing API
- artifact SDK and CLI commands
- policy stubs for artifact indexing

Artifact memory stores metadata, checksums, previews, optional content text, and
links to events/memories. Full content capture is opt-in.

## Consequences

Positive:

- Context packs can cite files and generated outputs.
- Handoffs can refer to artifact IDs and checksums.
- Repository scans become auditable.
- The system can understand a software project beyond conversation memory.

Tradeoffs:

- Local repository indexing must avoid secrets and large/generated folders.
- Full content capture can create privacy and retention concerns.
- Git remains canonical; artifact memory is an index, not source control.
