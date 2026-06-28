# EPIC-0001: Memory Foundation

## Goal

Create the durable foundation for typed memories, events, context packs, and handoff packs.

## Work Packets

- WP-0001: Define repository scaffold
- WP-0002: Define domain schemas
- WP-0003: Implement API shell
- WP-0004: Implement PostgreSQL persistence
- WP-0005: Implement memory search and retrieval baseline

## Acceptance Criteria

- Every memory has type, namespace, scope, status, confidence, sensitivity, and evidence.
- Every event can be persisted.
- Every handoff can be emitted as Markdown and JSON.
- The API can build a basic context pack.
