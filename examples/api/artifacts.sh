#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CONTINUUM_API_URL:-http://localhost:3030}"

curl -sS -X POST "$BASE_URL/v1/artifacts" \
  -H 'content-type: application/json' \
  -d '{
    "artifactKind":"documentation",
    "namespace":"demo/artifacts",
    "projectId":"demo",
    "uri":"file://README.md",
    "path":"README.md",
    "name":"README.md",
    "mimeType":"text/markdown",
    "contentPreview":"Continuum Memory README",
    "metadata":{"source":"example"}
  }' | jq .

curl -sS -X POST "$BASE_URL/v1/artifacts/search" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","query":"README","limit":10}' | jq .

curl -sS -X POST "$BASE_URL/v1/artifacts/index-repo" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "namespace":"demo/artifacts",
    "rootPath":".",
    "maxFiles":200,
    "maxBytesPerFile":80000,
    "captureContent":false,
    "dryRun":true
  }' | jq .
