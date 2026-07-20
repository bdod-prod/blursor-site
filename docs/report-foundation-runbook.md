# Report Foundation Production Runbook

This runbook activates the locally implemented checker capture layer. Every production mutation below remains gated by Alex's explicit approval.

## Change-set boundaries

The branch adds:

- an unapplied hardening migration for `public.blursor_papers`;
- an unapplied `public.check_reports` migration;
- server-only Supabase persistence and report lookup;
- stable `/r/<uuid>` report pages;
- noindex and referrer privacy headers;
- local and CI tests.

It does not add watches, scheduled n8n work, email, analytics, content pages, or any live credential.

## Required production variables

Set only in the Cloudflare Pages production environment:

- `SUPABASE_URL`: the BLURSOR project API URL;
- `SUPABASE_SERVICE_ROLE_KEY`: a server-side secret. Never expose it in HTML, browser JavaScript, GitHub Actions output, a query string, or a public log.

The existing `CF_ACCOUNT_ID` and `CF_BROWSER_TOKEN` variables remain unchanged. Preview deployments may intentionally omit Supabase variables; checks will work but return `capture.status = "unconfigured"` and no stable report URL.

## Phase 1: preflight, read-only

1. Confirm `main` and the deployed production SHA still match the reviewed base or rebase and rerun the full test suite.
2. GET the active n8n workflows that reference Postgres credential `Xu0kpBQmSZzp6zv8`. Save the unmodified JSON in a dated local backup folder.
3. Through that exact n8n Postgres credential, run a read-only preflight query:

   ```sql
   select
     current_user,
     r.rolsuper,
     r.rolbypassrls,
     has_table_privilege(current_user, 'public.blursor_papers', 'select') as can_select,
     (select count(*) from public.blursor_papers) as paper_count
   from pg_roles r
   where r.rolname = current_user;
   ```

4. Stop if the credential cannot read the table.
5. If `current_user` is not the table owner and neither `rolsuper` nor `rolbypassrls` is true, do not apply the hardening migration as written. Add and review a policy limited to the exact n8n database role first.
6. Re-read the live schema, grants, policies, trigger function signature, and row count. The migration assumes:

   - table `public.blursor_papers` exists;
   - function `public.set_blursor_row_updated_at()` exists with no arguments;
   - the table owner is `postgres`;
   - there are no intentional browser-facing policies.

## Phase 2: apply migrations

After explicit approval, apply in order through Supabase's migration mechanism:

1. `supabase/migrations/202607200001_harden_blursor_papers.sql`
2. `supabase/migrations/202607200002_create_check_reports.sql`

Do not paste the SQL into n8n and do not modify workflows for this step.

Immediately inspect:

```sql
select c.relname, c.relrowsecurity, pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('blursor_papers', 'check_reports');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('blursor_papers', 'check_reports')
order by table_name, grantee, privilege_type;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('blursor_papers', 'check_reports');
```

Expected:

- RLS enabled on both tables;
- no `anon` or `authenticated` table grants;
- no browser policies;
- the trigger helper has a fixed `pg_catalog` search path;
- `service_role` has only `SELECT` and `INSERT` on `check_reports`;
- the existing pipeline table contents are unchanged.

Run Supabase's security and performance advisors and preserve their output with the deployment receipts.

## Phase 3: verify the pipeline before site deployment

Using the same n8n credential and without editing a workflow:

1. repeat the read-only preflight query;
2. confirm the paper count is unchanged;
3. confirm the active publish workflow can read its normal eligibility query;
4. do not force a paper state transition merely to test access.

If the credential loses access, stop. Prefer a narrowly scoped policy for its exact role after review. Disabling RLS or restoring anonymous grants is an emergency rollback, not the normal fix.

## Phase 4: configure and deploy the application

1. Add the production `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Pages without printing the key.
2. Deploy the reviewed commit to a preview branch first.
3. Confirm the preview returns `capture.status = "stored"` for a test URL.
4. Review the branch diff and preview receipts.
5. Merge/push to `main` only after Alex explicitly approves this change-set.

## Phase 5: live receipts

Use a public, non-sensitive test page.

1. Run one check and save the response fields: `checkedAt`, `httpStatus`, `renderDelta`, `report.id`, and `report.url`.
2. Query by the exact ID:

   ```sql
   select
     id,
     checked_at,
     target_url,
     final_url,
     source,
     result->>'httpStatus' as http_status,
     result->'renderDelta' as render_delta,
     jsonb_array_length(result->'botAccess') as bot_count,
     created_at
   from public.check_reports
   where id = '<reviewed-report-uuid>';
   ```

3. Open `/r/<uuid>` and confirm it loads without a request to `/api/check`.
4. Confirm headers include:

   - `X-Robots-Tag: noindex, nofollow, noarchive`
   - `Referrer-Policy: no-referrer`
   - `Cache-Control: private, no-store`

5. Confirm the stored JSON has no `screenshot` field and the stored URL has no credentials, query, or fragment.
6. Use `Re-run this page`. Confirm the second result has a different UUID and both immutable rows remain.
7. Test anonymous Data API access to both tables with the project's publishable/anon key. SELECT, INSERT, UPDATE, and DELETE must all fail.
8. Confirm the n8n pipeline still reads its queue and no workflow JSON or active state changed.

## Application rollback

If the deployed application fails while database checks pass:

1. redeploy the last known-good site commit;
2. leave `check_reports` intact for diagnosis;
3. remove or rotate the Cloudflare service-role secret if exposure is suspected;
4. do not drop the table until its rows have been reviewed/exported.

The checker deliberately fails open when capture is unavailable: visitors still receive their current result, but `report` is `null` and no stable URL is claimed. Treat any production `capture.status != "stored"` as an operational failure.

## Database rollback

- `check_reports` creation is additive. Leaving an unused private table is safer than dropping data during an incident.
- If hardening breaks n8n, identify the credential role and add the minimum reviewed access path for that role.
- Restoring `anon`/`authenticated` grants or disabling RLS reopens the original vulnerability and requires Alex's explicit emergency approval.
