# Operational monitoring

## Minimal checks

Monitor these endpoints:

```txt
GET /livez
GET /readyz
GET /healthz
GET /version
```

## Signals to watch

- Store readiness failures.
- Increasing policy denials.
- Failed LLM call audits.
- Handoff completeness scores trending down.
- Stale or superseded memories appearing in context packs.
- Repo index runs failing or indexing too many files.

## First alerts

For v1, start with simple checks:

- API readiness is down for more than 2 minutes.
- PostgreSQL is unavailable.
- Smoke tests fail on main.
- Backups have not been generated recently.
