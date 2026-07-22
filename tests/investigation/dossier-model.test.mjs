import assert from "node:assert/strict";
import test from "node:test";

import { buildInvestigationDossier } from "../../functions/lib/investigation/dossier-model.mjs";
import { buildKamranSyntheticDemo } from "../../functions/lib/investigation/kamran-synthetic-demo.mjs";

function minimalInput(overrides = {}) {
  return {
    caseRecord: { id: "case-1", question: "Why?", state: "evidence_review", language: "en", location: "US", panelId: "panel-1", panelVersion: 1, methodVersion: "0.2" },
    projectLabel: "Synthetic project",
    surfaceLabels: ["Synthetic A", "Synthetic B", "Synthetic C"],
    baselineWindow: "baseline",
    followupWindow: "follow-up",
    exampleOnly: true,
    assessment: { level: 3, term: "consistent with" },
    observedPattern: { summary: "Synthetic pattern.", metrics: [{ id: "m1", label: "Mentions", numerator: 0, denominator: 45, surfaceId: "synthetic-a", window: "baseline" }], coverage: { valid: 45, scheduled: 45, failed: 0 } },
    evidenceItems: [{ id: "e1", type: "checker_fact", label: "Checker fact", excerpt: "Synthetic evidence.", provenance: "synthetic checker", relation: "supports", url: null }],
    hypothesis: { wording: "Synthetic hypothesis.", confidence: "bounded", basis: ["Evidence"], contradictions: [], inferenceSteps: ["Inference"], falsifier: "A repeat disagrees.", reviewState: "approved" },
    alternatives: [{ wording: "Normal variance.", disposition: "plausible" }],
    nextTest: "Repeat the frozen panel.",
    intervention: null,
    followup: null,
    review: { analyst: "Alex", reviewedAt: "2026-07-22T12:00:00.000Z", extractorVersion: "answer-evidence-1" },
    limitations: ["Synthetic fixture."],
    ...overrides,
  };
}

test("builds the complete investigation-first Kamran fixture", () => {
  const demo = buildKamranSyntheticDemo();
  assert.equal(demo.observations.length, 270);
  assert.equal(new Set(demo.observations.map(({ promptId }) => promptId)).size, 15);
  assert.deepEqual([...new Set(demo.observations.map(({ surfaceId }) => surfaceId))].sort(), [
    "synthetic_chatgpt_web_logged_out_us",
    "synthetic_openai_responses_web_search_auto",
    "synthetic_openai_responses_web_search_required",
  ]);
  assert.equal(demo.dossier.header.question, "Why is the brand absent from this US prompt cohort?");
  assert.equal(demo.dossier.header.exampleOnly, true);
  assert.equal(demo.dossier.header.state, "closed_supported");
  assert.deepEqual(demo.dossier.sections.map(({ id }) => id), ["observed-pattern", "evidence-chain", "diagnostic-rationale", "alternatives-next-test"]);
  assert.equal(demo.dossier.evidenceState, "supported_after_followup");
  assert.equal(demo.dossier.sections[2].hypothesis.reviewState, "approved");
  assert.ok(demo.dossier.sections[2].hypothesis.alternatives.length >= 1);
  assert.equal(demo.dossier.sections[1].items.some(({ type }) => type === "provider_rationale"), true);
  assert.equal(demo.dossier.sections[1].items.find(({ type }) => type === "provider_rationale").optional, true);
  assert.equal(demo.dossier.score, undefined);
  assert.equal(JSON.stringify(demo.dossier).includes("Otterly"), false);
  assert.equal(demo.scope.panel.prompts.some(({ text }) => /patient|diagnosis|medical record|treatment outcome/i.test(text)), false);
  assert.deepEqual([...new Set(demo.observations.map(({ runId }) => runId))].sort(), [
    "baseline-2026-07-22",
    "baseline-2026-07-25",
    "baseline-2026-07-28",
    "followup-2026-08-05",
    "followup-2026-08-08",
    "followup-2026-08-11",
  ]);
  assert.equal(demo.observations.every(({ collectionClass, synthetic }) => collectionClass === "synthetic_fixture" && synthetic === true), true);
  assert.equal(Object.isFrozen(demo), true);
  assert.equal(Object.isFrozen(demo.scope), true);
  assert.equal(Object.isFrozen(demo.observations), true);
  assert.equal(Object.isFrozen(demo.observations[0]), true);
  assert.equal(Object.isFrozen(demo.dossier), true);
});

test("keeps every metric denominator and surface identity visible", () => {
  const { dossier } = buildKamranSyntheticDemo();
  for (const metric of dossier.sections[0].metrics) {
    assert.ok(Number.isInteger(metric.numerator));
    assert.ok(Number.isInteger(metric.denominator));
    assert.ok(metric.surfaceId);
    assert.ok(metric.window);
  }
});

test("unreviewed or provider-only rationale cannot become a diagnosis", () => {
  const unreviewed = buildInvestigationDossier(minimalInput({ hypothesis: { ...minimalInput().hypothesis, reviewState: "draft" } }));
  assert.equal(unreviewed.evidenceState, "unresolved");
  assert.equal(unreviewed.sections[2].hypothesis, null);
  const providerOnly = buildInvestigationDossier(minimalInput({ evidenceItems: [{ id: "r1", type: "provider_rationale", label: "Provider rationale", excerpt: "Synthetic.", provenance: "provider_supplied", relation: "contextualizes", url: null }] }));
  assert.equal(providerOnly.evidenceState, "unresolved");
  assert.equal(providerOnly.sections[2].hypothesis, null);
  const noAlternatives = buildInvestigationDossier(minimalInput({ alternatives: [] }));
  assert.equal(noAlternatives.evidenceState, "unresolved");

  const withoutRationale = buildInvestigationDossier(minimalInput());
  assert.equal(withoutRationale.evidenceState, "hypothesis_ready");
  assert.equal(withoutRationale.sections[2].hypothesis.reviewState, "approved");
});

test("keeps synthetic evidence types distinct and excludes raw observation data", () => {
  const { dossier } = buildKamranSyntheticDemo();
  const items = dossier.sections[1].items;

  for (const type of ["inline_citation", "returned_source", "checker_fact", "page_fact", "provider_rationale"]) {
    assert.equal(items.some((item) => item.type === type), true);
  }
  assert.equal(items.some(({ relation }) => relation === "contradicts"), true);
  assert.equal(JSON.stringify(dossier).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(dossier).includes("requestId"), false);
  assert.equal(JSON.stringify(dossier).includes("responseId"), false);
});

test("returns a deeply frozen copy without freezing caller-owned inputs", () => {
  const metricDetail = { source: ["synthetic run"] };
  const interventionEvidence = ["synthetic change record"];
  const remainingUncertainty = ["surface variation"];
  const input = minimalInput({
    caseRecord: { ...minimalInput().caseRecord, state: "closed_supported" },
    observedPattern: {
      ...minimalInput().observedPattern,
      metrics: [{ ...minimalInput().observedPattern.metrics[0], detail: metricDetail }],
    },
    intervention: { label: "Synthetic intervention", evidence: interventionEvidence },
    followup: { comparable: true, outcome: "supported_after_followup", remainingUncertainty },
  });
  const original = structuredClone(input);

  const dossier = buildInvestigationDossier(input);
  const next = dossier.sections[3];

  assert.deepEqual(input, original);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(metricDetail), false);
  assert.equal(Object.isFrozen(metricDetail.source), false);
  assert.equal(Object.isFrozen(interventionEvidence), false);
  assert.equal(Object.isFrozen(remainingUncertainty), false);
  assert.equal(dossier.sections[0].metrics[0].detail, undefined);
  assert.notStrictEqual(next.intervention, input.intervention);
  assert.notStrictEqual(next.followup, input.followup);
  assert.equal(Object.isFrozen(dossier), true);
  assert.equal(next.intervention.evidence, undefined);
  assert.equal(next.followup.remainingUncertainty, undefined);
});

test("whitelists client-safe metric, intervention, and follow-up fields", () => {
  const sentinel = { value: "PRIVATE_SENTINEL" };
  const extraFields = {
    rawAnswer: "PRIVATE_SENTINEL",
    requestId: "PRIVATE_SENTINEL",
    responseId: "PRIVATE_SENTINEL",
    requestConfig: sentinel,
    archive: sentinel,
    secret: "PRIVATE_SENTINEL",
  };
  const input = minimalInput({
    caseRecord: { ...minimalInput().caseRecord, state: "closed_supported" },
    assessment: { level: 5, term: "supported after follow-up" },
    observedPattern: {
      ...minimalInput().observedPattern,
      metrics: [{ ...minimalInput().observedPattern.metrics[0], ...extraFields }],
    },
    intervention: {
      label: "Synthetic intervention",
      detail: "Synthetic detail.",
      deployedAt: "2026-07-29T09:00:00.000Z",
      ...extraFields,
    },
    followup: {
      comparable: true,
      outcome: "supported_after_followup",
      summary: "Synthetic summary.",
      ...extraFields,
    },
  });
  const original = structuredClone(input);

  const dossier = buildInvestigationDossier(input);
  const observed = dossier.sections[0];
  const next = dossier.sections[3];
  const serialized = JSON.stringify(dossier);

  assert.deepEqual(Object.keys(observed.metrics[0]), ["id", "label", "numerator", "denominator", "surfaceId", "window"]);
  assert.deepEqual(Object.keys(next.intervention), ["label", "detail", "deployedAt"]);
  assert.deepEqual(Object.keys(next.followup), ["comparable", "outcome", "summary"]);
  for (const field of Object.keys(extraFields)) assert.equal(serialized.includes(`\"${field}\"`), false);
  assert.equal(serialized.includes("PRIVATE_SENTINEL"), false);
  assert.deepEqual(input, original);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(sentinel), false);
});

test("requires level-five and comparable follow-up states to match the closed lifecycle", () => {
  assert.throws(
    () => buildInvestigationDossier(minimalInput({ assessment: { level: 5, term: "supported after follow-up" } })),
    /level 5.*comparable follow-up/i,
  );
  assert.throws(
    () => buildInvestigationDossier(minimalInput({
      followup: { comparable: true, outcome: "supported_after_followup", summary: "Premature." },
    })),
    /closed follow-up state/i,
  );
  assert.throws(
    () => buildInvestigationDossier(minimalInput({
      caseRecord: { ...minimalInput().caseRecord, state: "closed_supported" },
      assessment: { level: 5, term: "supported after follow-up" },
      followup: { comparable: true, outcome: "weakened_after_followup", summary: "Mismatched." },
    })),
    /outcome.*closed_supported/i,
  );
});

test("derives a safe comparable outcome from each closed follow-up state", () => {
  const outcomes = new Map([
    ["closed_supported", "supported_after_followup"],
    ["closed_weakened", "weakened_after_followup"],
    ["closed_unresolved", "unresolved_after_followup"],
  ]);

  for (const [state, outcome] of outcomes) {
    const dossier = buildInvestigationDossier(minimalInput({
      caseRecord: { ...minimalInput().caseRecord, state },
      assessment: { level: 5, term: "supported after follow-up" },
      followup: { comparable: true, outcome, summary: "Comparable synthetic follow-up." },
    }));
    assert.equal(dossier.evidenceState, outcome);
    assert.equal(dossier.sections[3].followup.outcome, outcome);
  }
});
