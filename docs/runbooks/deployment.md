# Deployment runbook

## Local development

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Production-like Docker Compose

```bash
export CONTINUUM_POSTGRES_PASSWORD='replace-me'
docker compose -f infra/docker/compose.prod.yaml up --build
```

## Required production additions

The compose file is a production-like starting point, not a complete internet-facing deployment. Add:

1. TLS termination.
2. Authentication and authorization.
3. Restricted CORS origins.
4. Secret manager integration.
5. Non-default database credentials.
6. Backup automation.
7. Log aggregation.
8. Monitoring and alerting on `/readyz`.

## Health endpoints

- `/livez`: process is alive.
- `/readyz`: process, config, and store are ready.
- `/healthz`: store health summary.
- `/version`: release metadata.
