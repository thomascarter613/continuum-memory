#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/sample-project"
cat > "$TMP_DIR/sample-project/README.md" <<'EOF'
# Sample Project

This is a sample project for Continuum CLI workflow smoke testing.
EOF

bun run cli -- adapter-install "$TMP_DIR/sample-project" --id sample-project --name "Sample Project"
bun run cli -- project-status "$TMP_DIR/sample-project"

test -f "$TMP_DIR/sample-project/.memory/project.yaml"
test -f "$TMP_DIR/sample-project/AGENTS.md"
test -f "$TMP_DIR/sample-project/docs/work/current-state.md"

echo "CLI workflow smoke test passed."
