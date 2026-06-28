import { describe, expect, test } from "bun:test"
import { InMemoryContinuumStore } from "../in-memory-store"

describe("InMemoryContinuumStore", () => {
  test("creates and retrieves a memory record", async () => {
    const store = new InMemoryContinuumStore()
    const created = await store.createMemory({
      memoryType: "semantic",
      namespace: "project:test",
      content: "The test project uses durable memory.",
      scope: { projectId: "test" },
    })

    const found = await store.getMemory(created.id)
    expect(found?.content).toBe("The test project uses durable memory.")
  })

  test("searches active non-superseded memories", async () => {
    const store = new InMemoryContinuumStore()
    await store.createMemory({
      memoryType: "semantic",
      namespace: "project:test",
      content: "Use PostgreSQL as canonical memory store.",
      scope: { projectId: "test" },
    })
    await store.createMemory({
      memoryType: "semantic",
      namespace: "project:test",
      content: "Old vector-only design.",
      scope: { projectId: "test" },
      status: "superseded",
    })

    const results = await store.searchMemory({
      query: "store",
      limit: 10,
      includeSuperseded: false,
    })
    expect(results).toHaveLength(1)
    expect(results[0]?.content).toContain("PostgreSQL")
  })

  test("creates, searches, promotes, and rejects memory candidates", async () => {
    const store = new InMemoryContinuumStore()
    const candidate = await store.createCandidate({
      candidateType: "decision",
      namespace: "project:test",
      scope: { projectId: "test" },
      content: "Decision: use PostgreSQL as the canonical memory store.",
      confidence: 0.91,
      suggestedMemoryType: "decision",
    })

    const candidates = await store.searchCandidates({
      query: "PostgreSQL",
      projectId: "test",
      limit: 10,
    })
    expect(candidates).toHaveLength(1)

    const promoted = await store.promoteCandidate(candidate.id, {})
    expect(promoted?.memory.memoryType).toBe("decision")
    expect(promoted?.candidate.status).toBe("promoted")

    const rejectable = await store.createCandidate({
      candidateType: "unknown",
      namespace: "project:test",
      content: "This is too trivial to remember.",
    })
    const rejected = await store.rejectCandidate(rejectable.id, "Trivial and not durable.")
    expect(rejected?.status).toBe("rejected")
    expect(rejected?.rejectionReason).toContain("Trivial")
  })
})

describe("context retrieval audit", () => {
  test("creates retrieval request and result records", async () => {
    const store = new InMemoryContinuumStore()
    const memory = await store.createMemory({
      memoryType: "decision",
      namespace: "project:test/decisions",
      scope: { projectId: "test", kind: "decision" },
      content: "Use planned, ranked, audited context packs.",
      confidence: 0.95,
    })

    const request = await store.createContextRetrievalRequest({
      projectId: "test",
      task: "continue context builder work",
      query: "audited context packs",
      strategy: "precision",
      include: ["decisions"],
      maxInputTokens: 12000,
      parameters: { source: "test" },
    })

    const result = await store.createContextRetrievalResult({
      requestId: request.id,
      memoryId: memory.id,
      sectionName: "decisions",
      rank: 1,
      score: 0.91,
      reasons: ["memory type decision matches decisions"],
      included: true,
      estimatedTokens: 20,
    })

    expect(result.requestId).toBe(request.id)
    expect(result.memoryId).toBe(memory.id)
    expect(result.included).toBe(true)
  })
})
