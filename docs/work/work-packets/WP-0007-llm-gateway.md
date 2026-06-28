# WP-0007: LLM Gateway and Provider Adapters

## Goal

Add a model-agnostic provider gateway so Continuum can route, compile, dry-run, execute, and audit LLM requests.

## Scope

Included:

- LLM provider domain schemas.
- Prompt compile schemas.
- Route schemas.
- Chat and embedding schemas.
- Provider configuration persistence.
- LLM call audit persistence.
- Built-in provider registry.
- Deterministic mock provider.
- OpenAI-compatible adapter path.
- Ollama adapter path.
- Anthropic-compatible placeholder.
- SDK and CLI commands.
- Smoke test coverage.

Excluded for this layer:

- Streaming.
- Tool-call execution broker.
- Full Anthropic-native execution.
- Full embedding-provider execution beyond deterministic mock vectors.
- Multimodal payload support.

## Acceptance Criteria

- `GET /v1/llm/providers` returns built-in providers.
- `POST /v1/llm/route` returns a selected provider and audit id.
- `POST /v1/prompts/compile` returns provider-neutral messages and audit id.
- `POST /v1/llm/chat` works with the mock provider without external API keys.
- `POST /v1/llm/embeddings` returns deterministic vectors for smoke tests.
- LLM route, prompt, chat, and embedding requests create audit records.
- Provider configuration can be upserted into PostgreSQL.
