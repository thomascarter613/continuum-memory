import { z } from "zod"

export const LlmProviderKindSchema = z.enum([
  "mock",
  "openai-compatible",
  "ollama",
  "anthropic-compatible",
  "custom",
])
export type LlmProviderKind = z.infer<typeof LlmProviderKindSchema>

export const LlmCapabilitySchema = z.object({
  chat: z.boolean().default(true),
  embeddings: z.boolean().default(false),
  toolCalling: z.boolean().default(false),
  jsonMode: z.boolean().default(false),
  vision: z.boolean().default(false),
  streaming: z.boolean().default(false),
  contextWindow: z.number().int().positive().default(8192),
  maxOutputTokens: z.number().int().positive().default(2048),
})
export type LlmCapability = z.infer<typeof LlmCapabilitySchema>

export const LlmProviderConfigSchema = z.object({
  id: z.string().min(1),
  providerKind: LlmProviderKindSchema,
  displayName: z.string().min(1),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(100),
  capabilities: LlmCapabilitySchema.default({
    chat: true,
    embeddings: false,
    toolCalling: false,
    jsonMode: false,
    vision: false,
    streaming: false,
    contextWindow: 8192,
    maxOutputTokens: 2048,
  }),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})
export type LlmProviderConfig = z.infer<typeof LlmProviderConfigSchema>
export const CreateLlmProviderConfigSchema = LlmProviderConfigSchema.extend({
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})
export type CreateLlmProviderConfig = z.input<typeof CreateLlmProviderConfigSchema>

export const LlmMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"])
export type LlmMessageRole = z.infer<typeof LlmMessageRoleSchema>

export const LlmMessageSchema = z.object({
  role: LlmMessageRoleSchema,
  content: z.string().default(""),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type LlmMessage = z.infer<typeof LlmMessageSchema>

export const PromptCompileRequestSchema = z.object({
  projectId: z.string().optional(),
  systemInstruction: z.string().optional(),
  contextPack: z.record(z.string(), z.unknown()).optional(),
  userMessage: z.string().min(1),
  outputContract: z.string().optional(),
  tools: z.array(z.record(z.string(), z.unknown())).default([]),
  includeCitations: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type PromptCompileRequest = z.input<typeof PromptCompileRequestSchema>

export const PromptCompileResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().optional(),
  messages: z.array(LlmMessageSchema),
  estimatedInputTokens: z.number().int().nonnegative(),
  sections: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
})
export type PromptCompileResponse = z.infer<typeof PromptCompileResponseSchema>

export const LlmCapabilityNameSchema = z.enum([
  "chat",
  "embeddings",
  "toolCalling",
  "jsonMode",
  "vision",
  "streaming",
])
export type LlmCapabilityName = z.infer<typeof LlmCapabilityNameSchema>

export const LlmRouteRequestSchema = z.object({
  projectId: z.string().optional(),
  task: z.string().min(1),
  preferredProviderId: z.string().optional(),
  requiredCapabilities: z.array(LlmCapabilityNameSchema).default(["chat"]),
  sensitivity: z.enum(["public", "normal", "private", "sensitive", "secret"]).default("normal"),
  minContextWindow: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type LlmRouteRequest = z.input<typeof LlmRouteRequestSchema>

export const LlmRouteResultSchema = z.object({
  provider: LlmProviderConfigSchema,
  model: z.string(),
  reasons: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})
export type LlmRouteResult = z.infer<typeof LlmRouteResultSchema>

export const LlmChatRequestSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().optional(),
  providerId: z.string().optional(),
  model: z.string().optional(),
  route: LlmRouteRequestSchema.omit({ task: true }).partial().optional(),
  messages: z.array(LlmMessageSchema).min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  maxOutputTokens: z.number().int().positive().optional(),
  execute: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type LlmChatRequest = z.input<typeof LlmChatRequestSchema>

export const LlmUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().default(0),
})
export type LlmUsage = z.infer<typeof LlmUsageSchema>

export const LlmChatResponseSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string(),
  providerKind: LlmProviderKindSchema,
  model: z.string(),
  status: z.enum(["dry_run", "succeeded", "failed"]),
  message: LlmMessageSchema,
  usage: LlmUsageSchema,
  latencyMs: z.number().int().nonnegative().default(0),
  auditId: z.string().uuid().optional(),
  raw: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type LlmChatResponse = z.infer<typeof LlmChatResponseSchema>

export const LlmEmbeddingRequestSchema = z.object({
  projectId: z.string().optional(),
  providerId: z.string().optional(),
  model: z.string().optional(),
  input: z.array(z.string().min(1)).min(1),
  execute: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type LlmEmbeddingRequest = z.input<typeof LlmEmbeddingRequestSchema>

export const LlmEmbeddingResponseSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string(),
  providerKind: LlmProviderKindSchema,
  model: z.string(),
  status: z.enum(["dry_run", "succeeded", "failed"]),
  vectors: z.array(z.array(z.number())).default([]),
  usage: LlmUsageSchema,
  latencyMs: z.number().int().nonnegative().default(0),
  auditId: z.string().uuid().optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type LlmEmbeddingResponse = z.infer<typeof LlmEmbeddingResponseSchema>

export const LlmCallAuditSchema = z.object({
  id: z.string().uuid(),
  requestKind: z.enum(["chat", "embedding", "route", "prompt.compile"]),
  providerId: z.string().optional(),
  providerKind: LlmProviderKindSchema.optional(),
  model: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(["dry_run", "succeeded", "failed"]),
  inputSummary: z.string().default(""),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  request: z.record(z.string(), z.unknown()).default({}),
  response: z.record(z.string(), z.unknown()).default({}),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type LlmCallAudit = z.infer<typeof LlmCallAuditSchema>

export const CreateLlmCallAuditSchema = LlmCallAuditSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})
export type CreateLlmCallAudit = z.input<typeof CreateLlmCallAuditSchema>
