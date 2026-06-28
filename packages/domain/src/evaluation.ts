import { z } from "zod"
import { HandoffPackSchema } from "./handoff"
import { MemoryCandidateSchema, MemoryRecordSchema } from "./memory"

export const EvaluationKindSchema = z.enum([
  "memory_quality",
  "handoff_completeness",
  "retrieval_quality",
  "policy_regression",
])
export type EvaluationKind = z.infer<typeof EvaluationKindSchema>

export const EvaluationTargetTypeSchema = z.enum([
  "memory",
  "candidate",
  "handoff",
  "context_pack",
  "policy_decision",
])
export type EvaluationTargetType = z.infer<typeof EvaluationTargetTypeSchema>

export const EvaluationFindingSeveritySchema = z.enum(["info", "warning", "error"])
export type EvaluationFindingSeverity = z.infer<typeof EvaluationFindingSeveritySchema>

export const EvaluationFindingSchema = z.object({
  code: z.string().min(1),
  severity: EvaluationFindingSeveritySchema,
  message: z.string().min(1),
})
export type EvaluationFinding = z.infer<typeof EvaluationFindingSchema>

export const MemoryEvaluationSchema = z.object({
  id: z.string().uuid(),
  evaluationKind: EvaluationKindSchema,
  targetType: EvaluationTargetTypeSchema,
  targetId: z.string().optional(),
  projectId: z.string().optional(),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  findings: z.array(EvaluationFindingSchema).default([]),
  recommendations: z.array(z.string()).default([]),
  metrics: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
})
export type MemoryEvaluation = z.infer<typeof MemoryEvaluationSchema>

export const CreateMemoryEvaluationSchema = MemoryEvaluationSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})
export type CreateMemoryEvaluation = z.input<typeof CreateMemoryEvaluationSchema>

export const MemoryQualityEvaluationRequestSchema = z.object({
  memoryId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  projectId: z.string().optional(),
  memory: MemoryRecordSchema.optional(),
  candidate: MemoryCandidateSchema.optional(),
})
export type MemoryQualityEvaluationRequest = z.input<typeof MemoryQualityEvaluationRequestSchema>

export const HandoffCompletenessEvaluationRequestSchema = z.object({
  handoffId: z.string().uuid().optional(),
  projectId: z.string().optional(),
  handoff: HandoffPackSchema.optional(),
})
export type HandoffCompletenessEvaluationRequest = z.input<
  typeof HandoffCompletenessEvaluationRequestSchema
>
