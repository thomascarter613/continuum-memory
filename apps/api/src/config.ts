export type ContinuumStoreKind = "memory" | "postgres"

export interface ContinuumConfig {
  apiPort: number
  storeKind: ContinuumStoreKind
  databaseUrl: string
  migrationsDir: string
  defaultContextBudgetTokens: number
  defaultLlmProviderId: string
  openAiCompatibleBaseUrl: string
  openAiCompatibleApiKeyEnv: string
  openAiCompatibleDefaultModel: string
  ollamaBaseUrl: string
  ollamaDefaultModel: string
  anthropicCompatibleBaseUrl: string
  anthropicCompatibleApiKeyEnv: string
  anthropicCompatibleDefaultModel: string
}

function parseStoreKind(value: string | undefined): ContinuumStoreKind {
  if (value === "memory" || value === "postgres") return value
  return "postgres"
}

function parseInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getConfig(): ContinuumConfig {
  return {
    apiPort: parseInteger(process.env.CONTINUUM_API_PORT, 3030),
    storeKind: parseStoreKind(process.env.CONTINUUM_STORE ?? process.env.CONTINUUM_STORAGE_DRIVER),
    databaseUrl:
      process.env.CONTINUUM_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgres://continuum:continuum@localhost:5432/continuum",
    migrationsDir: process.env.CONTINUUM_MIGRATIONS_DIR ?? "infra/migrations",
    defaultContextBudgetTokens: parseInteger(process.env.CONTINUUM_DEFAULT_CONTEXT_BUDGET_TOKENS, 12000),
    defaultLlmProviderId: process.env.CONTINUUM_LLM_DEFAULT_PROVIDER ?? "mock",
    openAiCompatibleBaseUrl: process.env.CONTINUUM_OPENAI_COMPATIBLE_BASE_URL ?? "https://api.openai.com/v1",
    openAiCompatibleApiKeyEnv: process.env.CONTINUUM_OPENAI_COMPATIBLE_API_KEY_ENV ?? "OPENAI_API_KEY",
    openAiCompatibleDefaultModel: process.env.CONTINUUM_OPENAI_COMPATIBLE_DEFAULT_MODEL ?? "provider-default",
    ollamaBaseUrl: process.env.CONTINUUM_OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaDefaultModel: process.env.CONTINUUM_OLLAMA_DEFAULT_MODEL ?? "llama3.1",
    anthropicCompatibleBaseUrl: process.env.CONTINUUM_ANTHROPIC_COMPATIBLE_BASE_URL ?? "https://api.anthropic.com/v1",
    anthropicCompatibleApiKeyEnv: process.env.CONTINUUM_ANTHROPIC_COMPATIBLE_API_KEY_ENV ?? "ANTHROPIC_API_KEY",
    anthropicCompatibleDefaultModel: process.env.CONTINUUM_ANTHROPIC_COMPATIBLE_DEFAULT_MODEL ?? "provider-default",
  }
}
