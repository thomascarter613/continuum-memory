#!/usr/bin/env bash
set -euo pipefail

echo "Checking admin UI source files..."
test -f apps/web/index.html
test -f apps/web/src/main.ts
test -f apps/web/src/styles.css

echo "Checking admin endpoints are declared..."
grep -q '/v1/admin/overview' apps/api/src/index.ts
grep -q '/v1/admin/handoffs' apps/api/src/index.ts

echo "Checking package scripts..."
grep -q 'web:dev' package.json
grep -q '@continuum/web' apps/web/package.json

echo "Admin UI smoke checks passed."
