import { z } from "zod"
import { MemoryCandidateTypeSchema, MemoryTypeSchema, SensitivitySchema } from "./memory"

export const PolicyActionSchema = z.enum([
  "memory.write",
  "memory.read",
  "candidate.promote",
  "context.retrieve",
  "handoff.export",
  "artifact.write",
  "artifact.index",
  "artifact.export",
  "memory.forget",
  "llm.route",
  "llm.call",
  "llm.embed",
  "prompt.compile",
])
export type PolicyAction = z.infer<typeof PolicyActionSchema>

export const PolicyDecisionKindSchema = z.enum(["allow", "deny", "review"])
export type PolicyDecisionKind = z.infer<typeof PolicyDecisionKindSchema>

export const PolicyCheckRequestSchema = z.object({
  action: PolicyActionSchema,
  projectId: z.string().optional(),
  actorId: z.string().optional(),
  namespace: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  memoryType: MemoryTypeSchema.optional(),
  candidateType: MemoryCandidateTypeSchema.optional(),
  sensitivity: SensitivitySchema.default("normal"),
  evidenceCount: z.number().int().nonnegative().default(0),
  allowSensitive: z.boolean().default(false),
  purpose: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
})
export type PolicyCheckRequest = z.input<typeof PolicyCheckRequestSchema>
export type ParsedPolicyCheckRequest = z.infer<typeof PolicyCheckRequestSchema>

export const PolicyDecisionSchema = z.object({
  id: z.string().uuid(),
  action: PolicyActionSchema,
  decision: PolicyDecisionKindSchema,
  projectId: z.string().optional(),
  actorId: z.string().optional(),
  namespace: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  sensitivity: SensitivitySchema.default("normal"),
  reasons: z.array(z.string()).default([]),
  obligations: z.array(z.string()).default([]),
  input: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
})
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>

export const CreatePolicyDecisionSchema = PolicyDecisionSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})
export type CreatePolicyDecision = z.input<typeof CreatePolicyDecisionSchema>
