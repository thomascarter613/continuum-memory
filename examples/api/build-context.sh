#!/usr/bin/env bash
set -euo pipefail

curl -sS -X POST http://localhost:3030/v1/context/build \
  -H 'content-type: application/json' \
  -d '{
    "projectId": "continuum-memory",
    "task": "continue implementing context retrieval",
    "query": "ranked audited context pack builder",
    "include": ["project_state", "decisions", "procedures", "recent_episodes"],
    "retrieval": {
      "strategy": "balanced",
      "minScore": 0.18,
      "includeEvidence": true
    },
    "budget": {
      "maxInputTokens": 12000,
      "reserveOutputTokens": 2000,
      "maxMemoriesPerSection": 8
    }
  }' | jq .
