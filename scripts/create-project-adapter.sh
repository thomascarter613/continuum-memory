#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
PROJECT_ID="${2:-}"
PROJECT_NAME="${3:-}"

if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: ./scripts/create-project-adapter.sh <target-monorepo> [project-id] [project-name]"
  echo "Alternative: bun run cli -- adapter-install <target-monorepo> --id <project-id> --name '<Project Name>'"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(basename "$TARGET_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')"
fi

if [[ -z "$PROJECT_NAME" ]]; then
  PROJECT_NAME="$PROJECT_ID"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/templates/project-adapter"

mkdir -p "$TARGET_DIR"
cp -R "$TEMPLATE_DIR/." "$TARGET_DIR/"

if command -v perl >/dev/null 2>&1; then
  find "$TARGET_DIR/.memory" "$TARGET_DIR/docs" -type f -print0 | xargs -0 perl -pi -e "s/replace-with-project-id/$PROJECT_ID/g; s/Replace With Project Name/$PROJECT_NAME/g"
  if [[ -f "$TARGET_DIR/AGENTS.md" ]]; then
    perl -pi -e "s/replace-with-project-id/$PROJECT_ID/g; s/Replace With Project Name/$PROJECT_NAME/g" "$TARGET_DIR/AGENTS.md"
  fi
fi

cat <<MSG
Installed Continuum project adapter into: $TARGET_DIR
Project ID: $PROJECT_ID
Project Name: $PROJECT_NAME

Next:
  1. Review $TARGET_DIR/.memory/project.yaml
  2. Review $TARGET_DIR/AGENTS.md
  3. Run: bun --filter @continuum/cli start project-status $TARGET_DIR
MSG
