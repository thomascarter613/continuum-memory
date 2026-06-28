export const releaseInfo = {
  name: "continuum-memory",
  version: "0.1.0",
  releasePhase: "v1-readiness",
  apiContract: "v1",
} as const

export function runtimeInfo() {
  return {
    ...releaseInfo,
    runtime: "bun",
    timestamp: new Date().toISOString(),
  }
}
