import assert from "node:assert/strict";
import test from "node:test";

import { captureReport, isReportId, readReport } from "../functions/lib/report-store.mjs";

const REPORT_ID = "7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a";
const ENV = {
  SUPABASE_URL: "https://project.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
};

function result() {
  return {
    ok: true,
    url: "https://example.com/page?private=1",
    finalUrl: "https://example.com/page?private=1",
    checkedAt: "2026-07-20T12:34:56.000Z",
    httpStatus: 200,
    renderMode: "heuristic",
    renderStatus: "no-credentials",
    renderDelta: { available: false, rawTextChars: 500, renderedTextChars: null, missingPercent: null },
    summary: { pass: 1, warn: 0, fail: 0 },
    botAccess: [],
    content: { visibleTextChars: 500 },
    rendered: null,
    screenshot: "data:image/jpeg;base64,do-not-store",
    llms: { present: false, looksValid: false },
    signals: { metaRobots: {}, contentSignals: [] },
    method: { note: "Method" },
    findings: [],
    citeability: { summary: {}, findings: [] },
    agentic: { mode: "heuristic", summary: {}, findings: [], signals: {} },
  };
}

test("missing server configuration leaves a successful check usable", async () => {
  let calls = 0;
  const outcome = await captureReport(result(), {}, {
    origin: "https://blursor.ai",
    fetch: async () => { calls += 1; },
  });

  assert.deepEqual(outcome, {
    report: null,
    capture: { status: "unconfigured" },
  });
  assert.equal(calls, 0);
});

test("captureReport inserts one allowlisted row with server-only credentials", async () => {
  let request;
  const outcome = await captureReport(result(), ENV, {
    origin: "https://blursor.ai",
    fetch: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify([{ id: REPORT_ID }]), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.deepEqual(outcome, {
    report: { id: REPORT_ID, url: `https://blursor.ai/r/${REPORT_ID}` },
    capture: { status: "stored" },
  });
  assert.equal(request.url, "https://project.supabase.co/rest/v1/check_reports?select=id");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.apikey, "service-role-secret");
  assert.equal(request.init.headers.Authorization, "Bearer service-role-secret");
  assert.equal(request.init.headers.Prefer, "return=representation");

  const row = JSON.parse(request.init.body);
  assert.equal(row.target_url, "https://example.com/page");
  assert.equal(row.result.screenshot, undefined);
  assert.equal(row.source, "user");
});

test("capture failures are generic and never leak upstream bodies", async () => {
  const logged = [];
  const scenarios = [
    async () => new Response("database says leak-me", { status: 500 }),
    async () => new Response("not-json", { status: 201 }),
    async () => new Response(JSON.stringify([{ id: "not-a-uuid" }]), { status: 201 }),
  ];

  for (const fetch of scenarios) {
    const outcome = await captureReport(result(), ENV, {
      origin: "https://blursor.ai",
      fetch,
      logger: { error: (...args) => logged.push(args) },
    });
    assert.deepEqual(outcome, {
      report: null,
      capture: { status: "failed", code: "storage_error" },
    });
    assert.doesNotMatch(JSON.stringify(outcome), /leak-me/);
  }
  assert.equal(logged.length, 3);
  assert.doesNotMatch(JSON.stringify(logged), /leak-me/);
});

test("report IDs use strict UUID syntax", () => {
  assert.equal(isReportId(REPORT_ID), true);
  assert.equal(isReportId(REPORT_ID.toUpperCase()), true);
  assert.equal(isReportId("7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a?select=*"), false);
  assert.equal(isReportId("not-a-uuid"), false);
});

test("readReport rejects invalid IDs and missing configuration before fetch", async () => {
  let calls = 0;
  const fetch = async () => { calls += 1; };

  assert.deepEqual(await readReport("bad", ENV, { fetch }), { status: "invalid" });
  assert.deepEqual(await readReport(REPORT_ID, {}, { fetch }), { status: "unconfigured" });
  assert.equal(calls, 0);
});

test("readReport performs a bounded server-authorized lookup", async () => {
  let request;
  const stored = { ok: true, url: "https://example.com/page", checkedAt: "2026-07-20T12:34:56.000Z" };
  const outcome = await readReport(REPORT_ID, ENV, {
    fetch: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify([{ id: REPORT_ID, result: stored, checked_at: stored.checkedAt }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.deepEqual(outcome, {
    status: "found",
    row: { id: REPORT_ID, result: stored, checked_at: stored.checkedAt },
  });
  assert.match(request.url, /^https:\/\/project\.supabase\.co\/rest\/v1\/check_reports\?/);
  assert.match(request.url, /select=id%2Cresult%2Cchecked_at/);
  assert.match(request.url, new RegExp(`id=eq\\.${REPORT_ID}`));
  assert.match(request.url, /limit=1/);
  assert.equal(request.init.headers.apikey, "service-role-secret");
  assert.equal(request.init.headers.Authorization, "Bearer service-role-secret");
});

test("readReport distinguishes missing rows from upstream failures", async () => {
  const missing = await readReport(REPORT_ID, ENV, {
    fetch: async () => new Response("[]", { status: 200 }),
  });
  const failed = await readReport(REPORT_ID, ENV, {
    fetch: async () => new Response("do-not-leak", { status: 503 }),
    logger: { error: () => {} },
  });

  assert.deepEqual(missing, { status: "missing" });
  assert.deepEqual(failed, { status: "failed" });
});
