import assert from "node:assert/strict";
import test from "node:test";

import { buildInvestigationDossier } from "../../functions/lib/investigation/dossier-model.mjs";
import { createFollowupComparisonReceipt } from "../../functions/lib/investigation/followup-comparison.mjs";
import { buildKamranSyntheticDemo } from "../../functions/lib/investigation/kamran-synthetic-demo.mjs";
import { V1_PROMPT_PANEL } from "../../functions/lib/investigation/v1-scope.mjs";
import {
  SYNTHETIC_SURFACE,
  SYNTHETIC_SURFACES,
  makeObservation,
  reviewedEvidence,
} from "./test-fixtures.mjs";

function observations(windowName, days) {
  return days.flatMap((day, repeatIndex) => SYNTHETIC_SURFACES.map((surface) => makeObservation({
    day,
    windowName,
    repeatOrdinal: repeatIndex + 1,
    surface,
    rawAnswer: windowName === "followup"
      ? "Synthetic fixture answer mentioning Dr. Kamran Aghayev."
      : "Synthetic fixture answer without the investigated brand.",
  })));
}

function evidenceFor(observation) {
  return {
    claims: [{ id: "claim-1", observationId: observation.id, text: "Synthetic claim." }],
    evidenceItems: [
      reviewedEvidence({
        id: "page-evidence",
        type: "page_fact",
        surfaceId: "owned_page_review",
        surfaceLabel: "Owned-page review",
        provenance: "synthetic owned-page review",
      }),
      reviewedEvidence({
        id: "checker-evidence",
        type: "checker_fact",
        surfaceId: "blursor_checker",
        surfaceLabel: "BLURSOR checker",
        provenance: "synthetic checker review",
      }),
    ],
    relations: [
      { claimId: "claim-1", evidenceItemId: "page-evidence", relation: "supports" },
      { claimId: "claim-1", evidenceItemId: "checker-evidence", relation: "contextualizes" },
    ],
  };
}

function minimalInput(overrides = {}) {
  const baselineObservations = observations("baseline", ["2026-07-22", "2026-07-25"]);
  return {
    caseRecord: {
      id: "kamran-investigation-01",
      projectId: "kamran-aghayev",
      question: "Why?",
      state: "evidence_review",
      language: "en",
      location: "US",
      panelId: "kamran-us-en-v1",
      panelVersion: 1,
      methodVersion: "0.2",
      surfaces: SYNTHETIC_SURFACES.map(({ id }) => id),
    },
    projectLabel: "Synthetic project",
    exampleOnly: true,
    baselineObservations,
    followupObservations: [],
    extractionConfig: {
      extractorVersion: "answer-evidence-1",
      brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
      competitors: [],
    },
    observedSummary: "Synthetic pattern.",
    evidence: evidenceFor(baselineObservations[0]),
    hypothesis: {
      id: "hypothesis-1",
      wording: "Synthetic hypothesis.",
      confidence: "bounded",
      basis: ["Evidence"],
      contradictions: [],
      inferenceSteps: ["Inference"],
      falsifier: "A repeat disagrees.",
      reviewState: "approved",
    },
    alternatives: [{
      id: "alternative-1",
      wording: "Normal variance.",
      disposition: "plausible",
      reviewState: "reviewed",
    }],
    nextTest: "Repeat the frozen panel.",
    intervention: null,
    followup: null,
    comparisonReceipt: null,
    review: { analyst: "Alex", reviewedAt: "2026-07-28T12:00:00.000Z", extractorVersion: "answer-evidence-1" },
    limitations: ["Synthetic fixture."],
    ...overrides,
  };
}

test("builds the complete investigation-first Kamran fixture through derived inputs", () => {
  const demo = buildKamranSyntheticDemo();
  assert.equal(demo.observations.length, 270);
  assert.equal(new Set(demo.observations.map(({ promptId }) => promptId)).size, 15);
  assert.equal(demo.dossier.header.state, "closed_supported");
  assert.deepEqual(demo.dossier.sections.map(({ id }) => id), ["finding", "evidence", "alternative-explanations", "follow-up-verdict"]);
  assert.equal(demo.dossier.evidenceState, "supported_after_followup");
  assert.equal(demo.dossier.evidenceLevel, 5);
  assert.equal(demo.dossier.sections[1].hypothesis.reviewState, "approved");
  assert.equal(demo.dossier.sections[1].items.find(({ type }) => type === "provider_rationale").optional, true);
  assert.equal(demo.dossier.score, undefined);
  assert.equal(JSON.stringify(demo.dossier).includes("Otterly"), false);
  assert.strictEqual(demo.scope.panel.fingerprint, demo.observations[0].panelFingerprint);
  assert.strictEqual(demo.scope.panel, V1_PROMPT_PANEL);
});

test("derives coverage, mention metrics, windows, and surface labels from normalized observations", () => {
  const { dossier } = buildKamranSyntheticDemo();
  const observed = dossier.sections[0];

  assert.deepEqual(observed.coverage, { valid: 270, scheduled: 270, failed: 0 });
  assert.equal(observed.metrics.length, 6);
  for (const metric of observed.metrics) {
    assert.ok(metric.numerator >= 0);
    assert.ok(metric.denominator > 0);
    assert.ok(metric.numerator <= metric.denominator);
    assert.ok(metric.surfaceId);
    assert.ok(metric.window);
  }
  assert.deepEqual(observed.metrics.map(({ numerator, denominator }) => [numerator, denominator]), [
    [0, 45], [3, 45],
    [0, 45], [3, 45],
    [0, 45], [3, 45],
  ]);
  assert.equal(dossier.header.baselineWindow, "2026-07-22 to 2026-07-28");
  assert.equal(dossier.header.followupWindow, "2026-08-05 to 2026-08-11");
  assert.deepEqual(dossier.header.surfaces, SYNTHETIC_SURFACES.map(({ label }) => label));
});

test("derives diagnosis readiness only from reviewed independent evidence and alternatives", () => {
  const unreviewed = minimalInput();
  unreviewed.hypothesis = { ...unreviewed.hypothesis, reviewState: "draft" };
  assert.equal(buildInvestigationDossier(unreviewed).evidenceState, "unresolved");

  const noAlternatives = minimalInput({ alternatives: [] });
  assert.equal(buildInvestigationDossier(noAlternatives).evidenceState, "unresolved");

  const providerOnly = minimalInput();
  providerOnly.evidence = {
    ...providerOnly.evidence,
    evidenceItems: [reviewedEvidence({
      id: "provider-only",
      type: "provider_rationale",
      observationId: providerOnly.baselineObservations[0].id,
      surfaceId: SYNTHETIC_SURFACE.id,
      surfaceLabel: SYNTHETIC_SURFACE.label,
    })],
    relations: [{ claimId: "claim-1", evidenceItemId: "provider-only", relation: "contextualizes" }],
  };
  const providerOnlyDossier = buildInvestigationDossier(providerOnly);
  assert.equal(providerOnlyDossier.evidenceState, "unresolved");
  assert.equal(providerOnlyDossier.sections[1].hypothesis, null);

  const reviewed = buildInvestigationDossier(minimalInput());
  assert.equal(reviewed.evidenceLevel, 4);
  assert.equal(reviewed.evidenceState, "hypothesis_ready");
});

test("preserves and projects complete item-level evidence provenance", () => {
  const { dossier } = buildKamranSyntheticDemo();
  for (const item of dossier.sections[1].items) {
    assert.ok(item.surfaceId);
    assert.ok(item.surfaceLabel);
    assert.match(item.collectedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(item.reviewState, "reviewed");
    assert.ok(item.type);
    assert.ok(item.provenance);
    assert.ok(item.label);
    assert.equal(item.url == null || !/[?#]/.test(item.url), true);
  }
  assert.equal(JSON.stringify(dossier).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(dossier).includes("requestId"), false);
  assert.equal(JSON.stringify(dossier).includes("responseId"), false);
});

test("rejects caller-authored assessment, metrics, impossible ratios, and negative failures", () => {
  for (const derived of [
    { assessment: { level: 5, term: "supported after follow-up" } },
    { observedPattern: { metrics: [{ numerator: 999, denominator: 1 }] } },
    { observedPattern: { coverage: { valid: 1, scheduled: 0, failed: -1 } } },
    { surfaceLabels: ["Decorative"] },
    { baselineWindow: "Decorative" },
  ]) {
    assert.throws(
      () => buildInvestigationDossier(minimalInput(derived)),
      (error) => error.code === "CALLER_DERIVED_FIELD_NOT_ALLOWED",
    );
  }
});

test("one observation cannot manufacture level five and evidence types remain closed", () => {
  const baselineObservations = [makeObservation({ day: "2026-07-22", windowName: "baseline" })];
  const followupObservations = [makeObservation({ day: "2026-08-05", windowName: "followup", rawAnswer: "Dr. Kamran Aghayev is mentioned." })];
  const comparisonReceipt = createFollowupComparisonReceipt({ baselineObservations, followupObservations });
  const input = minimalInput({
    caseRecord: { ...minimalInput().caseRecord, state: "closed_supported", surfaces: [SYNTHETIC_SURFACE.id] },
    baselineObservations,
    followupObservations,
    comparisonReceipt,
    followup: { summary: "Comparable synthetic follow-up." },
    evidence: evidenceFor(baselineObservations[0]),
  });
  assert.throws(
    () => buildInvestigationDossier(input),
    (error) => error.code === "CASE_COMPARISON_RECEIPT_MISMATCH",
  );

  input.caseRecord = { ...input.caseRecord, state: "evidence_review" };
  input.followupObservations = [];
  input.followup = null;
  input.comparisonReceipt = null;
  assert.ok(buildInvestigationDossier(input).evidenceLevel < 5);
  input.evidence.evidenceItems[0].type = "invented_evidence";
  assert.throws(
    () => buildInvestigationDossier(input),
    (error) => error.code === "INVALID_EVIDENCE_TYPE",
  );
});

test("raw or fabricated comparability cannot close a dossier", () => {
  const followupObservations = observations("followup", ["2026-08-05", "2026-08-08"]);
  assert.throws(
    () => buildInvestigationDossier(minimalInput({
      followupObservations,
      followup: { comparable: true, summary: "Decorative." },
      comparisonReceipt: { comparable: true },
    })),
    (error) => ["RAW_COMPARABILITY_NOT_ALLOWED", "INVALID_COMPARISON_RECEIPT"].includes(error.code),
  );
});

test("returns a frozen safe projection without freezing caller-owned inputs", () => {
  const input = minimalInput();
  input.secret = "PRIVATE_SENTINEL";
  input.caseRecord.requestId = "PRIVATE_SENTINEL";
  input.evidence.evidenceItems[0].requestConfig = { secret: "PRIVATE_SENTINEL" };
  const original = structuredClone(input);

  const dossier = buildInvestigationDossier(input);
  const serialized = JSON.stringify(dossier);

  assert.deepEqual(input, original);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(dossier), true);
  assert.equal(serialized.includes("PRIVATE_SENTINEL"), false);
  assert.deepEqual(Object.keys(dossier.sections[0].coverage), ["valid", "scheduled", "failed"]);
  assert.deepEqual(Object.keys(dossier.sections[1].items[0]), [
    "id", "type", "label", "excerpt", "provenance", "relation", "url", "surfaceId",
    "surfaceLabel", "observationId", "collectedAt", "reviewState", "optional",
  ]);
});
