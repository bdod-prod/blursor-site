import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReportRow,
  buildSignalSnapshot,
  buildStoredResult,
  calculateRenderDelta,
  fingerprintUrl,
  sanitizeStoredUrl,
} from "../functions/lib/report-model.mjs";

function sampleResult() {
  return {
    ok: true,
    url: "https://user:pass@Example.com:443/article?token=secret#section",
    finalUrl: "https://example.com/article?redirect_secret=yes",
    checkedAt: "2026-07-20T12:34:56.000Z",
    httpStatus: 200,
    renderMode: "rendered",
    renderStatus: "ok",
    renderDelta: {
      available: true,
      rawTextChars: 800,
      renderedTextChars: 1000,
      missingPercent: 20,
    },
    summary: { pass: 4, warn: 1, fail: 0 },
    botAccess: [{
      token: "GPTBot",
      label: "GPTBot",
      group: "OpenAI",
      owner: "OpenAI",
      rendersJS: false,
      robots: "allowed",
      server: "ok",
      status: 200,
      source: "https://reader:secret@example.org/bot-docs?private=drop#fragment",
      secret: "drop-me",
    }],
    content: {
      title: "Example",
      titleLength: 7,
      metaDescription: "A useful page.",
      metaDescriptionLength: 14,
      canonical: "https://example.com/article?canonical_token=secret#part",
      headings: { h1: 1, h2: 2, h3: 0 },
      headingOrderOk: true,
      hasJsonLd: true,
      jsonLdTypes: ["Article"],
      visibleTextChars: 800,
      htmlBytes: 4000,
      scriptBytes: 1200,
      textRatio: 0.2,
      looksLikeJsShell: false,
      frameworkHint: null,
      outline: [{ tag: "h1", text: "Example" }],
      firstParagraph: "A useful page with enough text to inspect.",
      secret: "drop-me",
    },
    rendered: {
      visibleTextChars: 1000,
      headings: { h1: 1, h2: 2, h3: 0 },
      hasJsonLd: true,
      outline: [{ tag: "h1", text: "Example" }],
      secret: "drop-me",
    },
    screenshot: "data:image/jpeg;base64,very-large-and-sensitive",
    llms: { present: false, looksValid: false, secret: "drop-me" },
    signals: {
      metaRobots: {
        records: [{
          source: "meta",
          name: "robots",
          content: "index,follow",
          directives: ["index", "follow"],
          noindex: false,
          noai: false,
          secret: "drop-me",
        }],
        hasNoindex: false,
        hasNoai: false,
      },
      contentSignals: [{ raw: "ai-train=yes", directives: ["ai-train=yes"], secret: "drop-me" }],
      secret: "drop-me",
    },
    method: { note: "Published user-agent probes.", secret: "drop-me" },
    findings: [{
      id: "robots",
      label: "Server lets AI crawlers through",
      status: "pass",
      detail: "No blocks found.",
      why: "Bots need access.",
      source: { label: "Research", url: "https://reader:secret@blursor.ai/research/source?private=drop#fragment", secret: "drop-me" },
      copyLabel: "Suggested text",
      copyText: "User-agent: GPTBot",
      secret: "drop-me",
    }],
    citeability: {
      summary: { pass: 1, warn: 0, fail: 0, info: 0 },
      findings: [{ id: "cite-stats", label: "Statistics present", status: "pass" }],
      secret: "drop-me",
    },
    agentic: {
      mode: "measured",
      summary: { pass: 2, warn: 0, fail: 0, info: 1 },
      findings: [{ id: "agent-labels", label: "Controls labeled", status: "pass" }],
      signals: {
        webmcp: { present: false, runtime: false, tools: null, source: null, secret: "drop-me" },
        a11y: { interactive: 4, unnamed: 0, unnamedSamples: [], fields: 1, fieldsNoLabel: 0, images: 2, imagesNoAlt: 0, hasMain: true, landmarks: 3, h1: 1, approx: false, secret: "drop-me" },
        cls: 0.01,
        lcp: 900,
        imgRisk: 0,
        secret: "drop-me",
      },
      secret: "drop-me",
    },
    internalDebug: { secret: "drop-me" },
  };
}

test("sanitizeStoredUrl removes userinfo, query, fragment, and default ports", () => {
  assert.equal(
    sanitizeStoredUrl("https://user:pass@Example.COM:443/article?token=secret#section"),
    "https://example.com/article",
  );
  assert.equal(
    sanitizeStoredUrl("http://Example.COM:8080/path?q=1"),
    "http://example.com:8080/path",
  );
  assert.throws(() => sanitizeStoredUrl("not a URL"), /valid http or https URL/i);
});

test("fingerprintUrl groups query variants of the same sanitized page", async () => {
  const first = await fingerprintUrl("https://EXAMPLE.com/article?one=1");
  const second = await fingerprintUrl("https://example.com:443/article?two=2#part");

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test("calculateRenderDelta reports exact measured availability and missing share", () => {
  assert.deepEqual(calculateRenderDelta({ visibleTextChars: 800 }, { visibleTextChars: 1000 }), {
    available: true,
    rawTextChars: 800,
    renderedTextChars: 1000,
    missingPercent: 20,
  });
  assert.deepEqual(calculateRenderDelta({ visibleTextChars: 800 }, null), {
    available: false,
    rawTextChars: 800,
    renderedTextChars: null,
    missingPercent: null,
  });
});

test("buildStoredResult allowlists the public snapshot and strips sensitive fields", () => {
  const stored = buildStoredResult(sampleResult());

  assert.equal(stored.url, "https://example.com/article");
  assert.equal(stored.finalUrl, "https://example.com/article");
  assert.equal(stored.content.canonical, "https://example.com/article");
  assert.equal(stored.botAccess[0].source, "https://example.org/bot-docs");
  assert.equal(stored.findings[0].source.url, "https://blursor.ai/research/source");
  assert.equal(stored.screenshot, undefined);
  assert.equal(stored.internalDebug, undefined);
  assert.equal(stored.content.secret, undefined);
  assert.equal(stored.botAccess[0].secret, undefined);
  assert.equal(stored.agentic.signals.a11y.secret, undefined);
  assert.equal(stored.findings[0].source.secret, undefined);
  assert.equal(stored.findings[0].copyText, "User-agent: GPTBot");
  assert.notStrictEqual(stored.content, sampleResult().content);
});

test("buildStoredResult rejects unsafe non-null URLs throughout the public projection", () => {
  const scenarios = [
    (result) => { result.botAccess[0].source = "javascript:alert(1)"; },
    (result) => { result.content.canonical = "javascript:alert(1)"; },
    (result) => { result.findings[0].source.url = "javascript:alert(1)"; },
    (result) => {
      result.citeability.findings[0].source = { label: "Forged", url: "data:text/html,unsafe" };
    },
    (result) => {
      result.agentic.findings[0].source = { label: "Forged", url: "file:///tmp/unsafe" };
    },
  ];

  for (const mutate of scenarios) {
    const result = structuredClone(sampleResult());
    mutate(result);
    assert.throws(() => buildStoredResult(result), /valid http or https URL/i);
  }
});

test("buildSignalSnapshot keeps deterministic change signals rather than report prose", () => {
  const stored = buildStoredResult(sampleResult());
  const snapshot = buildSignalSnapshot(stored);

  assert.deepEqual(snapshot, {
    v: 1,
    httpStatus: 200,
    summary: { pass: 4, warn: 1, fail: 0 },
    bots: [{ token: "GPTBot", robots: "allowed", server: "ok", status: 200 }],
    render: {
      mode: "rendered",
      status: "ok",
      delta: { available: true, rawTextChars: 800, renderedTextChars: 1000, missingPercent: 20 },
    },
    llms: { present: false, looksValid: false },
    indexing: { hasNoindex: false, hasNoai: false, contentSignals: ["ai-train=yes"] },
    findings: {
      readability: { robots: "pass" },
      citeability: { "cite-stats": "pass" },
      agentic: { "agent-labels": "pass" },
    },
    agentic: { mode: "measured", cls: 0.01, unnamed: 0, fieldsNoLabel: 0, imagesNoAlt: 0 },
  });
});

test("buildReportRow creates an append-only user capture row", async () => {
  const row = await buildReportRow(sampleResult());

  assert.equal(row.checked_at, "2026-07-20T12:34:56.000Z");
  assert.equal(row.target_url, "https://example.com/article");
  assert.equal(row.final_url, "https://example.com/article");
  assert.equal(row.source, "user");
  assert.match(row.url_fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(row.result.screenshot, undefined);
  assert.deepEqual(row.signal_json, buildSignalSnapshot(row.result));
});
