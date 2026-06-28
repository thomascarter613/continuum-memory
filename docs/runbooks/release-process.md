# Release process

## 1. Prepare

```bash
git status
bun install
bun run doctor
```

## 2. Verify

```bash
bun run release:check
```

To skip smoke tests when the API is intentionally offline:

```bash
CONTINUUM_SKIP_SMOKE=1 bun run release:check
```

## 3. Build web UI

```bash
bun run web:build
```

## 4. Create archive

```bash
bun run release:archive
```

## 5. Tag

```bash
git tag v$(cat VERSION)
git push origin main --tags
```

## 6. Publish notes

Use `CHANGELOG.md`, the v1 readiness checklist, and the latest handoff as release notes inputs.
