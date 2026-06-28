#!/usr/bin/env bash
set -euo pipefail

bun run infra:up
bun run db:migrate
bun run dev &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT
sleep 2
bun run web:dev
