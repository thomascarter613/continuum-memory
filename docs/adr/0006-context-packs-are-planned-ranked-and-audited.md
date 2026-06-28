# ADR-0006: Context packs are planned, ranked, budgeted, and audited

## Status

Accepted.

## Context

Layer 2 could store durable memories and memory candidates, but context building was still too naive. It selected active memories by coarse section names and rendered them directly into a context pack. That approach does not scale because it cannot explain why a memory was included, cannot enforce section-level limits, and cannot produce an audit trail for future evaluation.

Continuum Memory needs context assembly to be explicit and inspectable. A new chat, agent, model, or handoff should receive context that was selected by a plan, ranked against the current task, constrained by token budget, and linked back to evidence.

## Decision

Continuum will build context through this lifecycle:

```txt
incoming task/query
→ context plan
→ active memory retrieval
→ section-aware ranking
→ token budgeting
→ citations/evidence bundle
→ retrieval audit records
→ context pack
```

Layer 3 adds:

- `ContextPlan`
- `ContextRanking`
- `ContextEvidence`
- `ContextRetrievalRequest`
- `ContextRetrievalResult`
- `/v1/context/plan`
- ranked/audited `/v1/context/build`
- `context_retrieval_requests`
- `context_retrieval_results`

## Consequences

Positive:

- Context packs become explainable.
- Retrieval decisions become auditable.
- The system can later evaluate retrieval quality.
- Future embedding/vector retrieval can plug into the same contract.
- Sensitive or low-confidence memories can be down-ranked or excluded.

Negative:

- Context building is more complex than direct memory dumping.
- The first ranker is heuristic and not yet embedding-backed.
- More audit rows are written per context build.

## Alternatives considered

### Keep simple section filters

Rejected because they do not provide enough control, ranking, or explainability.

### Add vector retrieval immediately

Deferred. Vector retrieval should be an index and accelerator, not the canonical design. The system first needs an auditable context contract that vector retrieval can serve later.

### Store only final context packs

Rejected. Storing only the final prompt loses important information about why memories were included.
