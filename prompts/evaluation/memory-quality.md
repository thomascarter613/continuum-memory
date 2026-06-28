# Memory Quality Evaluation Prompt Contract

Evaluate whether a memory should be trusted for future context assembly.

Return JSON with:

- `score`: number between 0 and 1
- `passed`: boolean
- `findings`: array of `{code,severity,message}`
- `recommendations`: array of strings
- `metrics`: object

Minimum checks:

1. Is the memory specific enough to be useful later?
2. Does it have source event or artifact evidence?
3. Is the confidence aligned with the claim strength?
4. Is sensitivity classified correctly?
5. Does project-scoped memory include project scope?
6. Is the memory stale, superseded, or contradictory?
