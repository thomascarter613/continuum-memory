# CLI Workflows Runbook

Layer 8 adds the command-line workflows that make Continuum practical for day-to-day software development.

## 1. Start the API

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## 2. Install a project adapter into a product monorepo

From the Continuum repo:

```bash
bun run cli -- adapter-install ../your-product-monorepo --id your-product --name "Your Product"
```

This creates:

```txt
.memory/
AGENTS.md
docs/work/current-state.md
docs/adr/
docs/handoffs/
```

## 3. Check project status

```bash
bun run cli -- project-status ../your-product-monorepo
```

## 4. Index repository artifacts

```bash
bun run cli -- repo-index-workflow ../your-product-monorepo
```

Use full content capture only for reviewed/safe repositories:

```bash
bun run cli -- repo-index-workflow ../your-product-monorepo --capture-content
```

## 5. Export context for a new chat

```bash
bun run cli -- context-export ../your-product-monorepo --task "continue the current implementation work"
```

The command writes Markdown and JSON under `docs/handoffs/` by default.

## 6. Save a handoff

```bash
bun run cli -- handoff-save ../your-product-monorepo --objective "resume tomorrow from the current state"
```

This writes a timestamped handoff and updates:

```txt
docs/handoffs/latest.md
docs/handoffs/latest.json
```

## 7. Close a session

```bash
bun run cli -- session-close ../your-product-monorepo --objective "resume implementation in the next chat"
```

This indexes the repo and saves a handoff in one workflow.
