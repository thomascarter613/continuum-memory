# Security Policy

Continuum Memory stores durable context, handoffs, artifacts, and memory records. Treat it as sensitive developer infrastructure.

## Supported version

| Version | Status |
| --- | --- |
| 0.1.x | Initial v1 readiness line |

## Security defaults

- Do not commit `.env`, `.continuum-data/`, database dumps, raw transcripts, embeddings, or private memory exports.
- Use the `mock` LLM provider until an explicit provider is configured.
- Keep raw provider API keys in environment variables, not in provider config records.
- Prefer project-scoped namespaces for memories and artifacts.
- Capture full artifact content only when intentionally enabled.
- Run `bun run release:check` before releases.
- Run `./scripts/backup-postgres.sh` before migrations in important environments.

## Reporting

For now, file private issues directly in the repository owner account. Do not publish secrets or private memory in public issues.

## Production checklist

Before exposing the API beyond localhost:

1. Put the API behind TLS.
2. Add authentication and authorization middleware.
3. Restrict CORS origins.
4. Use non-default database and object-storage credentials.
5. Enable database backups and restore drills.
6. Review retention policy and deletion/tombstone behavior.
7. Configure provider routing policy for sensitive workloads.
