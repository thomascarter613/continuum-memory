import { z } from "zod"
import { SensitivitySchema } from "./memory"

export const ArtifactKindSchema = z.enum([
  "repository",
  "directory",
  "source_file",
  "documentation",
  "config",
  "schema",
  "script",
  "test",
  "command_log",
  "generated_output",
  "dataset",
  "image",
  "binary",
  "unknown",
])

export type ArtifactKind = z.infer<typeof ArtifactKindSchema>

export const ArtifactStatusSchema = z.enum([
  "active",
  "indexed",
  "stale",
  "ignored",
  "deleted",
  "archived",
])

export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>

export const ArtifactRecordSchema = z.object({
  id: z.string().uuid(),
  artifactKind: ArtifactKindSchema,
  namespace: z.string().min(1),
  projectId: z.string().optional(),
  uri: z.string().min(1),
  path: z.string().optional(),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  checksum: z.string().optional(),
  sensitivity: SensitivitySchema.default("normal"),
  status: ArtifactStatusSchema.default("active"),
  contentPreview: z.string().optional(),
  contentText: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  sourceEventIds: z.array(z.string().uuid()).default([]),
  sourceMemoryIds: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>

export const CreateArtifactRecordSchema = ArtifactRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type CreateArtifactRecord = z.input<typeof CreateArtifactRecordSchema>

export const ArtifactSearchRequestSchema = z.object({
  query: z.string().optional(),
  namespace: z.string().optional(),
  projectId: z.string().optional(),
  artifactKinds: z.array(ArtifactKindSchema).optional(),
  statuses: z.array(ArtifactStatusSchema).optional(),
  pathPrefix: z.string().optional(),
  includeContent: z.boolean().default(false),
  limit: z.number().int().positive().max(250).default(50),
})

export type ArtifactSearchRequest = z.input<typeof ArtifactSearchRequestSchema>

export const RepoIndexRequestSchema = z.object({
  projectId: z.string().optional(),
  namespace: z.string().min(1).default("project/artifacts"),
  rootPath: z.string().min(1).default("."),
  includeGlobs: z.array(z.string()).default(["**/*"]),
  excludeGlobs: z
    .array(z.string())
    .default([
      ".git/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".turbo/**",
      ".next/**",
      ".moon/**",
      ".continuum-data/**",
    ]),
  maxFiles: z.number().int().positive().max(5000).default(500),
  maxBytesPerFile: z.number().int().positive().max(1_000_000).default(100_000),
  captureContent: z.boolean().default(false),
  dryRun: z.boolean().default(false),
})

export type RepoIndexRequest = z.input<typeof RepoIndexRequestSchema>

export const RepoIndexRunSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().optional(),
  namespace: z.string().min(1),
  rootPath: z.string().min(1),
  includeGlobs: z.array(z.string()).default([]),
  excludeGlobs: z.array(z.string()).default([]),
  maxBytesPerFile: z.number().int().positive(),
  artifactCount: z.number().int().nonnegative(),
  ignoredCount: z.number().int().nonnegative(),
  status: z.enum(["succeeded", "partial", "failed"]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
})

export type RepoIndexRun = z.infer<typeof RepoIndexRunSchema>

export const CreateRepoIndexRunSchema = RepoIndexRunSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})

export type CreateRepoIndexRun = z.input<typeof CreateRepoIndexRunSchema>

export const RepoIndexResponseSchema = z.object({
  run: RepoIndexRunSchema,
  artifacts: z.array(ArtifactRecordSchema),
  dryRun: z.boolean(),
})

export type RepoIndexResponse = z.infer<typeof RepoIndexResponseSchema>
