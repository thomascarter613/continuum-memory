create table if not exists policy_decisions (
  id uuid primary key,
  action text not null,
  decision text not null,
  project_id text,
  actor_id text,
  namespace text,
  target_type text,
  target_id text,
  sensitivity text not null default 'normal',
  reasons text[] not null default '{}',
  obligations text[] not null default '{}',
  input jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_policy_decisions_action_created_at on policy_decisions (action, created_at desc);
create index if not exists idx_policy_decisions_project_created_at on policy_decisions (project_id, created_at desc);
create index if not exists idx_policy_decisions_decision on policy_decisions (decision);

create table if not exists memory_evaluations (
  id uuid primary key,
  evaluation_kind text not null,
  target_type text not null,
  target_id text,
  project_id text,
  score numeric not null,
  passed boolean not null,
  findings jsonb not null default '[]'::jsonb,
  recommendations text[] not null default '{}',
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_memory_evaluations_kind_created_at on memory_evaluations (evaluation_kind, created_at desc);
create index if not exists idx_memory_evaluations_target on memory_evaluations (target_type, target_id);
create index if not exists idx_memory_evaluations_project_created_at on memory_evaluations (project_id, created_at desc);
create index if not exists idx_memory_evaluations_passed on memory_evaluations (passed);
