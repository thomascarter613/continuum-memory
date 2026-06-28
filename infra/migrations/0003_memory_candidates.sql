create table if not exists memory_candidates (
  id uuid primary key,
  candidate_type text not null,
  namespace text not null,
  scope jsonb not null default '{}'::jsonb,
  content text not null,
  structured_content jsonb,
  source_event_ids uuid[] not null default '{}',
  source_artifact_ids uuid[] not null default '{}',
  confidence numeric not null default 0.5,
  sensitivity text not null default 'normal',
  status text not null default 'proposed',
  rationale text,
  suggested_memory_type text,
  suggested_actions text[] not null default '{}',
  rejection_reason text,
  promoted_memory_id uuid references memory_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_memory_candidates_namespace on memory_candidates(namespace);
create index if not exists idx_memory_candidates_status on memory_candidates(status);
create index if not exists idx_memory_candidates_candidate_type on memory_candidates(candidate_type);
create index if not exists idx_memory_candidates_scope_gin on memory_candidates using gin(scope);
create index if not exists idx_memory_candidates_content_tsv on memory_candidates using gin(to_tsvector('english', content));
create index if not exists idx_memory_candidates_updated_at on memory_candidates(updated_at desc);
