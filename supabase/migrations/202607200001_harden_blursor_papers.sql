begin;

-- The pipeline uses a direct n8n Postgres credential. Browser-facing Data API
-- roles do not need any access to its operational state.
alter table public.blursor_papers enable row level security;
revoke all privileges on table public.blursor_papers from anon, authenticated;

-- This trigger helper is invoked by the table trigger, not by browser clients.
revoke execute on function public.set_blursor_row_updated_at() from public, anon, authenticated;
alter function public.set_blursor_row_updated_at() set search_path = pg_catalog;

-- Existing Supabase projects may automatically grant browser roles access to
-- new public objects. Make new objects private unless a later migration opts in.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
