# LLM Gateway Runbook

## Purpose

The LLM Gateway is the model-agnostic execution boundary for Continuum Memory. It owns provider registry, routing, prompt compilation, provider call dry-runs, and audit records.

## Local defaults

The default provider is `mock`.

```bash
CONTINUUM_LLM_DEFAULT_PROVIDER=mock
```

This lets you run smoke tests without paid APIs, remote network calls, or local model servers.

## List providers

```bash
curl -fsS http://localhost:3030/v1/llm/providers | jq .
```

## Route a task

```bash
curl -fsS -X POST http://localhost:3030/v1/llm/route \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "task":"compile durable context into an implementation plan",
    "requiredCapabilities":["chat"],
    "preferredProviderId":"mock"
  }' | jq .
```

## Compile a prompt

```bash
curl -fsS -X POST http://localhost:3030/v1/prompts/compile \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "userMessage":"Continue the current work packet.",
    "systemInstruction":"Use durable project memory when supplied."
  }' | jq .
```

## Dry-run chat

```bash
curl -fsS -X POST http://localhost:3030/v1/llm/chat \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "providerId":"mock",
    "execute":false,
    "messages":[{"role":"user","content":"Confirm the gateway is wired."}]
  }' | jq .
```

## Ollama execution

Run Ollama locally, then use:

```bash
CONTINUUM_LLM_DEFAULT_PROVIDER=ollama
CONTINUUM_OLLAMA_BASE_URL=http://localhost:11434
CONTINUUM_OLLAMA_DEFAULT_MODEL=llama3.1
```

Then send a chat request with `execute:true` and `providerId:"ollama"`.

## OpenAI-compatible execution

Set:

```bash
CONTINUUM_LLM_DEFAULT_PROVIDER=openai-compatible
CONTINUUM_OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1
CONTINUUM_OPENAI_COMPATIBLE_API_KEY_ENV=OPENAI_API_KEY
CONTINUUM_OPENAI_COMPATIBLE_DEFAULT_MODEL=<your-model-name>
OPENAI_API_KEY=<your-key>
```

Then send a chat request with `execute:true` and `providerId:"openai-compatible"`.

Do not commit API keys to the repository.
