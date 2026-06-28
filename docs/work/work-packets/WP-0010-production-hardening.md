# WP-0010: Production hardening and v1 release readiness

## Objective

Make Continuum Memory suitable for a v1 readiness milestone by adding operational endpoints, release checks, security posture documentation, backup/restore scripts, deployment examples, and release checklists.

## Scope

- Health/readiness/version endpoints.
- Runtime config validation.
- Release verification script.
- Dockerfiles and production compose example.
- Security and CI workflows.
- Backup and restore scripts.
- v1 release docs.

## Acceptance criteria

- `bun run doctor` verifies required release files.
- `bun run release:check` runs format, lint, typecheck, tests, and smoke tests.
- `/readyz` returns non-200 when storage/config readiness fails.
- `VERSION` and `package.json` versions match.
- Backup and restore runbooks exist.
- Security policy exists.
