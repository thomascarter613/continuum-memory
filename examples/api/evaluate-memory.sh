#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${CONTINUUM_API_URL:-http://localhost:3030}"
MEMORY_ID="${1:?usage: evaluate-memory.sh <memory-id>}"

curl -fsS -X POST "$BASE_URL/v1/evals/memory" \
  -H 'content-type: application/json' \
  -d "{\"memoryId\":\"$MEMORY_ID\"}"
