# Handoff Compiler Runbook

## Purpose

Use the handoff compiler whenever work crosses a boundary:

- ending a chat session;
- switching to a new chat;
- switching model/provider;
- handing work to another agent or human;
- pausing a software task and resuming later.

## Start the API

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Compile a handoff

```bash
curl -fsS -X POST "http://localhost:3030/v1/handoffs/compile" \
  -H 'content-type: application/json' \
  -d '{
    "projectId": "demo",
    "title": "Demo Compiled Handoff",
    "objective": "Resume implementation from the latest durable memory state.",
    "query": "decisions constraints next actions verification",
    "retrieval": {
      "strategy": "handoff",
      "minScore": 0.1,
      "includeEvidence": true
    }
  }'
```

## Save Markdown for a repo-local handoff

```bash
mkdir -p docs/handoffs
curl -fsS -X POST "http://localhost:3030/v1/handoffs/compile" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","objective":"Resume the project from durable memory."}' \
  | jq -r '.markdown' > docs/handoffs/latest.md
```

## What to check

The response should include:

- `handoff.id`
- `contextPack.id`
- `sourceMemoryIds`
- `markdown`
- `json`

A useful handoff should have at least one source memory ID. If none are present, add or promote project memories before compiling the handoff.
