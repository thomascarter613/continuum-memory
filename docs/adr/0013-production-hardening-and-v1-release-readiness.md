# ADR-0013: Production hardening and v1 release readiness are explicit release gates

## Status

Accepted

## Context

Continuum Memory handles durable developer memory, handoffs, context packs, repository indexes, provider audits, and governance decisions. A working demo is not enough. Before calling the system v1-ready, the repository needs release gates, health/readiness endpoints, backup/restore instructions, security posture documentation, and repeatable verification commands.

## Decision

Continuum v1 will include a formal production-hardening layer:

- `/livez`, `/readyz`, `/healthz`, and `/version` endpoints.
- Runtime configuration validation.
- Dockerfiles and production compose example.
- CI and security workflows.
- Release verification script.
- Backup and restore scripts.
- Security policy and changelog.
- v1 readiness checklist and release runbook.

## Consequences

- The project is easier to operate locally and in early deployment environments.
- Release readiness becomes inspectable and repeatable.
- The system is still not considered internet-exposed production-safe until authentication, authorization, TLS, and secret-management are configured in the deployment environment.
