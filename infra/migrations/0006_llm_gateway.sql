create table if not exists llm_provider_configs (
  id text primary key,
  provider_kind text not null,
  display_name text not null,
  base_url text,
  default_model text,
  api_key_env text,
  enabled boolean not null default true,
  priority integer not null default 100,
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists llm_call_audits (
  id uuid primary key,
  request_kind text not null,
  provider_id text,
  provider_kind text,
  model text,
  project_id text,
  status text not null,
  input_summary text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_llm_provider_configs_enabled_priority
  on llm_provider_configs(enabled, priority, id);

create index if not exists idx_llm_call_audits_project_created
  on llm_call_audits(project_id, created_at desc);

create index if not exists idx_llm_call_audits_provider_created
  on llm_call_audits(provider_id, created_at desc);

create index if not exists idx_llm_call_audits_kind_status
  on llm_call_audits(request_kind, status, created_at desc);
