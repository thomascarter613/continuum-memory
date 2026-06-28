#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${CONTINUUM_BACKUP_DIR:-.continuum-data/backups}"
DATABASE_URL="${CONTINUUM_DATABASE_URL:-${DATABASE_URL:-postgres://continuum:continuum@localhost:5432/continuum}}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/continuum-postgres-$STAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --file="$OUT"
sha256sum "$OUT" > "$OUT.sha256"

echo "Wrote backup: $OUT"
echo "Wrote checksum: $OUT.sha256"
