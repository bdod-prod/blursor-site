import assert from "node:assert/strict";
import test from "node:test";

import { extractAnswerEvidence } from "../../functions/lib/investigation/answer-extractor.mjs";
import { createInvestigationCase, transitionInvestigationCase } from "../../functions/lib/investigation/case-model.mjs";
import { buildInvestigationDossier } from "../../functions/lib/investigation/dossier-model.mjs";
import { createFollowupComparisonReceipt } from "../../functions/lib/investigation/followup-comparison.mjs";
import { buildKamranSyntheticDemo } from "../../functions/lib/investigation/kamran-synthetic-demo.mjs";
import { V1_PROMPT_PANEL } from "../../functions/lib/investigation/v1-scope.mjs";
import {
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

function completeObservations(windowName, days, observationOverrides = () => ({})) {
  return days.flatMap((day, repeatIndex) => SYNTHETIC_SURFACES.flatMap((surface) => (
    V1_PROMPT_PANEL.prompts.map((prompt) => makeObservation({
      day,
      windowName,
      repeatOrdinal: repeatIndex + 1,
      surface,
      prompt,
      rawAnswer: windowName === "followup"
        ? "Synthetic fixture answer mentioning Dr. Kamran Aghayev."
        : "Synthetic fixture answer without the investigated brand.",
      ...observationOverrides({ day, repeatIndex, surface, prompt }),
    }))
  )));
}

function evidenceFor(observation) {
  const claim = extractAnswerEvidence(observation, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
    competitors: [],
  }).claims[0];
  return {
    claims: [claim],
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
      { claimId: claim.id, evidenceItemId: "page-evidence", relation: "supports" },
      { claimId: claim.id, evidenceItemId: "checker-evidence", relation: "contextualizes" },
    ],
  };
}

function analystEvidence() {
  return {
    claims: [{ id: "analyst-claim", text: "Reviewed synthetic page pattern.", claimType: "analyst_statement" }],
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
      { claimId: "analyst-claim", evidenceItemId: "page-evidence", relation: "supports" },
      { claimId: "analyst-claim", evidenceItemId: "checker-evidence", relation: "contextualizes" },
    ],
  };
}

function observationBackedInput() {
  const linkedObservation = makeObservation({
    id: "baseline-linked-observation",
    day: "2026-07-22",
    surface: SYNTHETIC_SURFACES[0],
    rawAnswer: "Dr. Kamran Aghayev is included in this synthetic answer.",
    citations: [{
      id: "citation-1",
      url: "https://example.org/citation?private=drop#fragment",
      title: "Synthetic citation",
      start: 0,
      end: 10,
    }],
    sources: [{
      id: "source-1",
      url: "https://example.org/source?private=drop#fragment",
      title: "Synthetic returned source",
    }],
    providerRationale: {
      kind: "reasoning_summary",
      text: "Synthetic provider rationale retained on the observation.",
      retentionStatus: "fixture_only",
    },
  });
  const baselineObservations = [
    linkedObservation,
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[1] }),
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[2] }),
  ];
  const claim = extractAnswerEvidence(linkedObservation, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
    competitors: [],
  }).claims[0];
  const shared = {
    surfaceId: linkedObservation.surfaceId,
    surfaceLabel: linkedObservation.surfaceLabel,
    observationId: linkedObservation.id,
    collectedAt: linkedObservation.observationCompletedAt,
    reviewState: "reviewed",
  };
  const evidence = {
    claims: [claim],
    evidenceItems: [
      {
        id: "observation-citation",
        type: "inline_citation",
        provenance: "returned_answer",
        label: "Synthetic inline citation",
        excerpt: "Citation retained on the observation.",
        url: "https://example.org/citation?private=drop#fragment",
        ...shared,
      },
      {
        id: "observation-source",
        type: "returned_source",
        provenance: "returned_answer",
        label: "Synthetic returned source",
        excerpt: "Source retained on the observation.",
        url: "https://example.org/source?private=drop#fragment",
        ...shared,
      },
      {
        id: "observation-rationale",
        type: "provider_rationale",
        label: "Provider rationale",
        excerpt: linkedObservation.providerRationale.text,
        url: null,
        ...shared,
      },
    ],
    relations: [
      { claimId: claim.id, evidenceItemId: "observation-citation", relation: "supports" },
      { claimId: claim.id, evidenceItemId: "observation-source", relation: "contextualizes" },
      { claimId: claim.id, evidenceItemId: "observation-rationale", relation: "contextualizes" },
    ],
  };
  const input = minimalInput({ baselineObservations, evidence });
  input.caseRecord = caseAtHypothesisReady({ evidence, hypothesis: input.hypothesis, alternatives: input.alternatives });
  return input;
}

function caseAtEvidenceReview() {
  let record = createInvestigationCase({
    id: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    question: "Why?",
    methodVersion: V1_PROMPT_PANEL.methodologyVersion,
    panelId: V1_PROMPT_PANEL.id,
    panelVersion: V1_PROMPT_PANEL.version,
    panelFingerprint: V1_PROMPT_PANEL.fingerprint,
    cycleCount: 3,
    cadenceDays: 3,
    language: "en",
    location: "US",
    surfaces: SYNTHETIC_SURFACES.map(({ id }) => id),
    createdAt: "2026-07-22T08:00:00.000Z",
  });
  record = transitionInvestigationCase(record, { to: "baseline_collecting", at: "2026-07-22T08:05:00.000Z", reviewer: "alex" });
  return transitionInvestigationCase(record, { to: "evidence_review", at: "2026-07-28T09:00:00.000Z", reviewer: "alex" });
}

function caseAtHypothesisReady({ evidence, hypothesis, alternatives }) {
  return transitionInvestigationCase(caseAtEvidenceReview(), {
    to: "hypothesis_ready",
    at: "2026-07-28T10:00:00.000Z",
    reviewer: "alex",
    hypothesisReview: { evidence, hypothesis, alternatives },
  });
}

function minimalInput(overrides = {}) {
  const baselineObservations = observations("baseline", ["2026-07-22", "2026-07-25"]);
  const evidence = evidenceFor(baselineObservations[0]);
  const hypothesis = {
    id: "hypothesis-1",
    wording: "Synthetic hypothesis.",
    confidence: "bounded",
    basis: ["Evidence"],
    contradictions: [],
    inferenceSteps: ["Inference"],
    falsifier: "A repeat disagrees.",
    reviewState: "approved",
  };
  const alternatives = [{
    id: "alternative-1",
    wording: "Normal variance.",
    disposition: "plausible",
    reviewState: "reviewed",
  }];
  const base = {
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
    evidence,
    hypothesis,
    alternatives,
    nextTest: "Repeat the frozen panel.",
    intervention: null,
    followup: null,
    comparisonReceipt: null,
    review: { analyst: "Alex", reviewedAt: "2026-07-28T12:00:00.000Z", extractorVersion: "answer-evidence-1" },
    limitations: ["Synthetic fixture."],
  };
  return {
    ...base,
    caseRecord: caseAtHypothesisReady({ evidence, hypothesis, alternatives }),
    ...overrides,
  };
}

function closedInput(overrides = {}) {
  const baselineObservations = overrides.baselineObservations
    || completeObservations("baseline", ["2026-07-22", "2026-07-25", "2026-07-28"]);
  const followupObservations = overrides.followupObservations
    || completeObservations("followup", ["2026-08-05", "2026-08-08", "2026-08-11"]);
  const evidence = analystEvidence();
  const input = minimalInput({ baselineObservations, followupObservations, evidence });
  let caseRecord = caseAtHypothesisReady({ evidence, hypothesis: input.hypothesis, alternatives: input.alternatives });
  caseRecord = transitionInvestigationCase(caseRecord, {
    to: "intervention_in_progress",
    at: "2026-07-29T09:00:00.000Z",
    reviewer: "alex",
    intervention: {
      label: "Synthetic intervention",
      detail: "Add one consolidated public service statement.",
      deployedAt: "2026-07-29T09:00:00.000Z",
    },
  });
  caseRecord = transitionInvestigationCase(caseRecord, { to: "followup_collecting", at: "2026-08-05T08:00:00.000Z", reviewer: "alex" });
  caseRecord = transitionInvestigationCase(caseRecord, { to: "followup_review", at: "2026-08-12T08:00:00.000Z", reviewer: "alex" });
  const comparisonReceipt = createFollowupComparisonReceipt({ baselineObservations, followupObservations });
  caseRecord = transitionInvestigationCase(caseRecord, {
    to: overrides.closureState || "closed_supported",
    at: "2026-08-12T09:00:00.000Z",
    reviewer: "alex",
    comparison: { receipt: comparisonReceipt, baselineObservations, followupObservations },
  });
  return {
    ...input,
    review: { ...input.review, reviewedAt: "2026-08-12T10:00:00.000Z" },
    caseRecord,
    intervention: {
      label: "Synthetic intervention",
      detail: "Add one consolidated public service statement.",
      deployedAt: "2026-07-29T09:00:00.000Z",
    },
    followup: { summary: "Synthetic follow-up changed." },
    comparisonReceipt,
  };
}

function failureHeavyCohorts() {
  const sparseSuccesses = ({ repeatIndex, surface, prompt }) => (
    surface.id === SYNTHETIC_SURFACES[0].id
    && prompt.id === V1_PROMPT_PANEL.prompts[0].id
    && repeatIndex < 2
      ? {}
      : { state: "failed", rawAnswer: null }
  );
  return {
    baselineObservations: completeObservations(
      "baseline",
      ["2026-07-22", "2026-07-25", "2026-07-28"],
      sparseSuccesses,
    ),
    followupObservations: completeObservations(
      "followup",
      ["2026-08-05", "2026-08-08", "2026-08-11"],
      () => ({ state: "failed", rawAnswer: null }),
    ),
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

  assert.deepEqual(observed.coverage, {
    scheduled: 270,
    observed: 270,
    valid: 270,
    refused: 0,
    missing: 0,
    failed: 0,
    unreviewed: 0,
    excluded: 0,
    omitted: 0,
  });
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

test("separates unusable observations from valid mention denominators and expected coverage", () => {
  const states = [
    { state: "success", reviewStatus: "reviewed" },
    { state: "refused", reviewStatus: "reviewed" },
    { state: "missing_answer", reviewStatus: "reviewed" },
    { state: "failed", reviewStatus: "reviewed" },
    { state: "success", reviewStatus: "unreviewed" },
    { state: "success", reviewStatus: "excluded" },
  ];
  const baselineObservations = states.map((state, index) => makeObservation({
    day: "2026-07-22",
    prompt: V1_PROMPT_PANEL.prompts[index],
    surface: SYNTHETIC_SURFACES[index % SYNTHETIC_SURFACES.length],
    ...state,
  }));
  const evidence = analystEvidence();
  const input = minimalInput({ baselineObservations, evidence });
  input.caseRecord = caseAtHypothesisReady({ evidence, hypothesis: input.hypothesis, alternatives: input.alternatives });
  const dossier = buildInvestigationDossier(input);
  const finding = dossier.sections[0];

  assert.deepEqual(finding.coverage, {
    scheduled: 135,
    observed: 6,
    valid: 1,
    refused: 1,
    missing: 1,
    failed: 1,
    unreviewed: 1,
    excluded: 1,
    omitted: 129,
  });
  assert.equal(finding.metrics.reduce((sum, metric) => sum + metric.denominator, 0), 1);
});

test("keeps a failure-heavy unresolved closure below level five", () => {
  const input = closedInput({
    ...failureHeavyCohorts(),
    closureState: "closed_unresolved",
  });

  const dossier = buildInvestigationDossier(input);

  assert.equal(dossier.sections[0].coverage.valid, 2);
  assert.equal(dossier.sections[0].coverage.failed, 268);
  assert.ok(dossier.evidenceLevel < 5);
  assert.equal(dossier.evidenceState, "hypothesis_ready");
  assert.equal(dossier.header.state, "closed_unresolved");
  assert.equal(dossier.sections[3].followup.outcome, null);
});

test("rejects supported and weakened dossier replay with unusable cohorts", () => {
  for (const closureState of ["closed_supported", "closed_weakened"]) {
    const input = closedInput({ closureState });
    Object.assign(input, failureHeavyCohorts());
    assert.throws(
      () => buildInvestigationDossier(input),
      (error) => error.code === "INSUFFICIENT_USABLE_CYCLES",
      closureState,
    );
  }
});

test("rejects whitespace-only successful cohorts before they inflate evidence strength", () => {
  const whitespace = (observations) => observations.map((observation) => ({
    ...observation,
    rawAnswer: " \n\t ",
  }));

  assert.throws(
    () => buildInvestigationDossier(closedInput({
      baselineObservations: whitespace(completeObservations(
        "baseline",
        ["2026-07-22", "2026-07-25", "2026-07-28"],
      )),
      followupObservations: whitespace(completeObservations(
        "followup",
        ["2026-08-05", "2026-08-08", "2026-08-11"],
      )),
    })),
    (error) => error.code === "ANSWER_REQUIRED",
  );
});

test("does not derive repetition or level three from refused, unreviewed, or excluded rows", () => {
  const refusalOnly = [
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[0], state: "refused", repeatOrdinal: 1 }),
    makeObservation({ day: "2026-07-25", surface: SYNTHETIC_SURFACES[0], state: "refused", repeatOrdinal: 2 }),
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[1], prompt: V1_PROMPT_PANEL.prompts[1] }),
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[2], prompt: V1_PROMPT_PANEL.prompts[2] }),
  ];
  const excludedAndUnreviewed = [
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[0], reviewStatus: "excluded", repeatOrdinal: 1 }),
    makeObservation({ day: "2026-07-25", surface: SYNTHETIC_SURFACES[0], reviewStatus: "excluded", repeatOrdinal: 2 }),
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[1], prompt: V1_PROMPT_PANEL.prompts[1], reviewStatus: "unreviewed", repeatOrdinal: 1 }),
    makeObservation({ day: "2026-07-25", surface: SYNTHETIC_SURFACES[1], prompt: V1_PROMPT_PANEL.prompts[1], reviewStatus: "unreviewed", repeatOrdinal: 2 }),
    makeObservation({ day: "2026-07-22", surface: SYNTHETIC_SURFACES[2], prompt: V1_PROMPT_PANEL.prompts[2] }),
  ];

  for (const baselineObservations of [refusalOnly, excludedAndUnreviewed]) {
    const evidence = analystEvidence();
    const input = minimalInput({ baselineObservations, evidence });
    input.caseRecord = caseAtHypothesisReady({ evidence, hypothesis: input.hypothesis, alternatives: input.alternatives });
    assert.equal(buildInvestigationDossier(input).evidenceLevel, 1);
  }
});

test("rejects a decorative case state instead of trusting supplied events", () => {
  const input = minimalInput();
  input.caseRecord = { ...input.caseRecord, state: "closed_supported" };

  assert.throws(
    () => buildInvestigationDossier(input),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
});

test("uses outcome-specific level-five public terms", () => {
  assert.equal(buildKamranSyntheticDemo({ closureState: "closed_supported" }).dossier.evidenceTerm, "supported after follow-up");
  assert.equal(buildKamranSyntheticDemo({ closureState: "closed_weakened" }).dossier.evidenceTerm, "weakened after follow-up");
  assert.equal(buildKamranSyntheticDemo({ closureState: "closed_unresolved" }).dossier.evidenceTerm, "unresolved after follow-up");
});

test("revalidates the intervention time boundary at the dossier boundary", () => {
  const input = closedInput();
  assert.equal(buildInvestigationDossier(input).evidenceLevel, 5);

  input.followupObservations = completeObservations("followup", ["2026-07-20", "2026-07-23", "2026-07-26"]);
  assert.throws(
    () => buildInvestigationDossier(input),
    (error) => error.code === "INVALID_INTERVENTION_TIME_BOUNDARY",
  );
});

test("revalidates cadence and closure-time boundaries at the dossier boundary", () => {
  const sameTimestamp = closedInput();
  sameTimestamp.baselineObservations = sameTimestamp.baselineObservations.map((observation) => ({
    ...observation,
    scheduledAt: "2026-07-22T09:00:00.000Z",
    observationStartedAt: "2026-07-22T09:00:00.000Z",
    observationCompletedAt: "2026-07-22T09:00:02.000Z",
  }));
  assert.throws(
    () => buildInvestigationDossier(sameTimestamp),
    (error) => error.code === "INVALID_COHORT_CADENCE",
  );

  const delayedExecution = closedInput();
  delayedExecution.baselineObservations = delayedExecution.baselineObservations.map((observation) => ({
    ...observation,
    observationStartedAt: "2026-07-28T12:00:00.000Z",
    observationCompletedAt: "2026-07-28T12:00:02.000Z",
  }));
  delayedExecution.followupObservations = delayedExecution.followupObservations.map((observation) => ({
    ...observation,
    observationStartedAt: "2026-08-11T12:00:00.000Z",
    observationCompletedAt: "2026-08-11T12:00:02.000Z",
  }));
  assert.throws(
    () => buildInvestigationDossier(delayedExecution),
    (error) => error.code === "INVALID_COHORT_EXECUTION_WINDOW",
  );

  const afterClosure = closedInput();
  afterClosure.followupObservations = afterClosure.followupObservations.map((observation) => ({
    ...observation,
    scheduledAt: observation.scheduledAt.replace("2026-", "2030-"),
    observationStartedAt: observation.observationStartedAt.replace("2026-", "2030-"),
    observationCompletedAt: observation.observationCompletedAt.replace("2026-", "2030-"),
  }));
  assert.throws(
    () => buildInvestigationDossier(afterClosure),
    (error) => error.code === "INVALID_CLOSURE_TIME_BOUNDARY",
  );
});

test("rejects noncanonical observation language and country inside a canonical v1 dossier", () => {
  for (const requestConfig of [{ language: "ru" }, { country: "GB" }]) {
    const input = minimalInput();
    input.baselineObservations[0] = {
      ...input.baselineObservations[0],
      requestConfig: { ...input.baselineObservations[0].requestConfig, ...requestConfig },
    };
    assert.throws(
      () => buildInvestigationDossier(input),
      (error) => error.code === "DOSSIER_SCOPE_MISMATCH",
      JSON.stringify(requestConfig),
    );
  }
});

test("binds lifecycle review receipts to exact reviewed hypothesis and evidence content", () => {
  const scenarios = [
    {
      label: "hypothesis wording",
      mutate: (input) => { input.hypothesis.wording = "Mutated after lifecycle review."; },
    },
    {
      label: "hypothesis basis",
      mutate: (input) => { input.hypothesis.basis[0] = "Mutated basis."; },
    },
    {
      label: "alternative wording",
      mutate: (input) => { input.alternatives[0].wording = "Mutated alternative."; },
    },
    {
      label: "page evidence excerpt",
      mutate: (input) => {
        input.evidence.evidenceItems.find(({ id }) => id === "page-evidence").excerpt = "Mutated page evidence.";
      },
    },
  ];

  for (const scenario of scenarios) {
    const input = closedInput();
    scenario.mutate(input);
    assert.throws(
      () => buildInvestigationDossier(input),
      (error) => error.code === "CASE_HYPOTHESIS_REVIEW_MISMATCH",
      scenario.label,
    );
  }
});

test("rejects observations and lifecycle events after dossier review", () => {
  const afterObservation = closedInput();
  afterObservation.review.reviewedAt = "2026-08-11T08:59:59.000Z";
  assert.throws(
    () => buildInvestigationDossier(afterObservation),
    (error) => error.code === "INVALID_DOSSIER_REVIEW_TIME_BOUNDARY",
  );

  const afterEvent = closedInput();
  afterEvent.review.reviewedAt = "2026-08-11T10:00:00.000Z";
  assert.throws(
    () => buildInvestigationDossier(afterEvent),
    (error) => error.code === "INVALID_DOSSIER_REVIEW_TIME_BOUNDARY",
  );
});

test("derives diagnosis readiness only from reviewed independent evidence and alternatives", () => {
  const unreviewed = minimalInput();
  unreviewed.hypothesis = { ...unreviewed.hypothesis, reviewState: "draft" };
  unreviewed.caseRecord = caseAtEvidenceReview();
  assert.equal(buildInvestigationDossier(unreviewed).evidenceState, "unresolved");

  const noAlternatives = minimalInput({ alternatives: [] });
  noAlternatives.caseRecord = caseAtEvidenceReview();
  assert.equal(buildInvestigationDossier(noAlternatives).evidenceState, "unresolved");

  const providerOnly = minimalInput();
  const providerObservation = makeObservation({
    day: "2026-07-22",
    surface: SYNTHETIC_SURFACES[0],
    providerRationale: {
      kind: "reasoning_summary",
      text: "Synthetic provider rationale retained on the observation.",
      retentionStatus: "fixture_only",
    },
  });
  providerOnly.baselineObservations[0] = providerObservation;
  const providerClaim = extractAnswerEvidence(providerObservation, providerOnly.extractionConfig).claims[0];
  providerOnly.evidence = {
    claims: [providerClaim],
    evidenceItems: [reviewedEvidence({
      id: "provider-only",
      type: "provider_rationale",
      excerpt: providerObservation.providerRationale.text,
      url: null,
      observationId: providerObservation.id,
      surfaceId: providerObservation.surfaceId,
      surfaceLabel: providerObservation.surfaceLabel,
      collectedAt: providerObservation.observationCompletedAt,
    })],
    relations: [{
      claimId: providerClaim.id,
      evidenceItemId: "provider-only",
      relation: "contextualizes",
    }],
  };
  providerOnly.caseRecord = caseAtEvidenceReview();
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

test("accepts observation-backed evidence only when every provenance field and extracted claim is exact", () => {
  const dossier = buildInvestigationDossier(observationBackedInput());
  const evidenceItems = dossier.sections[1].items;

  assert.equal(evidenceItems.find(({ id }) => id === "observation-citation").url, "https://example.org/citation");
  assert.equal(evidenceItems.find(({ id }) => id === "observation-source").url, "https://example.org/source");
  assert.equal(evidenceItems.find(({ id }) => id === "observation-rationale").excerpt, "Synthetic provider rationale retained on the observation.");
});

test("rejects forged observation evidence provenance and deterministic claims", () => {
  const item = (input, id) => input.evidence.evidenceItems.find((candidate) => candidate.id === id);
  const scenarios = [
    {
      label: "surface ID",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-citation").surfaceId = SYNTHETIC_SURFACES[1].id; },
    },
    {
      label: "surface label",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-citation").surfaceLabel = "Forged surface"; },
    },
    {
      label: "collection timestamp",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-citation").collectedAt = "2026-07-22T09:00:03.000Z"; },
    },
    {
      label: "citation URL",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-citation").url = "https://attacker.example/citation"; },
    },
    {
      label: "returned-source URL",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-source").url = "https://attacker.example/source"; },
    },
    {
      label: "provider rationale",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-rationale").excerpt = "Invented rationale."; },
    },
    {
      label: "provider-rationale URL",
      code: "OBSERVATION_EVIDENCE_MISMATCH",
      mutate: (input) => { item(input, "observation-rationale").url = "https://attacker.example/rationale"; },
    },
    {
      label: "review authority",
      code: "UNREVIEWED_OBSERVATION_EVIDENCE",
      mutate: (input) => { input.baselineObservations[0].reviewStatus = "unreviewed"; },
    },
    {
      label: "claim text",
      code: "OBSERVATION_CLAIM_MISMATCH",
      mutate: (input) => { input.evidence.claims[0].text = "Invented extracted claim."; },
    },
    {
      label: "claim type",
      code: "OBSERVATION_CLAIM_MISMATCH",
      mutate: (input) => { input.evidence.claims[0].claimType = "invented_type"; },
    },
  ];

  for (const scenario of scenarios) {
    const input = structuredClone(observationBackedInput());
    scenario.mutate(input);
    assert.throws(
      () => buildInvestigationDossier(input),
      (error) => error.code === scenario.code,
      scenario.label,
    );
  }
});

test("requires observation-derived claims to bind same-observation evidence", () => {
  const missingObservationId = structuredClone(observationBackedInput());
  delete missingObservationId.evidence.claims[0].observationId;
  missingObservationId.caseRecord = caseAtHypothesisReady({
    evidence: missingObservationId.evidence,
    hypothesis: missingObservationId.hypothesis,
    alternatives: missingObservationId.alternatives,
  });
  assert.throws(
    () => buildInvestigationDossier(missingObservationId),
    (error) => error.code === "OBSERVATION_CLAIM_LINK_MISMATCH",
  );

  const crossObservation = structuredClone(observationBackedInput());
  const observationB = makeObservation({
    id: "baseline-linked-observation-b",
    day: "2026-07-22",
    repeatOrdinal: 1,
    surface: SYNTHETIC_SURFACES[0],
    prompt: V1_PROMPT_PANEL.prompts[1],
    rawAnswer: "A second synthetic answer.",
    citations: [{
      id: "citation-b",
      url: "https://example.org/citation?private=drop#fragment",
      title: "Synthetic citation B",
      start: 0,
      end: 10,
    }],
  });
  crossObservation.baselineObservations[1] = observationB;
  const linkedItem = crossObservation.evidence.evidenceItems.find(({ id }) => id === "observation-citation");
  linkedItem.observationId = observationB.id;
  linkedItem.surfaceId = observationB.surfaceId;
  linkedItem.surfaceLabel = observationB.surfaceLabel;
  linkedItem.collectedAt = observationB.observationCompletedAt;
  crossObservation.caseRecord = caseAtHypothesisReady({
    evidence: crossObservation.evidence,
    hypothesis: crossObservation.hypothesis,
    alternatives: crossObservation.alternatives,
  });
  assert.throws(
    () => buildInvestigationDossier(crossObservation),
    (error) => error.code === "OBSERVATION_CLAIM_LINK_MISMATCH",
  );
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
  const baselineObservations = SYNTHETIC_SURFACES.map((surface, index) => makeObservation({
    day: "2026-07-22",
    windowName: "baseline",
    surface,
    prompt: V1_PROMPT_PANEL.prompts[index],
  }));
  const input = minimalInput({
    baselineObservations,
    evidence: evidenceFor(baselineObservations[0]),
  });
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

test("rejects observation IDs reused across baseline and follow-up", () => {
  const input = closedInput();
  input.followupObservations = input.followupObservations.map((observation, index) => ({
    ...observation,
    id: input.baselineObservations[index].id,
  }));

  assert.throws(
    () => buildInvestigationDossier(input),
    (error) => error.code === "DUPLICATE_DOSSIER_OBSERVATION",
  );
});

test("keeps a partial dossier inspectable when one surface is wholly omitted", () => {
  const input = minimalInput();
  const omittedSurface = SYNTHETIC_SURFACES[2];
  input.baselineObservations = input.baselineObservations.filter(({ surfaceId }) => surfaceId !== omittedSurface.id);

  const dossier = buildInvestigationDossier(input);

  assert.equal(dossier.sections[0].coverage.omitted, 131);
  assert.equal(dossier.header.surfaces[2], omittedSurface.id);
  assert.deepEqual(
    dossier.sections[0].metrics.filter(({ surfaceId }) => surfaceId === omittedSurface.id).map(({ denominator }) => denominator),
    [0],
  );
});

test("returns a frozen safe projection without freezing caller-owned inputs", () => {
  const input = minimalInput();
  input.secret = "PRIVATE_SENTINEL";
  input.caseRecord = structuredClone(input.caseRecord);
  input.caseRecord.requestId = "PRIVATE_SENTINEL";
  input.evidence.evidenceItems[0].requestConfig = { secret: "PRIVATE_SENTINEL" };
  const original = structuredClone(input);

  const dossier = buildInvestigationDossier(input);
  const serialized = JSON.stringify(dossier);

  assert.deepEqual(input, original);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(dossier), true);
  assert.equal(serialized.includes("PRIVATE_SENTINEL"), false);
  assert.deepEqual(Object.keys(dossier.sections[0].coverage), [
    "scheduled", "observed", "valid", "refused", "missing", "failed", "unreviewed", "excluded", "omitted",
  ]);
  assert.deepEqual(Object.keys(dossier.sections[1].items[0]), [
    "id", "type", "label", "excerpt", "provenance", "relation", "url", "surfaceId",
    "surfaceLabel", "observationId", "collectedAt", "reviewState", "optional",
  ]);
});
