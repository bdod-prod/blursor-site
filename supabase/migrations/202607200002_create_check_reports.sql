begin;

create table public.check_reports (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null,
  target_url text not null,
  final_url text not null,
  url_fingerprint text not null,
  source text not null default 'user',
  result jsonb not null,
  signal_json jsonb not null,
  created_at timestamptz not null default now(),
  constraint check_reports_source_valid check (source in ('user', 'watch')),
  constraint check_reports_result_object check (jsonb_typeof(result) = 'object'),
  constraint check_reports_signal_object check (jsonb_typeof(signal_json) = 'object')
);

create index check_reports_checked_at_idx
  on public.check_reports (checked_at desc);

create index check_reports_url_fingerprint_checked_at_idx
  on public.check_reports (url_fingerprint, checked_at desc);

alter table public.check_reports enable row level security;

-- All access goes through trusted server-side code. No browser policy exists.
revoke all privileges on table public.check_reports from public, anon, authenticated;
grant select, insert on table public.check_reports to service_role;

commit;
