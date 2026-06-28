create table if not exists artifact_records (
  id uuid primary key,
  artifact_kind text not null,
  namespace text not null,
  project_id text,
  uri text not null,
  path text,
  name text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  sensitivity text not null default 'normal',
  status text not null default 'active',
  content_preview text,
  content_text text,
  metadata jsonb not null default '{}'::jsonb,
  source_event_ids uuid[] not null default '{}'::uuid[],
  source_memory_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_artifact_records_project on artifact_records(project_id);
create index if not exists idx_artifact_records_namespace on artifact_records(namespace);
create index if not exists idx_artifact_records_kind on artifact_records(artifact_kind);
create index if not exists idx_artifact_records_status on artifact_records(status);
create index if not exists idx_artifact_records_path on artifact_records(path);
create index if not exists idx_artifact_records_checksum on artifact_records(checksum);
create index if not exists idx_artifact_records_metadata_gin on artifact_records using gin(metadata);

create table if not exists repo_index_runs (
  id uuid primary key,
  project_id text,
  namespace text not null,
  root_path text not null,
  include_globs text[] not null default '{}'::text[],
  exclude_globs text[] not null default '{}'::text[],
  max_bytes_per_file integer not null,
  artifact_count integer not null default 0,
  ignored_count integer not null default 0,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_repo_index_runs_project on repo_index_runs(project_id);
create index if not exists idx_repo_index_runs_created_at on repo_index_runs(created_at desc);
