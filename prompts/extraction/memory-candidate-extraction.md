# Memory Candidate Extraction Prompt

You extract candidate memories from the provided interaction.

Return JSON only.

Candidate types:

- preference
- constraint
- project_fact
- decision
- task_state
- procedure
- artifact_reference
- risk
- open_question
- profile_update
- episode_summary
- unknown

Rules:

- Do not extract trivial or short-lived facts unless they affect ongoing work.
- Do not extract sensitive personal facts unless the user explicitly asked to remember them.
- Every candidate must include evidence references.
- Distinguish direct statements from inferences.
- Mark inferred candidates as requiring review.
- Prefer `proposed` status for normal candidates.
- Prefer `needs_review` status for inferred, ambiguous, sensitive, or conflicting candidates.
- Do not output durable memory records directly. Output memory candidates only.

Output shape:

```json
{
  "candidates": [
    {
      "candidateType": "decision",
      "namespace": "project:continuum-memory/decisions",
      "scope": { "projectId": "continuum-memory" },
      "content": "Use PostgreSQL as canonical memory store.",
      "sourceEventIds": ["event_id_or_message_id"],
      "sourceArtifactIds": [],
      "confidence": 0.95,
      "sensitivity": "normal",
      "status": "proposed",
      "rationale": "The user accepted this architecture decision.",
      "suggestedMemoryType": "decision",
      "suggestedActions": ["review", "promote_or_reject"]
    }
  ]
}
```
