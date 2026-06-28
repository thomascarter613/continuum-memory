# Governance and Evaluation Runbook

Layer 5 adds explicit governance and evals.

## Check policy

```bash
curl -fsS -X POST http://localhost:3030/v1/policy/check \
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
```

## Verify evidence enforcement

This should be denied:

```bash
curl -i -X POST http://localhost:3030/v1/memory \
  -H 'content-type: application/json' \
  -d '{
    "memoryType":"semantic",
    "namespace":"project:demo/facts",
    "scope":{"projectId":"demo"},
    "content":"Unsupported memory with no evidence."
  }'
```

## Evaluate memory quality

```bash
curl -fsS -X POST http://localhost:3030/v1/evals/memory \
  -H 'content-type: application/json' \
  -d '{"memoryId":"<memory-id>"}'
```

## Evaluate handoff completeness

```bash
curl -fsS -X POST http://localhost:3030/v1/evals/handoff \
  -H 'content-type: application/json' \
  -d '{"handoffId":"<handoff-id>"}'
```

## Governance rule of thumb

- Ordinary memory with evidence: allow.
- Durable memory with no evidence: deny.
- Sensitive memory without explicit allowance: review.
- Secret-like payloads: deny.
- Handoff exports: allowed only with obligations to preserve evidence and avoid raw transcripts.
