import { z } from "zod"
import { MemoryRecordSchema, MemoryTypeSchema, SensitivitySchema } from "./memory"

export const ContextRetrievalStrategySchema = z.enum(["balanced", "precision", "recall", "handoff"])
export type ContextRetrievalStrategy = z.infer<typeof ContextRetrievalStrategySchema>

export const ContextSectionPlanSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  memoryTypes: z.array(MemoryTypeSchema).default([]),
  scopeKinds: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  maxItems: z.number().int().positive().default(8),
})
export type ContextSectionPlan = z.infer<typeof ContextSectionPlanSchema>

export const ContextPlanSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().optional(),
  task: z.string().min(1),
  query: z.string().optional(),
  strategy: ContextRetrievalStrategySchema.default("balanced"),
  sections: z.array(ContextSectionPlanSchema),
  createdAt: z.string().datetime(),
})
export type ContextPlan = z.infer<typeof ContextPlanSchema>

export const ContextRankingSchema = z.object({
  memoryId: z.string().uuid(),
  sectionName: z.string().min(1),
  score: z.number().min(0).max(1),
  rank: z.number().int().positive(),
  reasons: z.array(z.string()).default([]),
  estimatedTokens: z.number().int().nonnegative(),
})
export type ContextRanking = z.infer<typeof ContextRankingSchema>

export const ContextEvidenceSchema = z.object({
  memoryId: z.string().uuid(),
  sourceEventIds: z.array(z.string().uuid()).default([]),
  sourceArtifactIds: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1),
  sensitivity: SensitivitySchema,
})
export type ContextEvidence = z.infer<typeof ContextEvidenceSchema>

export const RankedContextMemorySchema = z.object({
  memory: MemoryRecordSchema,
  ranking: ContextRankingSchema,
})
export type RankedContextMemory = z.infer<typeof RankedContextMemorySchema>

export const ContextSectionSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  memories: z.array(MemoryRecordSchema).default([]),
  rankedMemories: z.array(RankedContextMemorySchema).default([]),
  content: z.string().default(""),
  estimatedTokens: z.number().int().nonnegative().default(0),
})

export type ContextSection = z.infer<typeof ContextSectionSchema>

export const ContextBuildRequestSchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  task: z.string().min(1),
  query: z.string().optional(),
  model: z
    .object({
      provider: z.string().default("unknown"),
      modelName: z.string().optional(),
      contextWindow: z.number().int().positive().optional(),
    })
    .default({ provider: "unknown" }),
  budget: z
    .object({
      maxInputTokens: z.number().int().positive().default(12000),
      reserveOutputTokens: z.number().int().nonnegative().default(2000),
      maxMemoriesPerSection: z.number().int().positive().max(50).default(8),
    })
    .default({ maxInputTokens: 12000, reserveOutputTokens: 2000, maxMemoriesPerSection: 8 }),
  retrieval: z
    .object({
      strategy: ContextRetrievalStrategySchema.default("balanced"),
      minScore: z.number().min(0).max(1).default(0.18),
      includeEvidence: z.boolean().default(true),
      includeSuperseded: z.boolean().default(false),
      allowSensitive: z.boolean().default(false),
    })
    .default({
      strategy: "balanced",
      minScore: 0.18,
      includeEvidence: true,
      includeSuperseded: false,
      allowSensitive: false,
    }),
  include: z.array(z.string()).default([
    "project_state",
    "user_preferences",
    "decisions",
    "procedures",
    "recent_episodes",
    "open_tasks",
  ]),
})

export type ContextBuildRequest = z.input<typeof ContextBuildRequestSchema>
export type ParsedContextBuildRequest = z.infer<typeof ContextBuildRequestSchema>

export const ContextPackSchema = z.object({
  id: z.string().uuid(),
  retrievalAuditId: z.string().uuid().optional(),
  projectId: z.string().optional(),
  task: z.string(),
  query: z.string().optional(),
  plan: ContextPlanSchema,
  sections: z.array(ContextSectionSchema),
  citations: z.array(ContextEvidenceSchema).default([]),
  tokenBudget: z.object({
    maxInputTokens: z.number().int().positive(),
    reserveOutputTokens: z.number().int().nonnegative(),
    estimatedUsedTokens: z.number().int().nonnegative(),
    remainingInputTokens: z.number().int(),
  }),
  createdAt: z.string().datetime(),
})

export type ContextPack = z.infer<typeof ContextPackSchema>

export const ContextRetrievalRequestSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().optional(),
  task: z.string().min(1),
  query: z.string().optional(),
  strategy: ContextRetrievalStrategySchema,
  include: z.array(z.string()).default([]),
  maxInputTokens: z.number().int().positive(),
  parameters: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
})
export type ContextRetrievalRequest = z.infer<typeof ContextRetrievalRequestSchema>

export const CreateContextRetrievalRequestSchema = ContextRetrievalRequestSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})
export type CreateContextRetrievalRequest = z.input<typeof CreateContextRetrievalRequestSchema>

export const ContextRetrievalResultSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  memoryId: z.string().uuid(),
  sectionName: z.string().min(1),
  rank: z.number().int().positive(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
  included: z.boolean(),
  estimatedTokens: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})
export type ContextRetrievalResult = z.infer<typeof ContextRetrievalResultSchema>

export const CreateContextRetrievalResultSchema = ContextRetrievalResultSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})
export type CreateContextRetrievalResult = z.input<typeof CreateContextRetrievalResultSchema>
