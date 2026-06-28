# WP-0009: CLI Workflows and Project Adapter Automation

## Goal

Make Continuum usable from a real software monorepo through repeatable CLI workflows.

## Scope

- Install/update project adapters.
- Read `.memory/project.yaml`.
- Report project status.
- Index repository artifacts under project-specific namespaces.
- Export context packs to Markdown/JSON.
- Compile handoffs to Markdown/JSON.
- Close a work session by indexing and saving a latest handoff.

## Acceptance Criteria

- `continuum adapter-install` installs `.memory/`, `AGENTS.md`, and work/handoff docs.
- `continuum project-status` reads adapter identity and Git status.
- `continuum repo-index-workflow` indexes a project using its adapter namespace.
- `continuum context-export` writes a Markdown and JSON context export.
- `continuum handoff-save` writes a Markdown and JSON handoff plus `latest.*` aliases.
- `continuum session-close` indexes the repo and writes the next-session handoff.
