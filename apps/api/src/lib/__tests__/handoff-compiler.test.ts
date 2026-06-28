import { describe, expect, test } from "bun:test"
import { ContextBuildRequestSchema, HandoffCompileRequestSchema } from "@continuum/domain"
import { buildContextPack } from "../context-builder"
import { compileHandoff } from "../handoff-compiler"

describe("compileHandoff", () => {
  test("compiles source memories into a handoff input", () => {
    const contextRequest = ContextBuildRequestSchema.parse({
      projectId: "test",
      task: "resume implementation",
      include: ["decisions", "open_tasks"],
      retrieval: { strategy: "handoff", minScore: 0.1, includeEvidence: true },
    })

    const { pack } = buildContextPack(contextRequest, [
      {
        id: "00000000-0000-4000-8000-000000000001",
        memoryType: "decision",
        namespace: "project:test/decisions",
        scope: { projectId: "test", kind: "decision" },
        content: "Decision: compiled handoffs are first-class state artifacts.",
        sourceEventIds: [],
        sourceArtifactIds: [],
        confidence: 0.95,
        sensitivity: "normal",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    const request = HandoffCompileRequestSchema.parse({
      projectId: "test",
      objective: "Resume implementation from durable memory.",
    })

    const compiled = compileHandoff(request, pack)
    expect(compiled.sourceMemoryIds).toContain("00000000-0000-4000-8000-000000000001")
    expect(compiled.handoffInput.acceptedDecisions?.[0]).toContain("compiled handoffs")
  })
})
