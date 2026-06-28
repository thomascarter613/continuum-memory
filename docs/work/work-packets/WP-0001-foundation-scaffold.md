# WP-0001: Foundation Scaffold

## Objective

Create the initial repository structure and working API shell for Continuum Memory.

## Scope

Included:

- Bun workspace
- TypeScript configuration
- Hono API
- domain schemas
- SDK shell
- CLI shell
- docs and ADRs
- policy stubs
- prompt templates
- project adapter template

Excluded:

- production persistence
- authentication
- complete retrieval
- real memory candidate extraction
- web UI

## Verification

```bash
bun install
bun run check
bun run dev
curl http://localhost:3030/healthz
```
