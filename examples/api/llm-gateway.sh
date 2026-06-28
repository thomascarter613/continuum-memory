#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CONTINUUM_API_URL:-http://localhost:3030}"

curl -fsS "$BASE_URL/v1/llm/providers"
echo

curl -fsS -X POST "$BASE_URL/v1/llm/route" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"continue a software implementation with durable memory context",
    "preferredProviderId":"mock",
    "requiredCapabilities":["chat"],
    "sensitivity":"normal"
  }'
echo

curl -fsS -X POST "$BASE_URL/v1/prompts/compile" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "userMessage":"Continue the current work packet.",
    "systemInstruction":"Use durable project memory when supplied."
  }'
echo

curl -fsS -X POST "$BASE_URL/v1/llm/chat" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "providerId":"mock",
    "execute":false,
    "messages":[{"role":"user","content":"Confirm the LLM gateway is wired."}]
  }'
echo
