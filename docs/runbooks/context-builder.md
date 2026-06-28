# Context Builder Runbook

## Purpose

Use this runbook to plan and build model-ready context packs from durable memory.

## Start the API

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Plan context

```bash
curl -sS -X POST http://localhost:3030/v1/context/plan \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue architecture implementation",
    "query":"PostgreSQL canonical memory architecture",
    "include":["decisions","project_state"],
    "retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true}
  }' | jq .
```

## Build context

```bash
curl -sS -X POST http://localhost:3030/v1/context/build \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue architecture implementation",
    "query":"PostgreSQL canonical memory architecture",
    "include":["decisions","project_state"],
    "retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true},
    "budget":{"maxInputTokens":12000,"reserveOutputTokens":2000,"maxMemoriesPerSection":5}
  }' | jq .
```

## Read the result

Important fields:

```txt
retrievalAuditId              durable id for this retrieval event
plan                          generated context plan
sections[].rankedMemories     included memories and scores
sections[].content            prompt-ready section content
citations                     evidence metadata by memory
tokenBudget                   input budget, estimated usage, and remaining tokens
```

## Current scoring dimensions

- section fit
- task/query term overlap
- memory confidence
- memory recency
- source evidence presence
- project scope match
- sensitivity penalty

## Notes

The Layer 3 ranker is deterministic and heuristic. Later layers should add embedding-backed retrieval and learned reranking behind the same context pack contract.
