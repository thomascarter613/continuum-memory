# Push Layer 5 to GitHub

Canonical repository:

```txt
https://github.com/thomascarter613/continuum-memory.git
```

## Commands

```bash
unzip continuum-memory-layer5.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add governance and evaluation layer"
git push -u origin main
```

## Verify locally

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run check
bun run smoke:api
```
