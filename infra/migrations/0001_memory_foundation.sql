create extension if not exists vector;

create table if not exists memory_events (
  id uuid primary key,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  subject_type text,
  subject_id text,
  project_id text,
  conversation_id text,
  session_id text,
  run_id text,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  causation_id uuid,
  correlation_id uuid,
  checksum text
);

create table if not exists memory_records (
  id uuid primary key,
  memory_type text not null,
  namespace text not null,
  scope jsonb not null default '{}'::jsonb,
  content text not null,
  structured_content jsonb,
  source_event_ids uuid[] not null default '{}',
  source_artifact_ids uuid[] not null default '{}',
  confidence numeric not null default 0.5,
  sensitivity text not null default 'normal',
  status text not null default 'active',
  valid_from timestamptz,
  valid_to timestamptz,
  supersedes uuid,
  superseded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists semantic_facts (
  id uuid primary key,
  subject text not null,
  predicate text not null,
  object text not null,
  qualifiers jsonb,
  namespace text not null,
  confidence numeric not null default 0.5,
  evidence_ids uuid[] not null default '{}',
  valid_from timestamptz,
  valid_to timestamptz,
  supersedes uuid,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists handoff_packs (
  id uuid primary key,
  project_id text,
  title text not null,
  objective text not null,
  markdown text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
