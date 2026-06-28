import { z } from "zod"

export const MemoryTypeSchema = z.enum([
  "working",
  "episodic",
  "semantic",
  "procedural",
  "decision",
  "artifact",
  "handoff",
  "profile",
])

export type MemoryType = z.infer<typeof MemoryTypeSchema>

export const SensitivitySchema = z.enum(["public", "normal", "private", "sensitive", "secret"])
export type Sensitivity = z.infer<typeof SensitivitySchema>

export const MemoryStatusSchema = z.enum([
  "candidate",
  "active",
  "rejected",
  "superseded",
  "deprecated",
  "forgotten",
  "archived",
])
export type MemoryStatus = z.infer<typeof MemoryStatusSchema>

export const MemoryEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string().min(1),
  actorType: z.string().min(1),
  actorId: z.string().optional(),
  subjectType: z.string().optional(),
  subjectId: z.string().optional(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  runId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string().datetime(),
  causationId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
})

export type MemoryEvent = z.infer<typeof MemoryEventSchema>

export const CreateMemoryEventSchema = MemoryEventSchema.omit({
  id: true,
  occurredAt: true,
}).extend({
  id: z.string().uuid().optional(),
  occurredAt: z.string().datetime().optional(),
})

export type CreateMemoryEvent = z.input<typeof CreateMemoryEventSchema>

export const MemoryRecordSchema = z.object({
  id: z.string().uuid(),
  memoryType: MemoryTypeSchema,
  namespace: z.string().min(1),
  scope: z.record(z.string(), z.unknown()).default({}),
  content: z.string().min(1),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  sourceEventIds: z.array(z.string().uuid()).default([]),
  sourceArtifactIds: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  sensitivity: SensitivitySchema.default("normal"),
  status: MemoryStatusSchema.default("active"),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  supersedes: z.string().uuid().optional(),
  supersededBy: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type MemoryRecord = z.infer<typeof MemoryRecordSchema>

export const CreateMemoryRecordSchema = MemoryRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type CreateMemoryRecord = z.input<typeof CreateMemoryRecordSchema>

export const MemoryCandidateTypeSchema = z.enum([
  "preference",
  "constraint",
  "project_fact",
  "decision",
  "task_state",
  "procedure",
  "artifact_reference",
  "risk",
  "open_question",
  "profile_update",
  "episode_summary",
  "unknown",
])

export type MemoryCandidateType = z.infer<typeof MemoryCandidateTypeSchema>

export const MemoryCandidateStatusSchema = z.enum([
  "proposed",
  "needs_review",
  "accepted",
  "rejected",
  "promoted",
  "archived",
])

export type MemoryCandidateStatus = z.infer<typeof MemoryCandidateStatusSchema>

export const MemoryCandidateSchema = z.object({
  id: z.string().uuid(),
  candidateType: MemoryCandidateTypeSchema,
  namespace: z.string().min(1),
  scope: z.record(z.string(), z.unknown()).default({}),
  content: z.string().min(1),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  sourceEventIds: z.array(z.string().uuid()).default([]),
  sourceArtifactIds: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  sensitivity: SensitivitySchema.default("normal"),
  status: MemoryCandidateStatusSchema.default("proposed"),
  rationale: z.string().optional(),
  suggestedMemoryType: MemoryTypeSchema.optional(),
  suggestedActions: z.array(z.string()).default([]),
  rejectionReason: z.string().optional(),
  promotedMemoryId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
})

export type MemoryCandidate = z.infer<typeof MemoryCandidateSchema>

export const CreateMemoryCandidateSchema = MemoryCandidateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  promotedMemoryId: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type CreateMemoryCandidate = z.input<typeof CreateMemoryCandidateSchema>

export const MemoryCandidateSearchRequestSchema = z.object({
  query: z.string().optional(),
  namespace: z.string().optional(),
  candidateTypes: z.array(MemoryCandidateTypeSchema).optional(),
  statuses: z.array(MemoryCandidateStatusSchema).optional(),
  projectId: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
})

export type MemoryCandidateSearchRequest = z.input<typeof MemoryCandidateSearchRequestSchema>

export const PromoteMemoryCandidateRequestSchema = z.object({
  memoryType: MemoryTypeSchema.optional(),
  namespace: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sensitivity: SensitivitySchema.optional(),
  status: MemoryStatusSchema.default("active"),
  supersedes: z.string().uuid().optional(),
})

export type PromoteMemoryCandidateRequest = z.input<typeof PromoteMemoryCandidateRequestSchema>

export const RejectMemoryCandidateRequestSchema = z.object({
  reason: z.string().min(1),
})

export type RejectMemoryCandidateRequest = z.input<typeof RejectMemoryCandidateRequestSchema>

export const ExtractMemoryCandidatesRequestSchema = z.object({
  namespace: z.string().min(1),
  projectId: z.string().optional(),
  text: z.string().min(1),
  sourceEventIds: z.array(z.string().uuid()).default([]),
  sourceArtifactIds: z.array(z.string().uuid()).default([]),
})

export type ExtractMemoryCandidatesRequest = z.input<typeof ExtractMemoryCandidatesRequestSchema>

export interface MemoryCandidatePromotionResult {
  candidate: MemoryCandidate
  memory: MemoryRecord
}

export const MemorySearchRequestSchema = z.object({
  query: z.string().optional(),
  namespace: z.string().optional(),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
  projectId: z.string().optional(),
  includeSuperseded: z.boolean().default(false),
  limit: z.number().int().positive().max(100).default(20),
})

export type MemorySearchRequest = z.input<typeof MemorySearchRequestSchema>
