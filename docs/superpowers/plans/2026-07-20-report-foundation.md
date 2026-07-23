# BLURSOR Capture and Stable Report Foundation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Persist every successful checker result in a server-only Supabase table and give it an opaque, noindex, stable report URL without exposing Supabase to the browser.

**Architecture:** Cloudflare Pages Functions remain the public application boundary. Pure `.mjs` helpers sanitize and allowlist report data, build a semantic snapshot, and communicate with Supabase REST using a server-only secret key. Thin file-routed Functions expose report reads and serve the existing checker UI at `/r/<uuid>`.

**Tech Stack:** Cloudflare Pages Functions, JavaScript ES modules, Node 20 built-in test runner, Supabase Postgres/PostgREST, static HTML/CSS/JavaScript.

---

## Task 1: Add the database security migrations

**Files:**

- Create: `supabase/migrations/202607200001_harden_blursor_papers.sql`
- Create: `supabase/migrations/202607200002_create_check_reports.sql`
- Create: `tests/migrations.test.mjs`

**Step 1: Write the failing migration-contract tests**

Assert that the hardening migration enables RLS, revokes browser-role table access and trigger-function execution, fixes the trigger function search path, and changes default privileges. Assert that the report migration creates the required columns and indexes, enables RLS, revokes browser roles, and grants only `SELECT, INSERT` to `service_role`.

**Step 2: Run the test and verify it fails**

Run: `node --test tests/migrations.test.mjs`

Expected: FAIL because the migration files do not exist.

**Step 3: Write the minimum migrations**

Keep hardening separate from table creation. Make each migration transactional and idempotent where practical. Do not apply either migration to production.

**Step 4: Run the test and verify it passes**

Run: `node --test tests/migrations.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add supabase/migrations tests/migrations.test.mjs
git commit -m "security: add report store migrations"
```

## Task 2: Build the report model test-first

**Files:**

- Create: `functions/lib/report-model.mjs`
- Create: `tests/report-model.test.mjs`

**Step 1: Write failing tests**

Cover:

- URL userinfo, query, and fragment removal;
- normalized URL fingerprint stability;
- explicit result allowlisting;
- screenshot and unknown-field exclusion;
- sanitization of stored `url`, `finalUrl`, and canonical URL;
- deterministic render-delta calculation;
- compact semantic snapshot shape;
- report-row construction with `source = user`.

**Step 2: Run the tests and verify they fail**

Run: `node --test tests/report-model.test.mjs`

Expected: FAIL because the module does not exist.

**Step 3: Implement the minimum model**

Use Web Platform APIs available in both Workers and Node 20 (`URL`, `crypto.subtle`, `TextEncoder`). Deep-clone only explicitly selected JSON fields. Do not store screenshots.

**Step 4: Run the tests and verify they pass**

Run: `node --test tests/report-model.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add functions/lib/report-model.mjs tests/report-model.test.mjs
git commit -m "feat: model stored checker reports"
```

## Task 3: Build the Supabase report store test-first

**Files:**

- Create: `functions/lib/report-store.mjs`
- Create: `tests/report-store.test.mjs`

**Step 1: Write failing tests**

Cover:

- missing environment returns `capture.status = unconfigured` without calling fetch;
- insert uses the project REST endpoint, server-only authorization headers, `return=representation`, and one allowlisted row;
- successful insert returns an absolute stable URL;
- upstream error, invalid JSON, and invalid/missing UUID return a generic failed capture without leaking response bodies;
- report reads validate UUIDs before fetching, use a bounded select, and distinguish found, missing, unconfigured, and upstream failure states.

**Step 2: Run the tests and verify they fail**

Run: `node --test tests/report-store.test.mjs`

Expected: FAIL because the module does not exist.

**Step 3: Implement the minimum store**

Accept injected `fetch` and logger dependencies for deterministic tests. Prefer `SUPABASE_SECRET_KEY`, retain a temporary legacy-JWT fallback, and keep credential details out of returned errors. Return structured store outcomes so HTTP wrappers can choose status codes.

**Step 4: Run the tests and verify they pass**

Run: `node --test tests/report-store.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add functions/lib/report-store.mjs tests/report-store.test.mjs
git commit -m "feat: add server-only report store"
```

## Task 4: Add report HTTP and stable-page handlers test-first

**Files:**

- Create: `functions/lib/report-handlers.mjs`
- Create: `functions/api/reports/[id].js`
- Create: `functions/r/[id].js`
- Create: `tests/report-handlers.test.mjs`

**Step 1: Write failing handler tests**

Cover:

- invalid and unknown IDs return 404;
- unconfigured storage returns 503;
- Supabase failure returns a generic 502;
- a found report returns the original result plus stable report metadata and no-store/noindex headers;
- the `/r/<uuid>` handler validates IDs, obtains the existing checker through `env.ASSETS.fetch`, preserves the asset status/body, and adds `X-Robots-Tag` and `Referrer-Policy`.

**Step 2: Run the tests and verify they fail**

Run: `node --test tests/report-handlers.test.mjs`

Expected: FAIL because the handler module does not exist.

**Step 3: Implement pure handlers and thin route wrappers**

Keep the `.js` route files limited to passing Pages context into tested `.mjs` functions.

**Step 4: Run the tests and verify they pass**

Run: `node --test tests/report-handlers.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add functions/lib/report-handlers.mjs functions/api/reports functions/r tests/report-handlers.test.mjs
git commit -m "feat: serve stored reports at stable routes"
```

## Task 5: Capture successful checks

**Files:**

- Modify: `functions/api/check.js:1-10,169-280`
- Create: `tests/check-capture-wiring.test.mjs`

**Step 1: Write a failing wiring test**

Assert that the checker imports the tested capture service, adds `httpStatus` and `renderDelta` to the result, captures only after a successful result is constructed, and merges the capture outcome into the response.

**Step 2: Run the test and verify it fails**

Run: `node --test tests/check-capture-wiring.test.mjs`

Expected: FAIL because the checker is not wired to persistence.

**Step 3: Refactor the success return minimally**

Construct a result object, calculate render delta, call `captureReport(result, env, { origin: reqUrl.origin })`, and return the existing result plus `report` and `capture`. Do not alter error-result persistence in this change-set.

**Step 4: Run targeted tests and syntax checks**

Run: `node --test tests/check-capture-wiring.test.mjs tests/report-model.test.mjs tests/report-store.test.mjs`

Run: `node --check functions/api/check.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add functions/api/check.js tests/check-capture-wiring.test.mjs
git commit -m "feat: persist completed checker runs"
```

## Task 6: Load and share stable reports in the checker UI

**Files:**

- Modify: `ai-crawler-checker.html:1760-1885,2070-2185,2783-2835,2890-2904`
- Create: `tests/checker-report-ui.test.mjs`

**Step 1: Write failing UI contract tests**

Assert that the active checker script:

- recognizes `/r/<uuid>`;
- fetches `/api/reports/<uuid>` instead of starting a fresh check;
- uses `report.url` after a successful fresh check;
- renders stored results through the existing report renderer;
- gives stored reports a `Re-run this page` action;
- preserves query-based behavior when persistence is unavailable.

**Step 2: Run the test and verify it fails**

Run: `node --test tests/checker-report-ui.test.mjs`

Expected: FAIL because stable-report behavior is absent.

**Step 3: Implement the minimum UI wiring**

Track the active report URL, add a report fetch path, and pass result data into the share controls. Avoid rewriting the report renderer or changing compare-mode semantics.

**Step 4: Run the UI contract test**

Run: `node --test tests/checker-report-ui.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add ai-crawler-checker.html tests/checker-report-ui.test.mjs
git commit -m "feat: load and share stable checker reports"
```

## Task 7: Add repository-wide verification and operational documentation

**Files:**

- Create: `package.json`
- Modify: `.github/workflows/deploy.yml`
- Create: `.env.example`
- Create: `docs/report-foundation-runbook.md`

**Step 1: Add a single local/CI test command**

Create a dependency-free `package.json` whose `test` script runs `node --test`. Add the test step before the research-index build in CI.

**Step 2: Document configuration without secrets**

List `SUPABASE_URL`, preferred `SUPABASE_SECRET_KEY`, the temporary legacy-key fallback, and browser-rendering variables in `.env.example`. The runbook must separate local checks, migration approval, production configuration, live smoke testing, and rollback.

**Step 3: Run full verification**

Run: `npm test`

Run: `node --check functions/api/check.js`

Run: `node --check scripts/build-research-index.js`

Run: `git diff --check main...HEAD`

Expected: all PASS.

Run the research-index builder only after recording the before state. Revert generated drift if it is unrelated to this change-set.

**Step 4: Inspect the complete diff**

Run: `git diff --stat main...HEAD`

Run: `git diff main...HEAD -- functions supabase tests ai-crawler-checker.html .github/workflows/deploy.yml package.json .env.example docs/report-foundation-runbook.md`

Confirm that no secret, screenshot payload, production project key, n8n write, or deployment action is present.

**Step 5: Commit**

```bash
git add package.json .github/workflows/deploy.yml .env.example docs/report-foundation-runbook.md
git commit -m "chore: verify and document report capture"
```

## Task 8: Finish the branch without production mutation

Use `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch`.

Leave the branch local unless Alex explicitly asks for a push. Report:

- worktree and branch paths;
- commit list;
- test and syntax-check receipts;
- database facts verified read-only;
- exact migrations and environment changes awaiting approval;
- known limitations, especially fail-open capture and the absence of watch/email/analytics work.
