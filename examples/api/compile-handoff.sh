#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3030}"

curl -fsS -X POST "$BASE_URL/v1/handoffs/compile" \
  -H 'content-type: application/json' \
  -d '{
    "projectId": "demo",
    "title": "Demo Compiled Handoff",
    "objective": "Resume implementation of Continuum Memory from the latest durable state.",
    "query": "durable memory context handoff decisions next actions",
    "include": ["project_state", "decisions", "constraints", "procedures", "recent_episodes", "open_tasks", "risks", "verification"],
    "retrieval": {
      "strategy": "handoff",
      "minScore": 0.1,
      "includeEvidence": true
    },
    "manualNextActions": [
      "Review the compiled handoff markdown before starting the next implementation layer."
    ],
    "artifactRefs": [
      "docs/handoffs/latest.md"
    ]
  }'
