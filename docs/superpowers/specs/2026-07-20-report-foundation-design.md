# BLURSOR Capture and Stable Report Foundation

Date: 2026-07-20
Status: locally approved under Alex's delegated implementation authority; production activation still requires explicit review

## Scope

This change-set establishes the smallest safe capture layer beneath the existing checker:

1. remove anonymous Data API access from the existing pipeline table;
2. add a server-only store for successful checker results;
3. return an opaque, stable report URL after a check;
4. render a stored report at `/r/<uuid>` with `noindex` controls and a re-run action;
5. preserve a compact semantic snapshot for later weekly change detection.

It does not add watches, email, n8n workflows, analytics, explainer content, or production credentials. Those depend on this foundation and remain separate reviewable changes.

## Evidence and constraints

- The live checker currently returns a result and discards it after the response.
- `public.blursor_papers` is the only public table. It has RLS disabled and grants every table privilege to `anon` and `authenticated`.
- The pipeline uses an n8n Postgres credential, so removing Data API grants from `anon` and `authenticated` should not affect its direct database connection. That still needs a live verification immediately before applying the hardening migration.
- Cloudflare Pages Functions support file-based dynamic routes, and `env.ASSETS.fetch()` can serve the existing checker document at a dynamic `/r/<uuid>` route.
- Supabase's current API security guidance treats table grants and RLS as separate layers. This design uses both: no browser-role grants and RLS enabled with no browser policies.
- The existing checker page contains the report renderer already. Reusing it avoids a second presentation implementation that would drift.

## Options considered

### A. Supabase behind Cloudflare Pages Functions (selected)

Cloudflare performs checks and is the only public application API. It writes and reads Supabase with a server-side secret key. Browsers never receive a Supabase key or table access. The implementation prefers Supabase's opaque `SUPABASE_SECRET_KEY` and temporarily accepts a legacy service-role JWT for migration compatibility.

This fits the existing stack, leaves n8n able to query the same database for scheduled watches later, and keeps authorization in one narrow boundary.

### B. Private schema plus security-definer RPCs

This would hide tables from the Data API and expose carefully written functions. It is valid, but adds function permissions, `search_path`, and RPC maintenance before BLURSOR has an authenticated client. The extra surface is not justified for link-only public reports.

### C. Cloudflare D1 for reports

This gives Cloudflare-native storage but duplicates the existing Supabase data plane and complicates future n8n watch queries. It is rejected unless Supabase becomes operationally unsuitable.

## Data model

`public.check_reports` stores one successful check per row:

- `id uuid`: random opaque report identifier and primary key;
- `checked_at timestamptz`: checker completion time;
- `target_url text`: sanitized URL with credentials, query, and fragment removed;
- `final_url text`: sanitized final URL after redirects;
- `url_fingerprint text`: SHA-256 of the sanitized target URL for grouping without exposing it in indexes or logs;
- `source text`: `user` initially, with `watch` reserved for scheduled checks;
- `result jsonb`: the explicit public report payload, excluding the screenshot and any storage metadata;
- `signal_json jsonb`: a compact, deterministic signal set for later semantic diffs;
- `created_at timestamptz`: database insertion time.

Indexes cover chronological audit queries and the latest checks for a URL fingerprint. Results are immutable through the public application: the Pages service role inserts and selects, while no update route exists.

RLS is enabled and no policy is created for `anon` or `authenticated`. Their table privileges are revoked. `service_role` receives explicit `SELECT` and `INSERT`; retention can be added later through a migration rather than granting unused delete/update access now.

## URL and payload privacy

The checker may be given a public URL containing credentials, query tokens, campaign tags, or fragments. URLs with embedded usernames or passwords are rejected before any fetch. Query strings and fragments may still be used for the live check, but persistent fields are sanitized:

- username and password are removed;
- query and fragment are removed;
- the normalized scheme, host, optional non-default port, and path remain.

The stored payload is built from an allowlist. It retains the information needed to reproduce the report: baseline status, per-bot results and status codes, raw/rendered summary data, render delta, findings, citeability, index/content signals, and agent probe results. It omits the screenshot because base64 images are large and can disclose more page content than the diagnostic report needs.

That allowlist still includes the page title, short finding excerpts, and extracted raw/rendered outline text. The checker discloses this before submission and warns visitors not to paste private or tokenized URLs. Automatic expiry is deliberately not invented in this foundation because it changes the product promise of a stable URL. Production activation is therefore gated on Alex approving either a defined retention window or indefinite unlisted retention with manual takedown. Until that decision is recorded, the migrations and credentials must remain unapplied. Manual takedown is performed by the database owner after verifying the exact UUID; the application service role has no delete privilege.

Stable links are unguessable UUIDs, not an authorization system. Reports are intentionally link-shareable. `/r/<uuid>` responses carry `X-Robots-Tag: noindex, nofollow, noarchive` and `Referrer-Policy: no-referrer`; the JSON endpoint also returns `no-store` and no permissive CORS header.

## Request flow

### New check

1. `GET /api/check?url=...` runs the existing validated check.
2. The function constructs the normal result plus explicit `httpStatus` and `renderDelta` fields.
3. It sanitizes the persistent URLs, allowlists the stored result, builds `signal_json`, and inserts the row through Supabase REST.
4. On success, the response adds `report: { id, url }`.
5. The checker replaces the address bar with `/r/<uuid>`, so the copy action shares the stored snapshot rather than a URL that silently re-runs.

The checker result remains visible if storage is unconfigured or temporarily fails. The response then has `report: null` and a machine-readable `capture.status`. This is a deliberate availability tradeoff: storage failure must be observable, but a storage outage should not erase the expensive diagnostic the visitor just waited for. The production definition of done therefore includes a failing health receipt if any successful check lacks a stored row; it is not satisfied merely because the UI still works.

### Stored report

1. Cloudflare routes `/r/<uuid>` through a Pages Function that serves the existing checker HTML with noindex and referrer headers.
2. The client recognizes the path and requests `GET /api/reports/<uuid>`.
3. The report API validates UUID syntax and selects the row with the server-side Supabase key.
4. It returns the stored allowlisted result and report metadata. Missing reports return 404 without distinguishing deletion from an unknown ID.
5. The existing renderer paints the snapshot. The result screen offers `Re-run this page`, which creates a new report rather than changing the historical row.

## Failure handling

- Missing Supabase configuration: the live check succeeds with `capture.status = "unconfigured"`; report lookup returns 503.
- Insert failure or malformed Supabase response: the live check succeeds with `capture.status = "failed"`; details are logged server-side but the browser receives only a stable error code.
- Invalid report ID: 404 before any database request.
- Unknown report: 404.
- Supabase read failure: 502 with a generic response.
- Asset serving failure at `/r/<uuid>`: the original upstream status is preserved.

No endpoint accepts a client-provided report body, ID, timestamp, or source.

## Security hardening migration

The hardening is a separate migration from report-table creation so it can be reviewed and applied independently:

- enable RLS on `public.blursor_papers`;
- revoke all table privileges from `anon` and `authenticated`;
- revoke direct execution of its trigger helper from `PUBLIC`, `anon`, and `authenticated`;
- fix the trigger helper's mutable search path to `pg_catalog`;
- change Postgres default privileges in `public` so future tables, sequences, and functions are not automatically exposed to browser roles.

Immediately before production application, verify the n8n credential's database user, run one read-only pipeline query, and inspect the trigger function's current configuration. Immediately after, inspect the function definition and `proconfig`, then verify the trigger through a reviewed update inside a transaction that is rolled back. Confirm requests using the publishable/anon key can neither select nor mutate `blursor_papers`.

## Verification

Local automated tests cover URL sanitization, fingerprint stability, payload allowlisting, screenshot exclusion, semantic snapshots, Supabase request headers/body, failure modes, UUID validation, API lookup behavior, and stable-route headers.

Production activation requires separate approval and receipts:

1. migration output and Supabase security advisor output;
2. anonymous SELECT/INSERT/UPDATE/DELETE denial on `blursor_papers` and `check_reports`;
3. an n8n pipeline read and controlled rolled-back trigger update check;
4. a real checker run whose response ID exists in `check_reports`;
5. the stable URL loads without invoking `/api/check`;
6. response headers and rendered markup prove `noindex`;
7. re-run produces a different ID and leaves the original row unchanged.

## Self-review decisions

- A public read policy was rejected because link secrecy should be enforced at the application boundary, not by exposing the whole table through PostgREST.
- Screenshots were excluded to control storage cost and reduce accidental page-content disclosure.
- Credential-bearing URLs are rejected; query-bearing URLs remain supported but are stripped from stored URLs and carry a pre-submit warning.
- Persistence is fail-open for checker availability, but the UI never fabricates a stable link when capture fails.
- Results are snapshots, not mutable canonical records; each re-run inserts a new row.
- Watch subscriptions are intentionally absent. Adding email before SPF/DKIM/DMARC and change semantics are ready would produce an unreliable and potentially noisy product.
