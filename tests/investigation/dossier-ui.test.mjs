import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

import { DOSSIER_PAGE_HTML } from "../../functions/lib/investigation/dossier-page.mjs";

const rootPage = new URL("../../investigation-dossier.html", import.meta.url);

test("dossier shell exists only in the server bundle", async () => {
  await assert.rejects(access(rootPage), (error) => error?.code === "ENOENT");
  assert.match(DOSSIER_PAGE_HTML, /^<!doctype html>/);
});

test("dossier shell uses the approved investigation hierarchy", () => {
  const html = DOSSIER_PAGE_HTML;
  assert.match(html, /Investigation dossier/i);
  assert.match(html, />Finding</i);
  assert.match(html, />Evidence</i);
  assert.match(html, /BLURSOR diagnostic rationale/i);
  assert.match(html, />Alternative explanations</i);
  assert.match(html, />Follow-up verdict</i);
  assert.match(html, /Provider-supplied rationale/i);
  assert.match(html, /Unresolved is a valid result/i);
  assert.doesNotMatch(html, />\s*Tracker\s*</i);
  assert.doesNotMatch(html, /visibility score/i);

  const headings = [
    "Finding",
    "Evidence",
    "Alternative explanations",
    "Follow-up verdict",
  ];
  const positions = headings.map((heading) => html.indexOf(`</span>${heading}</h2>`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.equal((html.match(/<h2\b/g) || []).length, 4);
  assert.equal((html.match(/<section\b/g) || []).length, 4);
});

test("dossier shell loads only the ID in its private route", () => {
  const html = DOSSIER_PAGE_HTML;
  assert.ok(html.includes("window.location.pathname.match(/^\\/i\\/([^/]+)\\/?$/)"));
  assert.ok(!html.includes("window.location.pathname.match(/^\\/i\\/([^/]+)$/)"));
  assert.ok(html.includes("fetch('/api/investigations/' + encodeURIComponent(id)"));
  assert.match(html, /credentials:\s*'same-origin'/);
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /innerHTML\s*=/);
  assert.doesNotMatch(html, /insertAdjacentHTML|document\.write|eval\s*\(/);
});

test("dossier shell is private, responsive, and exposes robust loading and error states", () => {
  const html = DOSSIER_PAGE_HTML;
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html, /role="status"/);
  assert.match(html, /Loading investigation…/);
  assert.match(html, /Loading evidence…/);
  assert.match(html, /Investigation unavailable/);
  assert.match(html, /The private dossier could not be loaded\./);
  assert.match(html, /Unresolved — the evidence does not yet support a diagnosis\./);
  assert.match(html, /@media \(max-width:800px\)/);
});

test("responsive dossier content can shrink and wrap long identifiers", () => {
  const html = DOSSIER_PAGE_HTML;
  assert.match(html, /\.layout > \*,\.stack > \*,\.metric-grid > \*,\.evidence-top > \*,\.meta > \* \{ min-width:0; \}/);
  assert.match(html, /\.pill,\.metric,\.evidence,\.rationale,\.plain-list li \{ overflow-wrap:anywhere; \}/);
  assert.match(html, /@media \(max-width:800px\) \{ \.layout \{ grid-template-columns:1fr; \}/);
});

test("renderer uses polished deterministic evidence-state labels", () => {
  const html = DOSSIER_PAGE_HTML;
  const helperSource = html.match(/const evidenceStateLabel = \(\(\) => \{[\s\S]*?\n    \}\)\(\);/)?.[0];
  assert.ok(helperSource, "expected an executable evidence-state helper");
  const evidenceStateLabel = runInNewContext(
    `${helperSource}\nevidenceStateLabel;`,
    Object.create(null),
  );

  for (const [state, label] of [
    ["unresolved", "Unresolved is a valid result."],
    ["hypothesis_ready", "Hypothesis ready"],
    ["supported_after_followup", "Supported after follow-up"],
    ["weakened_after_followup", "Weakened after follow-up"],
    ["unresolved_after_followup", "Unresolved after follow-up"],
  ]) {
    assert.equal(evidenceStateLabel(state), label, state);
  }
  for (const state of ["future_state", "toString", "constructor", "__proto__", "hasOwnProperty"]) {
    assert.equal(evidenceStateLabel(state), "Unresolved is a valid result.", state);
  }
  assert.match(helperSource, /Object\.freeze/);
  assert.match(helperSource, /Object\.hasOwn/);
  assert.ok(html.includes("byId('evidence-state').textContent = evidenceStateLabel(dossier.evidenceState)"));
  assert.doesNotMatch(html, /dossier\.evidenceState\.replaceAll/);
});

test("renderer covers the complete client-safe dossier without raw observations", () => {
  const html = DOSSIER_PAGE_HTML;
  for (const field of [
    "dossier.header.question",
    "dossier.header.project",
    "dossier.header.surfaces",
    "observed.coverage.observed",
    "observed.coverage.valid",
    "observed.coverage.scheduled",
    "observed.coverage.refused",
    "observed.coverage.missing",
    "observed.coverage.failed",
    "observed.coverage.unreviewed",
    "observed.coverage.excluded",
    "observed.coverage.omitted",
    "observed.metrics",
    "evidenceSection.items",
    "evidenceSection.hypothesis",
    "alternativesSection.alternatives",
    "alternativesSection.nextTest",
    "followupSection.intervention",
    "followupSection.followup",
    "dossier.limitations",
    "dossier.review.analyst",
    "dossier.review.reviewedAt",
  ]) {
    assert.ok(html.includes(field), `expected renderer field ${field}`);
  }
  assert.doesNotMatch(html, /dossier\.observations|body\.observations|\.rawAnswer|requestId|responseId/);
});

test("renderer exposes item-level surface, collection, and review provenance", () => {
  const html = DOSSIER_PAGE_HTML;
  for (const field of [
    "item.surfaceId",
    "item.surfaceLabel",
    "item.collectedAt",
    "item.reviewState",
    "item.provenance",
  ]) {
    assert.ok(html.includes(field), field);
  }
});

test("renderer distinguishes every coverage state from valid answer analysis", () => {
  const html = DOSSIER_PAGE_HTML;
  for (const label of ["scheduled", "observed", "valid", "refused", "missing", "failed", "unreviewed", "excluded", "omitted"]) {
    assert.ok(html.includes(`' ${label}'`), label);
  }
  assert.doesNotMatch(html, /coverage\.valid\s*\+\s*' valid of '/);
});

test("renderer builds safe labelled evidence links only for validated non-null URLs", () => {
  const html = DOSSIER_PAGE_HTML;
  assert.match(html, /if \(item\.url\) \{/);
  assert.match(html, /element\('a', 'evidence-link', 'Open evidence source'\)/);
  assert.match(html, /link\.href = item\.url/);
  assert.match(html, /link\.target = '_blank'/);
  assert.match(html, /link\.rel = 'noopener noreferrer'/);
  assert.doesNotMatch(html, /innerHTML\s*=/);
});
