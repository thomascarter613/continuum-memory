# Runbook: Local PostgreSQL Durable Store

## Purpose

Run Continuum Memory locally with durable PostgreSQL storage.

## Commands

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Verify

```bash
curl http://localhost:3030/healthz
```

Expected store kind:

```json
"kind": "postgres"
```

Run the API smoke test:

```bash
bun run smoke:api
```

## Reset local data

This removes local PostgreSQL/Qdrant/Valkey/MinIO data because the compose volumes are under `.continuum-data/`.

```bash
bun run infra:down
rm -rf .continuum-data
bun run infra:up
bun run db:migrate
```

## Temporary in-memory mode

```bash
CONTINUUM_STORE=memory bun run dev
```

Use this only for throwaway testing. It does not persist memory across restarts.
