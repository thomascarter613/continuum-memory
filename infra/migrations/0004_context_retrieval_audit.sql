create table if not exists context_retrieval_requests (
  id uuid primary key,
  project_id text,
  task text not null,
  query text,
  strategy text not null,
  include text[] not null default array[]::text[],
  max_input_tokens integer not null,
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists context_retrieval_results (
  id uuid primary key,
  request_id uuid not null references context_retrieval_requests(id) on delete cascade,
  memory_id uuid not null references memory_records(id) on delete cascade,
  section_name text not null,
  rank integer not null,
  score numeric not null check (score >= 0 and score <= 1),
  reasons text[] not null default array[]::text[],
  included boolean not null default true,
  estimated_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_context_retrieval_requests_project_created
  on context_retrieval_requests(project_id, created_at desc);

create index if not exists idx_context_retrieval_results_request_rank
  on context_retrieval_results(request_id, section_name, rank);

create index if not exists idx_context_retrieval_results_memory
  on context_retrieval_results(memory_id);
