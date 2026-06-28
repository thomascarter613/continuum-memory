#!/usr/bin/env bash
set -euo pipefail

printf '
== Continuum release verification ==
'

required_paths=(
  "README.md"
  "AGENTS.md"
  "SECURITY.md"
  "CHANGELOG.md"
  "VERSION"
  "apps/api/src/index.ts"
  "apps/api/src/lib/env-validation.ts"
  "apps/api/src/lib/release-info.ts"
  "apps/web/src/main.ts"
  "infra/migrations"
  "docs/release/v1-readiness-checklist.md"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "Missing required path: $path" >&2
    exit 1
  fi
done

echo 'Required files exist.'

bun run format
bun run lint
bun run typecheck
bun run test

echo 'Static checks passed.'

if [[ "${CONTINUUM_SKIP_SMOKE:-0}" != "1" ]]; then
  bun run smoke:api
  bun run smoke:cli
  bun run smoke:web
fi

echo 'Release verification passed.'
