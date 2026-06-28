import { randomUUID } from "node:crypto"
import type {
  LlmChatRequest,
  LlmChatResponse,
  LlmEmbeddingRequest,
  LlmEmbeddingResponse,
  LlmProviderConfig,
  LlmRouteRequest,
  LlmRouteResult,
  PromptCompileRequest,
  PromptCompileResponse,
} from "@continuum/domain"
import type { ContinuumConfig } from "../config"
import { now } from "./time"

const DEFAULT_CAPABILITIES = {
  chat: true,
  embeddings: false,
  toolCalling: false,
  jsonMode: false,
  vision: false,
  streaming: false,
  contextWindow: 8192,
  maxOutputTokens: 2048,
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

function summarizeMessages(messages: { role: string; content: string }[]) {
  return messages
    .map((message) => `${message.role}: ${message.content.slice(0, 160)}`)
    .join("\n")
    .slice(0, 1200)
}

export function configuredLlmProviders(config: ContinuumConfig): LlmProviderConfig[] {
  return [
    {
      id: "mock",
      providerKind: "mock",
      displayName: "Deterministic Mock Provider",
      enabled: true,
      priority: 0,
      defaultModel: "mock-memory-model",
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        embeddings: true,
        toolCalling: true,
        jsonMode: true,
        contextWindow: 128000,
        maxOutputTokens: 4096,
      },
      metadata: { builtin: true, safeDefault: true },
    },
    {
      id: "openai-compatible",
      providerKind: "openai-compatible",
      displayName: "OpenAI-Compatible Provider",
      baseUrl: config.openAiCompatibleBaseUrl,
      defaultModel: config.openAiCompatibleDefaultModel,
      apiKeyEnv: config.openAiCompatibleApiKeyEnv,
      enabled: true,
      priority: 20,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        embeddings: true,
        toolCalling: true,
        jsonMode: true,
        contextWindow: 128000,
        maxOutputTokens: 4096,
      },
      metadata: { builtin: true, executeRequiresApiKey: true },
    },
    {
      id: "ollama",
      providerKind: "ollama",
      displayName: "Ollama Local Provider",
      baseUrl: config.ollamaBaseUrl,
      defaultModel: config.ollamaDefaultModel,
      enabled: true,
      priority: 30,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        contextWindow: 32768,
        maxOutputTokens: 4096,
      },
      metadata: { builtin: true, local: true },
    },
    {
      id: "anthropic-compatible",
      providerKind: "anthropic-compatible",
      displayName: "Anthropic-Compatible Provider",
      baseUrl: config.anthropicCompatibleBaseUrl,
      defaultModel: config.anthropicCompatibleDefaultModel,
      apiKeyEnv: config.anthropicCompatibleApiKeyEnv,
      enabled: true,
      priority: 40,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        toolCalling: true,
        vision: true,
        contextWindow: 200000,
        maxOutputTokens: 4096,
      },
      metadata: { builtin: true, executeRequiresApiKey: true, adapterStatus: "placeholder" },
    },
  ]
}

export function mergeProviders(builtin: LlmProviderConfig[], stored: LlmProviderConfig[]) {
  const providers = new Map<string, LlmProviderConfig>()
  for (const provider of builtin) providers.set(provider.id, provider)
  for (const provider of stored) providers.set(provider.id, provider)
  return [...providers.values()].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
}

function providerSupports(provider: LlmProviderConfig, capability: string) {
  const capabilities = provider.capabilities as unknown as Record<string, unknown>
  return capabilities[capability] === true || (capability === "chat" && capabilities.chat !== false)
}

export function routeLlmProvider(providers: LlmProviderConfig[], request: LlmRouteRequest): LlmRouteResult {
  const enabled = providers.filter((provider) => provider.enabled)
  const warnings: string[] = []

  const requiredCapabilities = request.requiredCapabilities ?? ["chat"]
  const sensitivity = request.sensitivity ?? "normal"

  if (sensitivity === "secret") {
    warnings.push("secret sensitivity should normally use a local or mock provider unless a provider policy explicitly allows export")
  }

  const preferred = request.preferredProviderId
    ? enabled.find((provider) => provider.id === request.preferredProviderId)
    : undefined

  const candidates = preferred ? [preferred, ...enabled.filter((provider) => provider.id !== preferred.id)] : enabled

  const selected = candidates.find((provider) => {
    const hasCapabilities = requiredCapabilities.every((capability) => providerSupports(provider, capability))
    const hasWindow = !request.minContextWindow || provider.capabilities.contextWindow >= request.minContextWindow
    return hasCapabilities && hasWindow
  })

  if (!selected) {
    throw new Error("No enabled LLM provider satisfies the requested capabilities")
  }

  const reasons = [
    `selected ${selected.id} by priority/capability route`,
    `provider kind: ${selected.providerKind}`,
  ]

  if (preferred?.id === selected.id) reasons.push("preferred provider was available")
  if (selected.id === "mock") reasons.push("mock provider is safe for local smoke tests and offline development")

  return {
    provider: selected,
    model: selected.defaultModel ?? "provider-default",
    reasons,
    warnings,
  }
}

function contextPackToPrompt(contextPack: Record<string, unknown> | undefined, includeCitations: boolean) {
  if (!contextPack) return ""
  const sections = contextPack.sections
  const lines: string[] = []

  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (!section || typeof section !== "object") continue
      const record = section as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name : "context"
      const content = typeof record.content === "string" ? record.content : ""
      if (content.trim()) lines.push(`## ${name}\n${content}`)
    }
  }

  if (includeCitations && Array.isArray(contextPack.citations)) {
    lines.push(`## Citations\n${JSON.stringify(contextPack.citations, null, 2)}`)
  }

  return lines.join("\n\n")
}

export function compilePrompt(request: PromptCompileRequest): PromptCompileResponse {
  const id = randomUUID()
  const createdAt = now()
  const warnings: string[] = []
  const sections: string[] = []
  const messages = []

  const systemParts = [
    request.systemInstruction ??
      "You are working with Continuum Memory durable context. Treat supplied context as evidence-backed project memory, not as the complete universe of truth.",
  ]

  const contextText = contextPackToPrompt(request.contextPack, request.includeCitations ?? true)
  if (contextText) {
    sections.push("durable_context")
    systemParts.push(`Durable context:\n${contextText}`)
  } else {
    warnings.push("no context pack supplied")
  }

  if (request.outputContract) {
    sections.push("output_contract")
    systemParts.push(`Output contract:\n${request.outputContract}`)
  }

  if (request.tools?.length) {
    sections.push("tools")
    systemParts.push(`Available tool contracts:\n${JSON.stringify(request.tools, null, 2)}`)
  }

  messages.push({ role: "system" as const, content: systemParts.join("\n\n"), metadata: {} })
  messages.push({ role: "user" as const, content: request.userMessage, metadata: {} })

  const estimatedInputTokens = messages.reduce((total, message) => total + estimateTokens(message.content), 0)

  return {
    id,
    ...(request.projectId ? { projectId: request.projectId } : {}),
    messages,
    estimatedInputTokens,
    sections,
    warnings,
    createdAt,
  }
}

function createMockChatResponse(request: LlmChatRequest, provider: LlmProviderConfig, model: string): LlmChatResponse {
  const id = randomUUID()
  const inputTokens = request.messages.reduce((total, message) => total + estimateTokens(message.content), 0)
  const content = [
    "Mock LLM response from Continuum Memory.",
    "This confirms the gateway, provider routing, prompt shape, and audit path without calling an external model.",
    `Provider: ${provider.id}`,
    `Model: ${model}`,
  ].join("\n")
  const outputTokens = estimateTokens(content)
  return {
    id,
    providerId: provider.id,
    providerKind: provider.providerKind,
    model,
    status: request.execute ? "succeeded" : "dry_run",
    message: { role: "assistant", content, metadata: { mock: true } },
    usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    latencyMs: 0,
    createdAt: now(),
  }
}

async function callOpenAiCompatible(
  request: LlmChatRequest,
  provider: LlmProviderConfig,
  model: string,
): Promise<LlmChatResponse> {
  const start = Date.now()
  const apiKey = provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined
  if (!apiKey) throw new Error(`Missing API key environment variable: ${provider.apiKeyEnv ?? "provider api key"}`)
  if (!provider.baseUrl) throw new Error(`Provider ${provider.id} is missing baseUrl`)

  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxOutputTokens ?? provider.capabilities.maxOutputTokens,
    }),
  })

  const raw = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(`OpenAI-compatible provider returned ${response.status}: ${JSON.stringify(raw).slice(0, 500)}`)
  }

  const choices = raw.choices as Array<{ message?: { content?: string } }> | undefined
  const content = choices?.[0]?.message?.content ?? ""
  const usage = raw.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined
  return {
    id: randomUUID(),
    providerId: provider.id,
    providerKind: provider.providerKind,
    model,
    status: "succeeded",
    message: { role: "assistant", content, metadata: {} },
    usage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
    latencyMs: Date.now() - start,
    raw,
    createdAt: now(),
  }
}

async function callOllama(request: LlmChatRequest, provider: LlmProviderConfig, model: string): Promise<LlmChatResponse> {
  const start = Date.now()
  if (!provider.baseUrl) throw new Error(`Provider ${provider.id} is missing baseUrl`)
  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
      options: { temperature: request.temperature ?? 0.2 },
    }),
  })
  const raw = (await response.json()) as Record<string, unknown>
  if (!response.ok) throw new Error(`Ollama returned ${response.status}: ${JSON.stringify(raw).slice(0, 500)}`)
  const message = raw.message as { content?: string } | undefined
  const content = message?.content ?? ""
  const inputTokens = request.messages.reduce((total, item) => total + estimateTokens(item.content), 0)
  const outputTokens = estimateTokens(content)
  return {
    id: randomUUID(),
    providerId: provider.id,
    providerKind: provider.providerKind,
    model,
    status: "succeeded",
    message: { role: "assistant", content, metadata: {} },
    usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    latencyMs: Date.now() - start,
    raw,
    createdAt: now(),
  }
}

export async function chatWithProvider(
  request: LlmChatRequest,
  provider: LlmProviderConfig,
  model: string,
): Promise<LlmChatResponse> {
  if (!request.execute || provider.providerKind === "mock") return createMockChatResponse(request, provider, model)
  if (provider.providerKind === "openai-compatible") return callOpenAiCompatible(request, provider, model)
  if (provider.providerKind === "ollama") return callOllama(request, provider, model)
  throw new Error(`Provider kind ${provider.providerKind} is not executable yet; use execute=false for dry-run routing.`)
}

function deterministicVector(text: string, dimensions = 16) {
  const vector = Array.from({ length: dimensions }, () => 0)
  for (let index = 0; index < text.length; index += 1) {
    const bucket = index % dimensions
    vector[bucket] += text.charCodeAt(index) / 1000
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / norm).toFixed(6)))
}

export async function embedWithProvider(
  request: LlmEmbeddingRequest,
  provider: LlmProviderConfig,
  model: string,
): Promise<LlmEmbeddingResponse> {
  const inputTokens = request.input.reduce((total, value) => total + estimateTokens(value), 0)
  const vectors = request.input.map((value) => deterministicVector(value))
  return {
    id: randomUUID(),
    providerId: provider.id,
    providerKind: provider.providerKind,
    model,
    status: "dry_run",
    vectors,
    usage: { inputTokens, outputTokens: 0, totalTokens: inputTokens },
    latencyMs: 0,
    createdAt: now(),
  }
}

export function inputSummaryForChat(request: LlmChatRequest) {
  return summarizeMessages(request.messages)
}
