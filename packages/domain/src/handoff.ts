import { z } from "zod"
import { ContextPackSchema } from "./context"

export const HandoffCreateRequestSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).default("Continuum Handoff"),
  objective: z.string().min(1),
  currentState: z.string().default(""),
  acceptedDecisions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  completedWork: z.array(z.string()).default([]),
  recentEpisodes: z.array(z.string()).default([]),
  procedures: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
  verification: z.array(z.string()).default([]),
  artifactRefs: z.array(z.string()).default([]),
  sourceMemoryIds: z.array(z.string().uuid()).default([]),
  contextPackId: z.string().uuid().optional(),
  compiledAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type HandoffCreateRequest = z.input<typeof HandoffCreateRequestSchema>
export type ParsedHandoffCreateRequest = z.infer<typeof HandoffCreateRequestSchema>

export const HandoffCompileRequestSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).default("Continuum Handoff"),
  objective: z.string().min(1),
  task: z.string().min(1).optional(),
  query: z.string().optional(),
  include: z
    .array(z.string())
    .default([
      "project_state",
      "user_preferences",
      "decisions",
      "constraints",
      "procedures",
      "recent_episodes",
      "open_tasks",
      "risks",
    ]),
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
      strategy: z.enum(["balanced", "precision", "recall", "handoff"]).default("handoff"),
      minScore: z.number().min(0).max(1).default(0.12),
      includeEvidence: z.boolean().default(true),
      includeSuperseded: z.boolean().default(false),
      allowSensitive: z.boolean().default(false),
    })
    .default({
      strategy: "handoff",
      minScore: 0.12,
      includeEvidence: true,
      includeSuperseded: false,
      allowSensitive: false,
    }),
  currentStateOverride: z.string().optional(),
  manualDecisions: z.array(z.string()).default([]),
  manualConstraints: z.array(z.string()).default([]),
  manualCompletedWork: z.array(z.string()).default([]),
  manualRisks: z.array(z.string()).default([]),
  manualOpenQuestions: z.array(z.string()).default([]),
  manualNextActions: z.array(z.string()).default([]),
  manualVerification: z.array(z.string()).default([]),
  artifactRefs: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type HandoffCompileRequest = z.input<typeof HandoffCompileRequestSchema>
export type ParsedHandoffCompileRequest = z.infer<typeof HandoffCompileRequestSchema>

export const HandoffPackSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().optional(),
  title: z.string(),
  objective: z.string(),
  markdown: z.string(),
  payload: HandoffCreateRequestSchema,
  createdAt: z.string().datetime(),
})

export type HandoffPack = z.infer<typeof HandoffPackSchema>

export const HandoffCompileResponseSchema = z.object({
  compileId: z.string().uuid(),
  handoff: HandoffPackSchema,
  contextPack: ContextPackSchema,
  sourceMemoryIds: z.array(z.string().uuid()).default([]),
  markdown: z.string(),
  json: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
})

export type HandoffCompileResponse = z.infer<typeof HandoffCompileResponseSchema>
