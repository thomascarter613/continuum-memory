# ADR-0009: Add a Model-Agnostic LLM Gateway

## Status

Accepted.

## Context

Continuum Memory must work with any LLM. Up through Layer 5, the system can persist memories, ingest candidates, build context packs, compile handoffs, and evaluate quality, but it does not yet provide a governed model execution boundary.

Without an LLM gateway, every client would need to know how to call each provider, which would fragment policy, auditing, prompt compilation, and provider-specific behavior.

## Decision

Add a model-agnostic LLM Gateway with:

- provider configuration records;
- built-in mock, OpenAI-compatible, Ollama, and Anthropic-compatible provider definitions;
- provider routing by capability, priority, sensitivity, and context window;
- prompt compilation into neutral chat messages;
- chat and embedding request contracts;
- deterministic mock execution by default;
- audit records for routing, prompt compilation, chat calls, and embeddings.

The mock provider is the default so local development and CI can verify the gateway without paid APIs or network calls.

## Consequences

Positive:

- Continuum remains provider-neutral.
- Context packs can be compiled once and sent to different providers.
- LLM calls become auditable events rather than invisible side effects.
- Local/offline development remains possible.

Trade-offs:

- Provider adapters are intentionally thin in this layer.
- Advanced provider features such as tool calls, streaming, multimodal inputs, and JSON schema enforcement remain future work.
- Real provider execution requires explicit API key configuration and `execute: true`.

## Alternatives Considered

1. Bind directly to one provider SDK. Rejected because it would violate the model-agnostic goal.
2. Use only OpenAI-compatible APIs. Rejected because local and non-compatible providers still matter.
3. Delay provider abstraction until later. Rejected because prompt compilation, routing, and auditing need stable contracts before artifact indexing and CLI automation expand.
