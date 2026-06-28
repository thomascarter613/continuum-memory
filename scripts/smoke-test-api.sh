#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CONTINUUM_API_URL:-http://localhost:3030}"
EVENT_ID="$(bun -e 'console.log(crypto.randomUUID())')"
MEMORY_ID="$(bun -e 'console.log(crypto.randomUUID())')"
CANDIDATE_ID="$(bun -e 'console.log(crypto.randomUUID())')"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

jq_required() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required for the Layer 6 smoke test." >&2
    exit 1
  fi
}

jq_required

echo "Checking health..."
curl -fsS "$BASE_URL/healthz"
echo



echo "Listing LLM providers..."
curl -fsS "$BASE_URL/v1/llm/providers" > "$TMP_DIR/providers.json"
cat "$TMP_DIR/providers.json"
echo

PROVIDER_COUNT="$(jq -r '.providers | length' "$TMP_DIR/providers.json")"
if [[ "$PROVIDER_COUNT" -lt 1 ]]; then
  echo "Expected at least one LLM provider." >&2
  exit 1
fi

echo "Routing an LLM task..."
curl -fsS -X POST "$BASE_URL/v1/llm/route" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"compile durable context for a software implementation session",
    "preferredProviderId":"mock",
    "requiredCapabilities":["chat"],
    "sensitivity":"normal"
  }' > "$TMP_DIR/llm-route.json"
cat "$TMP_DIR/llm-route.json"
echo

LLM_ROUTE_AUDIT_ID="$(jq -r '.auditId' "$TMP_DIR/llm-route.json")"
if [[ "$LLM_ROUTE_AUDIT_ID" == "null" || -z "$LLM_ROUTE_AUDIT_ID" ]]; then
  echo "Expected LLM route audit id." >&2
  exit 1
fi

echo "Compiling a provider-neutral prompt..."
curl -fsS -X POST "$BASE_URL/v1/prompts/compile" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "userMessage":"Continue the current work packet.",
    "systemInstruction":"Use Continuum durable memory context when supplied."
  }' > "$TMP_DIR/prompt-compile.json"
cat "$TMP_DIR/prompt-compile.json"
echo

echo "Running mock LLM chat dry-run..."
curl -fsS -X POST "$BASE_URL/v1/llm/chat" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "providerId":"mock",
    "execute":false,
    "messages":[{"role":"user","content":"Confirm the LLM gateway is wired."}]
  }' > "$TMP_DIR/llm-chat.json"
cat "$TMP_DIR/llm-chat.json"
echo

LLM_CHAT_AUDIT_ID="$(jq -r '.auditId' "$TMP_DIR/llm-chat.json")"
if [[ "$LLM_CHAT_AUDIT_ID" == "null" || -z "$LLM_CHAT_AUDIT_ID" ]]; then
  echo "Expected LLM chat audit id." >&2
  exit 1
fi

echo "Reading LLM chat audit $LLM_CHAT_AUDIT_ID..."
curl -fsS "$BASE_URL/v1/llm/audits/$LLM_CHAT_AUDIT_ID"
echo

echo "Running deterministic embedding dry-run..."
curl -fsS -X POST "$BASE_URL/v1/llm/embeddings" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "providerId":"mock",
    "execute":false,
    "input":["Continuum durable memory vector smoke test"]
  }' > "$TMP_DIR/llm-embeddings.json"
cat "$TMP_DIR/llm-embeddings.json"
echo

VECTOR_COUNT="$(jq -r '.vectors | length' "$TMP_DIR/llm-embeddings.json")"
if [[ "$VECTOR_COUNT" -lt 1 ]]; then
  echo "Expected at least one embedding vector." >&2
  exit 1
fi

echo "Creating event $EVENT_ID..."
curl -fsS -X POST "$BASE_URL/v1/events" \
  -H 'content-type: application/json' \
  -d "{
    \"id\":\"$EVENT_ID\",
    \"eventType\":\"message.received\",
    \"actorType\":\"user\",
    \"actorId\":\"local-dev\",
    \"projectId\":\"demo\",
    \"payload\":{\"text\":\"Use PostgreSQL as canonical memory store.\"}
  }"
echo

echo "Checking policy for memory write..."
curl -fsS -X POST "$BASE_URL/v1/policy/check" \
  -H 'content-type: application/json' \
  -d '{
    "action":"memory.write",
    "projectId":"demo",
    "namespace":"project:demo/decisions",
    "memoryType":"decision",
    "sensitivity":"normal",
    "evidenceCount":1,
    "payload":{"content":"Use PostgreSQL as canonical memory store."}
  }'
echo

echo "Creating memory $MEMORY_ID..."
curl -fsS -X POST "$BASE_URL/v1/memory" \
  -H 'content-type: application/json' \
  -d "{
    \"id\":\"$MEMORY_ID\",
    \"memoryType\":\"decision\",
    \"namespace\":\"project:demo/decisions\",
    \"scope\":{\"projectId\":\"demo\"},
    \"content\":\"Use PostgreSQL as the canonical memory store and treat vector stores as indexes.\",
    \"sourceEventIds\":[\"$EVENT_ID\"],
    \"confidence\":0.95
  }"
echo

echo "Creating candidate $CANDIDATE_ID..."
curl -fsS -X POST "$BASE_URL/v1/memory/candidates" \
  -H 'content-type: application/json' \
  -d "{
    \"id\":\"$CANDIDATE_ID\",
    \"candidateType\":\"decision\",
    \"namespace\":\"project:demo/decisions\",
    \"scope\":{\"projectId\":\"demo\"},
    \"content\":\"Decision: memory candidates must be reviewed before promotion.\",
    \"sourceEventIds\":[\"$EVENT_ID\"],
    \"confidence\":0.9,
    \"suggestedMemoryType\":\"decision\",
    \"suggestedActions\":[\"review\",\"promote_or_reject\"]
  }"
echo

echo "Promoting candidate $CANDIDATE_ID..."
curl -fsS -X POST "$BASE_URL/v1/memory/candidates/$CANDIDATE_ID/promote" \
  -H 'content-type: application/json' \
  -d '{}' > "$TMP_DIR/promoted.json"
cat "$TMP_DIR/promoted.json"
echo

echo "Extracting candidates from text..."
curl -fsS -X POST "$BASE_URL/v1/memory/candidates/extract" \
  -H 'content-type: application/json' \
  -d "{
    \"namespace\":\"project:demo/session\",
    \"projectId\":\"demo\",
    \"sourceEventIds\":[\"$EVENT_ID\"],
    \"text\":\"Going forward, prefer explicit handoff packs at session boundaries. Next action: add policy hooks for candidate review. Open question: should promotion require human approval?\"
  }" > "$TMP_DIR/extracted.json"
cat "$TMP_DIR/extracted.json"
echo

REJECT_ID="$(jq -r '.candidates[-1].id' "$TMP_DIR/extracted.json")"
echo "Rejecting extracted candidate $REJECT_ID..."
curl -fsS -X POST "$BASE_URL/v1/memory/candidates/$REJECT_ID/reject" \
  -H 'content-type: application/json' \
  -d '{"reason":"Smoke test rejection path."}'
echo

echo "Reading memory $MEMORY_ID..."
curl -fsS "$BASE_URL/v1/memory/$MEMORY_ID"
echo

echo "Evaluating memory quality..."
curl -fsS -X POST "$BASE_URL/v1/evals/memory" \
  -H 'content-type: application/json' \
  -d "{\"memoryId\":\"$MEMORY_ID\"}"
echo

echo "Searching memory..."
curl -fsS -X POST "$BASE_URL/v1/memory/search" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","query":"PostgreSQL","limit":10}'
echo

echo "Searching candidates..."
curl -fsS -X POST "$BASE_URL/v1/memory/candidates/search" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","limit":10}'
echo

echo "Planning context..."
curl -fsS -X POST "$BASE_URL/v1/context/plan" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","task":"continue architecture implementation","query":"PostgreSQL canonical memory architecture","include":["decisions","project_state"],"retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true}}' > "$TMP_DIR/context-plan.json"
cat "$TMP_DIR/context-plan.json"
echo

echo "Building ranked/audited context..."
curl -fsS -X POST "$BASE_URL/v1/context/build" \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","task":"continue architecture implementation","query":"PostgreSQL canonical memory architecture","include":["decisions","project_state"],"retrieval":{"strategy":"precision","minScore":0.1,"includeEvidence":true},"budget":{"maxInputTokens":12000,"reserveOutputTokens":2000,"maxMemoriesPerSection":5}}' > "$TMP_DIR/context-pack.json"
cat "$TMP_DIR/context-pack.json"
echo

AUDIT_ID="$(jq -r '.retrievalAuditId' "$TMP_DIR/context-pack.json")"
if [[ "$AUDIT_ID" == "null" || -z "$AUDIT_ID" ]]; then
  echo "Expected retrievalAuditId in context pack." >&2
  exit 1
fi

echo "Context retrieval audit id: $AUDIT_ID"

echo "Creating handoff..."
curl -fsS -X POST "$BASE_URL/v1/handoffs" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "title":"Demo Handoff",
    "objective":"Resume durable memory implementation.",
    "currentState":"Layer 6 LLM gateway support is being verified after Layer 5 governance and evaluation.",
    "acceptedDecisions":["Use PostgreSQL as canonical store.","Review candidates before promotion."],
    "nextActions":["Add policy hooks for memory candidate review, retrieval authorization, and handoff export."]
  }'
echo

printf '\nCompiling handoff from durable memory and context retrieval...\n'
curl -fsS -X POST "$BASE_URL/v1/handoffs/compile" \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "title":"Demo Compiled Handoff",
    "objective":"Resume durable memory implementation from the latest compiled handoff.",
    "query":"PostgreSQL canonical memory candidate review handoff next actions",
    "include":["project_state","decisions","constraints","procedures","recent_episodes","open_tasks","risks","verification"],
    "retrieval":{"strategy":"handoff","minScore":0.1,"includeEvidence":true},
    "manualNextActions":["Use POST /v1/handoffs/compile when crossing chat/session boundaries."],
    "manualVerification":["Layer 6 smoke test reached compiled handoff endpoint and LLM gateway endpoints."],
    "artifactRefs":["docs/handoffs/latest.md"]
  }' > "$TMP_DIR/compiled-handoff.json"
cat "$TMP_DIR/compiled-handoff.json"
echo

COMPILED_HANDOFF_ID="$(jq -r '.handoff.id' "$TMP_DIR/compiled-handoff.json")"
if [[ "$COMPILED_HANDOFF_ID" == "null" || -z "$COMPILED_HANDOFF_ID" ]]; then
  echo "Expected compiled handoff id." >&2
  exit 1
fi

SOURCE_COUNT="$(jq -r '.sourceMemoryIds | length' "$TMP_DIR/compiled-handoff.json")"
if [[ "$SOURCE_COUNT" -lt 1 ]]; then
  echo "Expected compiled handoff to cite at least one source memory." >&2
  exit 1
fi

printf '\nCompiled handoff id: %s\n' "$COMPILED_HANDOFF_ID"

echo "Evaluating compiled handoff completeness..."
curl -fsS -X POST "$BASE_URL/v1/evals/handoff" \
  -H 'content-type: application/json' \
  -d "{\"handoffId\":\"$COMPILED_HANDOFF_ID\"}"
echo

printf '\nSmoke test completed successfully.\n'
