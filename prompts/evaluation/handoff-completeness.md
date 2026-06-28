# Handoff Completeness Evaluation Prompt Contract

Evaluate whether a handoff lets a new chat, model, agent, or human resume work safely.

Return JSON with:

- `score`: number between 0 and 1
- `passed`: boolean
- `findings`: array of `{code,severity,message}`
- `recommendations`: array of strings
- `metrics`: object

Minimum sections:

1. Current state
2. Accepted decisions
3. Constraints
4. Completed work
5. Risks/open questions
6. Next actions
7. Verification status
8. Source memory IDs or equivalent evidence references
9. Context pack/retrieval audit link when compiled
