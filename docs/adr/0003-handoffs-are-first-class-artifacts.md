# ADR-0003: Handoffs Are First-Class Artifacts

## Status

Accepted

## Context

Summaries are often too vague to resume serious software work. New chats need objective, current state, decisions, constraints, artifacts, verification status, and exact next actions.

## Decision

Represent handoffs as typed artifacts with both Markdown and machine-readable JSON forms.

## Consequences

- Handoffs can be pasted into chat, committed to Git, or loaded by tools.
- Handoffs can be evaluated for completeness.
- Session boundaries become explicit rather than accidental.
