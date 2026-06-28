# ADR-0001: Use a Separate Memory System with Repo-Local Adapters

## Status

Accepted

## Context

The memory system must support many projects, many chats, many models, and private cross-project developer memory. Embedding the full memory runtime inside every product monorepo would duplicate infrastructure and risk committing private state.

## Decision

Build Continuum Memory as a separate reusable system. Each software project should include only a thin `.memory/` adapter, `AGENTS.md`, ADRs, current-state docs, work packets, and handoffs.

## Consequences

- The memory runtime can serve multiple projects.
- Product repos remain clean and versionable.
- Private runtime data stays outside Git.
- Project-safe context remains committed near the code.
