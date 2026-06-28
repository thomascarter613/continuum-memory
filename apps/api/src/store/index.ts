import type { ContinuumConfig } from "../config"
import { createPool } from "../db/pool"
import { InMemoryContinuumStore } from "./in-memory-store"
import { PostgresContinuumStore } from "./postgres-store"
import type { ContinuumStore } from "./types"

export function createStore(config: ContinuumConfig): ContinuumStore {
  if (config.storeKind === "memory") {
    return new InMemoryContinuumStore()
  }

  return new PostgresContinuumStore(createPool(config.databaseUrl))
}

export type { ContinuumStore, StoreHealth } from "./types"
