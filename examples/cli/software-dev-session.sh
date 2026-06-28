#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-../your-product-monorepo}"
PROJECT_ID="${2:-your-product}"
PROJECT_NAME="${3:-Your Product}"

bun run cli -- adapter-install "$PROJECT_DIR" --id "$PROJECT_ID" --name "$PROJECT_NAME"
bun run cli -- project-status "$PROJECT_DIR"
bun run cli -- repo-index-workflow "$PROJECT_DIR" --max-files 500
bun run cli -- context-export "$PROJECT_DIR" --task "continue current software development task"
bun run cli -- handoff-save "$PROJECT_DIR" --objective "resume current software development work in the next chat"
