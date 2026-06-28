# Backup and restore

## Backup

```bash
bun run backup:postgres
```

This writes a custom-format PostgreSQL dump and a SHA-256 checksum into:

```txt
.continuum-data/backups/
```

## Restore

Restore only into the intended target database. For local development:

```bash
bun run restore:postgres .continuum-data/backups/<backup-file>.dump
```

The restore script verifies the checksum when `<backup-file>.dump.sha256` is present.

## Recommended cadence

- Local solo development: before major migrations and before release tags.
- Team/shared environment: daily automated backups plus manual backups before migrations.
- Production: managed PostgreSQL backups, point-in-time recovery, and quarterly restore drills.
