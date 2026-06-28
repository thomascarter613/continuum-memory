#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${CONTINUUM_API_URL:-http://localhost:3030}"

curl -fsS -X POST "$BASE_URL/v1/policy/check" \
  -H 'content-type: application/json' \
  -d '{
    "action":"context.retrieve",
    "projectId":"demo",
    "purpose":"continue implementation with governed retrieval",
    "sensitivity":"normal",
    "payload":{"query":"governance evaluation memory"}
  }'
