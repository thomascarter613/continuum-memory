#!/usr/bin/env bash
set -euo pipefail

VERSION="$(cat VERSION)"
OUT_DIR="dist/release"
mkdir -p "$OUT_DIR"
ARCHIVE="$OUT_DIR/continuum-memory-v${VERSION}.tar.gz"

git ls-files > "$OUT_DIR/files.txt" 2>/dev/null || find . -type f   -not -path './.git/*'   -not -path './node_modules/*'   -not -path './.continuum-data/*'   -not -path './dist/*' | sed 's#^./##' > "$OUT_DIR/files.txt"

tar --exclude='.git' --exclude='node_modules' --exclude='.continuum-data' --exclude='dist' -czf "$ARCHIVE" .
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

echo "Created $ARCHIVE"
echo "Created $ARCHIVE.sha256"
