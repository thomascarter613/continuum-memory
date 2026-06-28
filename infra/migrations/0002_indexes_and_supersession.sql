create index if not exists idx_memory_events_project_id on memory_events(project_id);
create index if not exists idx_memory_events_occurred_at on memory_events(occurred_at desc);
create index if not exists idx_memory_events_event_type on memory_events(event_type);

create index if not exists idx_memory_records_namespace on memory_records(namespace);
create index if not exists idx_memory_records_memory_type on memory_records(memory_type);
create index if not exists idx_memory_records_status on memory_records(status);
create index if not exists idx_memory_records_updated_at on memory_records(updated_at desc);
create index if not exists idx_memory_records_scope_gin on memory_records using gin(scope);
create index if not exists idx_memory_records_content_trgm on memory_records using gin(to_tsvector('english', content));

create index if not exists idx_handoff_packs_project_id on handoff_packs(project_id);
create index if not exists idx_handoff_packs_created_at on handoff_packs(created_at desc);

create or replace function continuum_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_memory_records_touch_updated_at on memory_records;
create trigger trg_memory_records_touch_updated_at
before update on memory_records
for each row
execute function continuum_touch_updated_at();
