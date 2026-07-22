import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = new URL("../../investigation-dossier.html", import.meta.url);

test("dossier shell uses the approved investigation hierarchy", async () => {
  const html = await readFile(page, "utf8");
  assert.match(html, /Investigation dossier/i);
  assert.match(html, /Observed pattern/i);
  assert.match(html, /Evidence chain/i);
  assert.match(html, /BLURSOR diagnostic rationale/i);
  assert.match(html, /Alternatives and next test/i);
  assert.match(html, /Provider-supplied rationale/i);
  assert.match(html, /Unresolved is a valid result/i);
  assert.doesNotMatch(html, />\s*Tracker\s*</i);
  assert.doesNotMatch(html, /visibility score/i);

  const headings = [
    "Observed pattern",
    "Evidence chain",
    "BLURSOR diagnostic rationale",
    "Alternatives and next test",
  ];
  const positions = headings.map((heading) => html.indexOf(heading));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.equal((html.match(/<section\b/g) || []).length, 4);
});

test("dossier shell loads only the ID in its private route", async () => {
  const html = await readFile(page, "utf8");
  assert.ok(html.includes("window.location.pathname.match(/^\\/i\\/([^/]+)\\/?$/)"));
  assert.ok(!html.includes("window.location.pathname.match(/^\\/i\\/([^/]+)$/)"));
  assert.ok(html.includes("fetch('/api/investigations/' + encodeURIComponent(id)"));
  assert.match(html, /credentials:\s*'same-origin'/);
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /innerHTML\s*=/);
  assert.doesNotMatch(html, /insertAdjacentHTML|document\.write|eval\s*\(/);
});

test("dossier shell is private, responsive, and exposes robust loading and error states", async () => {
  const html = await readFile(page, "utf8");
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html, /role="status"/);
  assert.match(html, /Loading investigation…/);
  assert.match(html, /Loading evidence…/);
  assert.match(html, /Investigation unavailable/);
  assert.match(html, /The private dossier could not be loaded\./);
  assert.match(html, /Unresolved — the evidence does not yet support a diagnosis\./);
  assert.match(html, /@media \(max-width:800px\)/);
});

test("renderer covers the complete client-safe dossier without raw observations", async () => {
  const html = await readFile(page, "utf8");
  for (const field of [
    "dossier.header.question",
    "dossier.header.project",
    "dossier.header.surfaces",
    "observed.coverage.valid",
    "observed.coverage.scheduled",
    "observed.coverage.failed",
    "observed.metrics",
    "evidenceSection.items",
    "rationaleSection.hypothesis",
    "nextSection.alternatives",
    "nextSection.nextTest",
    "dossier.limitations",
    "dossier.review.analyst",
    "dossier.review.reviewedAt",
  ]) {
    assert.ok(html.includes(field), `expected renderer field ${field}`);
  }
  assert.doesNotMatch(html, /dossier\.observations|body\.observations|\.rawAnswer|requestId|responseId/);
});
