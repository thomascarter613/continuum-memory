#!/usr/bin/env bash
set -euo pipefail

curl -sS -X POST http://localhost:3030/v1/memory \
  -H 'content-type: application/json' \
  -d '{
    "memoryType": "decision",
    "namespace": "project/continuum-memory/decisions",
    "scope": {"projectId": "continuum-memory"},
    "content": "Use PostgreSQL as the canonical memory store and treat vector databases as indexes.",
    "sourceEventIds": [],
    "confidence": 0.95,
    "sensitivity": "normal",
    "status": "active"
  }' | jq .
