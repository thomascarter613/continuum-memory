# ADR-0011: CLI Workflows and Project Adapter Automation

## Status

Accepted

## Context

Continuum must be usable while developing real software. The API already supports memory, retrieval, handoffs, LLM gateway calls, and artifact indexing, but developers need a repeatable command-line workflow that connects a local monorepo to the external memory control plane.

## Decision

Add workflow-oriented CLI commands for installing project adapters, reading project identity, indexing repository files, exporting context, saving handoffs, and closing sessions.

The CLI reads `.memory/project.yaml` from the target repo and uses that project id and namespace when calling the Continuum API.

## Consequences

- A software project can be attached to Continuum without embedding Continuum itself inside that project.
- The `.memory/` adapter remains Git-safe and project-specific.
- Private memory, database state, indexes, and raw event history remain outside the product repo.
- The CLI becomes the preferred operator surface for local-first software development workflows.
