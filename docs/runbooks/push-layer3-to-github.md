# Runbook: Push Layer 3 to GitHub

The canonical GitHub repository is:

```txt
https://github.com/thomascarter613/continuum-memory.git
```

Use this runbook after unzipping the Layer 3 scaffold.

## Option A: Fresh empty remote repository

```bash
git clone https://github.com/thomascarter613/continuum-memory.git
cd continuum-memory

# From another terminal or file manager, copy the scaffold contents into this cloned directory.
# If you unzipped this package and are inside the outer extracted folder, you can run:
rsync -a --delete ../continuum-memory/ ./

git status
git add .
git commit -m "feat: scaffold continuum memory layer 3"
git push -u origin main
```

## Option B: Existing local repository

From inside your existing local clone:

```bash
rsync -a --delete /path/to/extracted/continuum-memory/ ./
git status
git add .
git commit -m "feat: add context retrieval layer"
git push
```

## Verify after pushing

```bash
bun install
bun run infra:up
bun run db:migrate
bun run check
bun run dev
```

In another terminal:

```bash
bun run smoke:api
```
