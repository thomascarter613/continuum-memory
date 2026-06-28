import type { ContinuumConfig } from "../config"

export interface RuntimeValidationIssue {
  level: "warning" | "error"
  code: string
  message: string
}

export interface RuntimeValidationResult {
  ok: boolean
  issues: RuntimeValidationIssue[]
}

export function validateRuntimeConfig(config: ContinuumConfig): RuntimeValidationResult {
  const issues: RuntimeValidationIssue[] = []

  if (config.storeKind === "postgres" && !config.databaseUrl.startsWith("postgres")) {
    issues.push({
      level: "error",
      code: "invalid_database_url",
      message:
        "CONTINUUM_DATABASE_URL or DATABASE_URL must be a PostgreSQL connection string when CONTINUUM_STORE=postgres.",
    })
  }

  if (config.defaultContextBudgetTokens < 1000) {
    issues.push({
      level: "warning",
      code: "small_context_budget",
      message:
        "CONTINUUM_DEFAULT_CONTEXT_BUDGET_TOKENS is unusually small for handoff/context compilation.",
    })
  }

  if (config.defaultLlmProviderId !== "mock" && config.defaultLlmProviderId.trim().length === 0) {
    issues.push({
      level: "error",
      code: "missing_default_provider",
      message: "CONTINUUM_LLM_DEFAULT_PROVIDER must be set or default to mock.",
    })
  }

  return {
    ok: issues.every((issue) => issue.level !== "error"),
    issues,
  }
}
