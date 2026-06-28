# Runbook: Memory Ingestion

## Purpose

Memory ingestion converts observed text, events, tool results, and artifacts into reviewable memory candidates. Candidates are then promoted into durable memory or rejected with a reason.

## Local workflow

Start the API:

```bash
bun run infra:up
bun run db:migrate
bun run dev
```

Create a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates \
  -H 'content-type: application/json' \
  -d '{
    "candidateType":"decision",
    "namespace":"project:demo/decisions",
    "scope":{"projectId":"demo"},
    "content":"Decision: use explicit memory candidates before durable memory writes.",
    "confidence":0.9,
    "suggestedMemoryType":"decision"
  }'
```

Search candidates:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/search \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","limit":10}'
```

Promote a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/<candidate-id>/promote \
  -H 'content-type: application/json' \
  -d '{}'
```

Reject a candidate:

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/<candidate-id>/reject \
  -H 'content-type: application/json' \
  -d '{"reason":"Not durable enough to remember."}'
```

## Extraction endpoint

Layer 2 includes a deterministic extraction endpoint for local testing. It is not a replacement for governed LLM extraction.

```bash
curl -X POST http://localhost:3030/v1/memory/candidates/extract \
  -H 'content-type: application/json' \
  -d '{
    "namespace":"project:demo/session",
    "projectId":"demo",
    "text":"Going forward, prefer explicit handoff packs. Next action: add policy hooks. Open question: should promotion require approval?"
  }'
```

## Operational notes

- Candidates are not durable recall until promoted.
- Rejected candidates remain auditable.
- Promotion creates a new durable memory record.
- Candidate evidence references should come from source events or artifacts.
- Policy enforcement should be added before auto-promotion is enabled.
