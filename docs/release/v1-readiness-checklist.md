# Continuum Memory v1 readiness checklist

## Release identity

- [ ] `VERSION` is correct.
- [ ] `package.json` version matches `VERSION`.
- [ ] `CHANGELOG.md` has a v1 entry.
- [ ] ADRs cover every major architectural decision.
- [ ] Work packets describe every implemented layer.

## Local verification

Run:

```bash
bun install
bun run doctor
bun run release:check
```

Expected result: all checks pass.

## Runtime verification

Run:

```bash
bun run infra:up
bun run db:migrate
bun run dev
bun run wait:api
curl http://localhost:3030/livez
curl http://localhost:3030/readyz
curl http://localhost:3030/version
```

Expected result: `readyz` reports `ok: true`.

## Functional verification

Run:

```bash
bun run smoke:api
bun run smoke:cli
bun run smoke:web
bun run web:build
```

Expected result: all smoke tests pass and the web app builds.

## Data safety

- [ ] `.env` is not committed.
- [ ] `.continuum-data/` is not committed.
- [ ] Database backup script has been tested.
- [ ] Restore script has been tested against a disposable database.
- [ ] Full artifact content capture is disabled by default.

## Deployment safety

Before public exposure:

- [ ] Add authentication.
- [ ] Add authorization by user/project/tenant.
- [ ] Configure TLS.
- [ ] Restrict CORS.
- [ ] Replace default credentials.
- [ ] Store secrets in a secret manager.
- [ ] Add network allowlisting if possible.
- [ ] Review retention and deletion policies.

## Release decision

- [ ] v1 is approved for local-first use.
- [ ] v1 is not approved for public internet exposure without the deployment safety items above.
