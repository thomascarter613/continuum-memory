# Artifact Memory and Repository Indexing Runbook

## Start the API

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

## Create one artifact

```bash
curl -X POST http://localhost:3030/v1/artifacts \
  -H 'content-type: application/json' \
  -d '{
    "artifactKind":"documentation",
    "namespace":"demo/artifacts",
    "projectId":"demo",
    "uri":"file://README.md",
    "path":"README.md",
    "name":"README.md",
    "mimeType":"text/markdown",
    "contentPreview":"Continuum Memory README",
    "metadata":{"createdBy":"manual-smoke-test"}
  }'
```

## Search artifacts

```bash
curl -X POST http://localhost:3030/v1/artifacts/search \
  -H 'content-type: application/json' \
  -d '{"projectId":"demo","query":"README","limit":10}'
```

## Index the current repository

```bash
curl -X POST http://localhost:3030/v1/artifacts/index-repo \
  -H 'content-type: application/json' \
  -d '{
    "projectId":"demo",
    "namespace":"demo/artifacts",
    "rootPath":".",
    "maxFiles":500,
    "maxBytesPerFile":100000,
    "captureContent":false,
    "dryRun":false
  }'
```

## Safety defaults

The indexer excludes `.git`, `node_modules`, build outputs, coverage directories,
`.turbo`, `.next`, `.moon`, and `.continuum-data` by default. Full `contentText`
capture is disabled unless `captureContent` is set to `true`.
