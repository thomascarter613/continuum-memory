#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CONTINUUM_API_BASE_URL:-http://localhost:3030}"
TIMEOUT_SECONDS="${CONTINUUM_WAIT_TIMEOUT_SECONDS:-60}"
DEADLINE=$((SECONDS + TIMEOUT_SECONDS))

printf 'Waiting for Continuum API at %s/readyz
' "$BASE_URL"
while (( SECONDS < DEADLINE )); do
  if curl -fsS "$BASE_URL/readyz" >/dev/null 2>&1; then
    echo 'API is ready.'
    exit 0
  fi
  sleep 2
done

echo "API did not become ready within ${TIMEOUT_SECONDS}s." >&2
curl -fsS "$BASE_URL/healthz" || true
exit 1
