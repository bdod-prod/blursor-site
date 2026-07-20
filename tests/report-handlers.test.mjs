import assert from "node:assert/strict";
import test from "node:test";

import {
  getStableReportPageResponse,
  getStoredReportResponse,
} from "../functions/lib/report-handlers.mjs";

const REPORT_ID = "7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a";
const ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

test("stored report handler returns the same 404 for invalid and unknown IDs", async () => {
  const request = new Request(`https://blursor.ai/api/reports/${REPORT_ID}`);
  const invalid = await getStoredReportResponse({
    params: { id: "bad" },
    request,
    env: ENV,
    fetch: async () => { throw new Error("should not fetch"); },
  });
  const missing = await getStoredReportResponse({
    params: { id: REPORT_ID },
    request,
    env: ENV,
    fetch: async () => new Response("[]", { status: 200 }),
  });

  assert.equal(invalid.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await invalid.json(), await missing.json());
});

test("stored report handler distinguishes unconfigured storage from upstream failure", async () => {
  const request = new Request(`https://blursor.ai/api/reports/${REPORT_ID}`);
  const unconfigured = await getStoredReportResponse({ params: { id: REPORT_ID }, request, env: {} });
  const failed = await getStoredReportResponse({
    params: { id: REPORT_ID },
    request,
    env: ENV,
    fetch: async () => new Response("secret upstream details", { status: 503 }),
    logger: { error: () => {} },
  });

  assert.equal(unconfigured.status, 503);
  assert.equal(failed.status, 502);
  assert.doesNotMatch(JSON.stringify(await failed.json()), /secret upstream details/);
});

test("stored report handler returns the snapshot with stable metadata and privacy headers", async () => {
  const request = new Request(`https://blursor.ai/api/reports/${REPORT_ID}`);
  const result = {
    version: 1,
    ok: true,
    url: "https://example.com/page",
    checkedAt: "2026-07-20T12:34:56.000Z",
  };
  const response = await getStoredReportResponse({
    params: { id: REPORT_ID },
    request,
    env: ENV,
    fetch: async () => new Response(JSON.stringify([{
      id: REPORT_ID,
      result,
      checked_at: result.checkedAt,
    }]), { status: 200, headers: { "Content-Type": "application/json" } }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.deepEqual(await response.json(), {
    ...result,
    report: { id: REPORT_ID, url: `https://blursor.ai/r/${REPORT_ID}` },
    capture: { status: "stored" },
  });
});

test("stable report page rejects malformed IDs before loading an asset", async () => {
  let calls = 0;
  const response = await getStableReportPageResponse({
    params: { id: "../../private" },
    request: new Request("https://blursor.ai/r/not-valid"),
    env: { ASSETS: { fetch: async () => { calls += 1; } } },
  });

  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});

test("stable report page serves the checker shell with noindex and no-referrer headers", async () => {
  let requestedUrl;
  const upstream = new Response("<!doctype html><title>Checker</title>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"asset-tag"' },
  });
  const response = await getStableReportPageResponse({
    params: { id: REPORT_ID },
    request: new Request(`https://blursor.ai/r/${REPORT_ID}`),
    env: { ASSETS: { fetch: async (request) => { requestedUrl = String(request.url || request); return upstream; } } },
  });

  assert.equal(requestedUrl, "https://blursor.ai/ai-crawler-checker");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Location"), null);
  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("ETag"), '"asset-tag"');
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.match(await response.text(), /<title>Checker<\/title>/);
});
