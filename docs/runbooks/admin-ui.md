# Admin UI Runbook

## Start the API

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Start the Admin UI

In another terminal:

```bash
bun run web:dev
```

Open the Vite URL, usually:

```txt
http://localhost:5173
```

## Configure the UI

Set:

```txt
API URL: http://localhost:3030
Project ID: optional project filter
```

The UI stores these values in browser local storage.

## What v1 shows

- Health and overview counts
- Durable memories
- Memory candidates
- Artifact records
- Handoff packs
- Policy decisions
- Memory evaluations
- Provider configs
- LLM call audits
- Repo index runs

## Safety

Layer 9 is intentionally read-mostly. It can call context and handoff compilation endpoints, but it does not delete, forget, or mutate existing memory records from the UI.

Do not expose this UI on a public network until Layer 10 adds production hardening, authentication, authorization, and deployment guidance.
