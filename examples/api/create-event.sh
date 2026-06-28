#!/usr/bin/env bash
set -euo pipefail

curl -sS -X POST http://localhost:3030/v1/events \
  -H 'content-type: application/json' \
  -d '{
    "eventType": "decision.accepted",
    "actorType": "user",
    "actorId": "local-user",
    "subjectType": "decision",
    "subjectId": "ADR-0002",
    "projectId": "continuum-memory",
    "payload": {
      "decision": "Use PostgreSQL as canonical memory store."
    }
  }' | jq .
