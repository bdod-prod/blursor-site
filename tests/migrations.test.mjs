import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const HARDENING = new URL(
  "../supabase/migrations/202607200001_harden_blursor_papers.sql",
  import.meta.url,
);
const REPORTS = new URL(
  "../supabase/migrations/202607200002_create_check_reports.sql",
  import.meta.url,
);

test("hardening migration closes browser-role access to the pipeline table", async () => {
  const sql = (await readFile(HARDENING, "utf8")).toLowerCase();

  assert.match(sql, /alter table public\.blursor_papers enable row level security/);
  assert.match(sql, /revoke all (privileges )?on table public\.blursor_papers from anon, authenticated/);
  assert.match(sql, /revoke execute on function public\.set_blursor_row_updated_at\(\) from public, anon, authenticated/);
  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke all on tables from anon, authenticated/);
  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke all on sequences from anon, authenticated/);
  assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke execute on functions from public, anon, authenticated/);
});

test("report migration creates a private append-only report store", async () => {
  const sql = (await readFile(REPORTS, "utf8")).toLowerCase();

  assert.match(sql, /create table public\.check_reports/);
  for (const column of [
    "id uuid",
    "checked_at timestamptz",
    "target_url text",
    "final_url text",
    "url_fingerprint text",
    "source text",
    "result jsonb",
    "signal_json jsonb",
    "created_at timestamptz",
  ]) {
    assert.ok(sql.includes(column), `missing column contract: ${column}`);
  }

  assert.match(sql, /alter table public\.check_reports enable row level security/);
  assert.match(sql, /revoke all (privileges )?on table public\.check_reports from public, anon, authenticated/);
  assert.match(sql, /grant select, insert on table public\.check_reports to service_role/);
  assert.doesNotMatch(sql, /grant[^;]*(update|delete|truncate)[^;]*service_role/);
  assert.match(sql, /create index check_reports_checked_at_idx/);
  assert.match(sql, /create index check_reports_url_fingerprint_checked_at_idx/);
});
