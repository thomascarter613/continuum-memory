# ADR-0007: Compiled handoffs are portable state artifacts

## Status

Accepted

## Context

Continuum Memory exists to let work survive chat/session/model boundaries. Earlier layers made memory durable, introduced candidate review, and added ranked context packs. A handoff cannot be a simple human-written note if it is expected to carry state across chats reliably. It needs to be compiled from durable memories and include evidence, source memory identifiers, next actions, constraints, and a machine-readable payload.

## Decision

Add a first-class handoff compiler exposed through `POST /v1/handoffs/compile`.

The compiler will:

- build a handoff-oriented context pack;
- audit retrieval through the context retrieval tables;
- bucket retrieved memories into decisions, constraints, completed work, procedures, risks, open questions, verification status, and next actions;
- render a Markdown handoff suitable for pasting into a new chat;
- persist the handoff through the normal handoff store;
- return both human-readable Markdown and machine-readable JSON.

## Consequences

Compiled handoffs are now explicit state-transfer artifacts rather than ad hoc summaries. This improves continuity, auditability, and model/provider neutrality. The compiler is deterministic in Layer 4; later layers may add LLM-assisted summarization and human approval while preserving this deterministic baseline.

## Alternatives considered

- Only use `/v1/handoffs` with manually supplied content. Rejected because it does not prove the system can generate handoffs from memory.
- Store context packs but not handoffs. Rejected because a context pack is optimized for prompt assembly, not human/operator handoff.
- Use an LLM-only summary. Rejected for Layer 4 because deterministic behavior is easier to test and audit.
