# Repository Artifact Indexing Prompt Contract

Use artifact records to describe durable project artifacts without treating the
artifact index as the canonical source of code truth. Git remains the canonical
source of files. Continuum artifact memory records:

- path, uri, kind, size, checksum, and content preview
- project and namespace ownership
- sensitivity and status
- source event / memory links where available

Do not capture full file content for sensitive files. Prefer metadata and small
content previews unless the user explicitly opts into content capture.
