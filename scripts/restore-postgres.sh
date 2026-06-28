#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup.dump>" >&2
  exit 1
fi

BACKUP="$1"
DATABASE_URL="${CONTINUUM_DATABASE_URL:-${DATABASE_URL:-postgres://continuum:continuum@localhost:5432/continuum}}"

if [[ -f "$BACKUP.sha256" ]]; then
  sha256sum --check "$BACKUP.sha256"
fi

pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$BACKUP"
echo "Restored backup: $BACKUP"
