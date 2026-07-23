import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTIGATION_STATES,
  createInvestigationCase,
  transitionInvestigationCase,
} from "../../functions/lib/investigation/case-model.mjs";
import { createExpectedCohortReceipt } from "../../functions/lib/investigation/expected-cohort.mjs";
import { createFollowupComparisonReceipt } from "../../functions/lib/investigation/followup-comparison.mjs";
import { V1_PROMPT_PANEL } from "../../functions/lib/investigation/v1-scope.mjs";
import { validatePromptPanel } from "../../functions/lib/visibility/prompt-panel.mjs";
import { SYNTHETIC_SURFACES, hypothesisReview, makeObservation } from "./test-fixtures.mjs";

function caseInput(overrides = {}) {
  return {
    id: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    question: "Why is the brand absent from this US prompt cohort?",
    methodVersion: "0.2",
    panelId: "kamran-us-en-v1",
    panelVersion: 1,
    panelFingerprint: V1_PROMPT_PANEL.fingerprint,
    cycleCount: 3,
    cadenceDays: 3,
    language: "en",
    location: "US",
    surfaces: [
      "synthetic_chatgpt_web_logged_out_us",
      "synthetic_openai_responses_web_search_auto",
      "synthetic_openai_responses_web_search_required",
    ],
    createdAt: "2026-07-22T09:00:00.000Z",
    ...overrides,
  };
}

function transition(record, to, at, extra = {}) {
  return transitionInvestigationCase(record, {
    to,
    at,
    reviewer: "alex",
    note: "Reviewed.",
    ...extra,
  });
}

function cohort(windowName, days, prompts = V1_PROMPT_PANEL.prompts, observationOverrides = () => ({})) {
  return days.flatMap((day, repeatIndex) => SYNTHETIC_SURFACES.flatMap((surface) => prompts.map((prompt) => (
    makeObservation({
      day,
      windowName,
      repeatOrdinal: repeatIndex + 1,
      surface,
      prompt,
      ...observationOverrides({ day, repeatIndex, surface, prompt }),
    })
  ))));
}

function comparableFollowup({
  baselineDays = ["2026-07-22", "2026-07-25", "2026-07-28"],
  followupDays = ["2026-08-05", "2026-08-08", "2026-08-11"],
  prompts = V1_PROMPT_PANEL.prompts,
  baselineOverrides,
  followupOverrides,
} = {}) {
  const baselineObservations = cohort("baseline", baselineDays, prompts, baselineOverrides);
  const followupObservations = cohort("followup", followupDays, prompts, followupOverrides);
  return {
    receipt: createFollowupComparisonReceipt({ baselineObservations, followupObservations }),
    baselineObservations,
    followupObservations,
  };
}

function advanceToFollowupReview() {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  record = transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { hypothesisReview: hypothesisReview() });
  record = transition(record, "intervention_in_progress", "2026-07-29T10:00:00.000Z", {
    intervention: {
      label: "Synthetic intervention",
      detail: "Add one consolidated public service statement.",
      deployedAt: "2026-07-29T09:00:00.000Z",
    },
  });
  record = transition(record, "followup_collecting", "2026-08-05T10:00:00.000Z");
  return transition(record, "followup_review", "2026-08-12T10:00:00.000Z");
}

test("follows the approved lifecycle through reviewed evidence and comparable cohorts", () => {
  let record = advanceToFollowupReview();
  record = transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparison: comparableFollowup() });

  assert.equal(record.state, "closed_supported");
  assert.equal(record.events.length, 7);
  assert.equal(record.events[2].hypothesisReviewReceipt.reviewedEvidenceItemIds.length, 1);
  assert.equal(record.events[3].interventionReceipt.deployedAt, "2026-07-29T09:00:00.000Z");
  assert.equal(record.events.at(-1).comparisonReceipt.comparable, true);
  assert.deepEqual(INVESTIGATION_STATES, [
    "draft", "baseline_collecting", "evidence_review", "unresolved", "hypothesis_ready",
    "intervention_in_progress", "followup_collecting", "followup_review",
    "closed_supported", "closed_weakened", "closed_unresolved",
  ]);
});

test("freezes the canonical panel fingerprint and complete expected v1 cohort on the case", () => {
  const record = createInvestigationCase(caseInput());

  assert.equal(record.panelFingerprint, V1_PROMPT_PANEL.fingerprint);
  assert.equal(record.cycleCount, 3);
  assert.equal(record.cadenceDays, 3);
  assert.equal(record.expectedCohortReceipt.expectedCount, 135);
  assert.deepEqual(record.expectedCohortReceipt.promptIds, V1_PROMPT_PANEL.prompts.map(({ id }) => id));
  assert.deepEqual(record.expectedCohortReceipt.surfaceIds, caseInput().surfaces);
  assert.deepEqual(record.expectedCohortReceipt.repeatOrdinals, [1, 2, 3]);
  assert.equal(Object.isFrozen(record.expectedCohortReceipt), true);
});

test("rejects a self-consistent mutation of the frozen v1 panel", () => {
  const mutated = JSON.parse(V1_PROMPT_PANEL.fingerprint);
  mutated.prompts[0].text = "Mutated but internally consistent prompt.";

  assert.throws(
    () => createInvestigationCase(caseInput({ panelFingerprint: JSON.stringify(mutated) })),
    (error) => error.code === "V1_PANEL_FINGERPRINT_MISMATCH",
  );
});

test("rejects an expected cohort derived from a different case fingerprint", () => {
  const panel = (text) => validatePromptPanel({
    id: "custom-test-panel",
    version: 1,
    methodologyVersion: "0.2",
    prompts: [{ id: "prompt-01", text, language: "en", intent: "discovery" }],
  });
  const casePanel = panel("Canonical case prompt.");
  const differentPanel = panel("Different prompt with the same public identity.");
  const record = createInvestigationCase(caseInput({
    panelId: casePanel.id,
    panelVersion: casePanel.version,
    methodVersion: casePanel.methodologyVersion,
    panelFingerprint: casePanel.fingerprint,
  }));
  const forged = {
    ...record,
    expectedCohortReceipt: createExpectedCohortReceipt({
      panelId: differentPanel.id,
      panelVersion: differentPanel.version,
      methodologyVersion: differentPanel.methodologyVersion,
      panelFingerprint: differentPanel.fingerprint,
      surfaces: record.surfaces,
      cycleCount: record.cycleCount,
    }),
  };

  assert.throws(
    () => transition(forged, "baseline_collecting", "2026-07-22T09:01:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
});

test("requires and stores a structured intervention before follow-up", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  record = transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { hypothesisReview: hypothesisReview() });

  assert.throws(
    () => transition(record, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INTERVENTION_REQUIRED",
  );
  assert.throws(
    () => transition(record, "intervention_in_progress", "2026-07-29T10:00:00.000Z", {
      intervention: { label: "Synthetic", deployedAt: "not-a-time" },
    }),
    (error) => error.code === "INVALID_INTERVENTION",
  );
});

test("rejects sparse and temporally invalid follow-up closure cohorts", () => {
  const record = advanceToFollowupReview();
  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", {
      comparison: comparableFollowup({ prompts: [V1_PROMPT_PANEL.prompts[0]] }),
    }),
    (error) => error.code === "INCOMPLETE_EXPECTED_COHORT",
  );
  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", {
      comparison: comparableFollowup({ followupDays: ["2026-07-20", "2026-07-23", "2026-07-26"] }),
    }),
    (error) => error.code === "INVALID_INTERVENTION_TIME_BOUNDARY",
  );
});

test("rejects nominal cycles that do not preserve the frozen three-day cadence", () => {
  const record = advanceToFollowupReview();
  for (const windowName of ["baseline", "followup"]) {
    const comparison = comparableFollowup();
    comparison[`${windowName}Observations`] = comparison[`${windowName}Observations`].map((observation) => ({
      ...observation,
      scheduledAt: windowName === "baseline" ? "2026-07-22T09:00:00.000Z" : "2026-08-05T09:00:00.000Z",
      observationStartedAt: windowName === "baseline" ? "2026-07-22T09:00:00.000Z" : "2026-08-05T09:00:00.000Z",
      observationCompletedAt: windowName === "baseline" ? "2026-07-22T09:00:02.000Z" : "2026-08-05T09:00:02.000Z",
    }));
    comparison.receipt = createFollowupComparisonReceipt(comparison);

    assert.throws(
      () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparison }),
      (error) => error.code === "INVALID_COHORT_CADENCE",
      windowName,
    );
  }
});

test("rejects cycles executed outside their half-open scheduled cadence windows", () => {
  const record = advanceToFollowupReview();
  const comparison = comparableFollowup({
    baselineOverrides: () => ({
      observationStartedAt: "2026-07-28T12:00:00.000Z",
      observationCompletedAt: "2026-07-28T12:00:02.000Z",
    }),
    followupOverrides: () => ({
      observationStartedAt: "2026-08-11T12:00:00.000Z",
      observationCompletedAt: "2026-08-11T12:00:02.000Z",
    }),
  });

  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparison }),
    (error) => error.code === "INVALID_COHORT_EXECUTION_WINDOW",
  );
});

test("allows unusable complete cohorts to close only as unresolved", () => {
  const sparseSuccesses = ({ repeatIndex, surface, prompt }) => (
    surface.id === SYNTHETIC_SURFACES[0].id
    && prompt.id === V1_PROMPT_PANEL.prompts[0].id
    && repeatIndex < 2
      ? {}
      : { state: "failed", rawAnswer: null }
  );
  const comparison = comparableFollowup({
    baselineOverrides: sparseSuccesses,
    followupOverrides: () => ({ state: "failed", rawAnswer: null }),
  });
  const record = advanceToFollowupReview();

  for (const closureState of ["closed_supported", "closed_weakened"]) {
    assert.throws(
      () => transition(record, closureState, "2026-08-12T11:00:00.000Z", { comparison }),
      (error) => error.code === "INSUFFICIENT_USABLE_CYCLES",
      closureState,
    );
  }
  const unresolved = transition(record, "closed_unresolved", "2026-08-12T11:00:00.000Z", { comparison });
  assert.equal(unresolved.state, "closed_unresolved");
});

test("rejects closure observations that finish after the closure event", () => {
  const record = advanceToFollowupReview();
  const comparison = comparableFollowup({
    followupDays: ["2030-08-05", "2030-08-08", "2030-08-11"],
  });

  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparison }),
    (error) => error.code === "INVALID_CLOSURE_TIME_BOUNDARY",
  );
});

test("rejects transitions outside the approved lifecycle", () => {
  const record = createInvestigationCase(caseInput());
  assert.throws(
    () => transition(record, "evidence_review", "2026-07-22T09:01:00.000Z"),
    /cannot transition/i,
  );
});

test("requires reviewed structured evidence and alternatives before hypothesis readiness", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");

  assert.throws(
    () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 999, alternativesCount: 999 }),
    (error) => error.code === "RAW_REVIEW_COUNTS_NOT_ALLOWED",
  );
  const draftAlternative = hypothesisReview();
  draftAlternative.alternatives[0].reviewState = "draft";
  assert.throws(
    () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { hypothesisReview: draftAlternative }),
    (error) => error.code === "HYPOTHESIS_REVIEW_INCOMPLETE",
  );
  const providerOnly = hypothesisReview();
  providerOnly.evidence.evidenceItems[0] = {
    ...providerOnly.evidence.evidenceItems[0],
    type: "provider_rationale",
    observationId: "obs-1",
  };
  assert.throws(
    () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { hypothesisReview: providerOnly }),
    (error) => error.code === "HYPOTHESIS_REVIEW_INCOMPLETE",
  );
});

test("reopens unresolved work by appending an immutable review event", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  const unresolved = transition(record, "unresolved", "2026-07-28T10:00:00.000Z", { note: "Evidence is insufficient." });
  const reopened = transition(unresolved, "baseline_collecting", "2026-07-29T10:00:00.000Z", { note: "Run the smallest next test." });

  assert.equal(unresolved.state, "unresolved");
  assert.equal(reopened.events.length, unresolved.events.length + 1);
  assert.notStrictEqual(reopened.events, unresolved.events);
  assert.equal(Object.isFrozen(reopened.events.at(-1)), true);
});

test("does not freeze a rehydrated caller history while appending a transition", () => {
  const draft = createInvestigationCase(caseInput());
  const baseline = transition(draft, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  const supplied = structuredClone(baseline);
  const original = structuredClone(supplied);

  const next = transition(supplied, "evidence_review", "2026-07-28T09:01:00.000Z");

  assert.deepEqual(supplied, original);
  assert.equal(Object.isFrozen(supplied), false);
  assert.notStrictEqual(next.events[0], supplied.events[0]);
  assert.equal(Object.isFrozen(next.events[0]), true);
});

test("rejects raw or fabricated comparability gates", () => {
  const record = advanceToFollowupReview();
  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparability: true }),
    (error) => error.code === "RAW_COMPARABILITY_NOT_ALLOWED",
  );
  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", {
      comparison: { ...comparableFollowup(), receipt: { comparable: true } },
    }),
    (error) => error.code === "INVALID_COMPARISON_RECEIPT",
  );
});

test("enforces strictly monotonic event timestamps from case creation onward", () => {
  const draft = createInvestigationCase(caseInput());
  assert.throws(
    () => transition(draft, "baseline_collecting", "2026-07-22T08:59:59.000Z"),
    (error) => error.code === "INVALID_CASE_TIMESTAMP_ORDER",
  );
  const baseline = transition(draft, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  for (const at of ["2026-07-22T09:00:59.000Z", "2026-07-22T09:01:00.000Z"]) {
    assert.throws(
      () => transition(baseline, "evidence_review", at),
      (error) => error.code === "INVALID_CASE_TIMESTAMP_ORDER",
    );
  }
});

test("rejects forged case state and malformed replay receipts", () => {
  const draft = createInvestigationCase(caseInput());
  const forged = Object.freeze({ ...draft, state: "hypothesis_ready" });
  assert.throws(
    () => transition(forged, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );

  let reviewed = createInvestigationCase(caseInput());
  reviewed = transition(reviewed, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  reviewed = transition(reviewed, "evidence_review", "2026-07-28T09:01:00.000Z");
  reviewed = transition(reviewed, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { hypothesisReview: hypothesisReview() });
  const malformed = {
    ...reviewed,
    events: reviewed.events.map((event) => event.to === "hypothesis_ready"
      ? { ...event, hypothesisReviewReceipt: { ...event.hypothesisReviewReceipt, reviewedAlternativeIds: [] } }
      : event),
  };
  assert.throws(
    () => transition(malformed, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
  const forgedFingerprint = {
    ...reviewed,
    events: reviewed.events.map((event) => event.to === "hypothesis_ready"
      ? { ...event, hypothesisReviewReceipt: { ...event.hypothesisReviewReceipt, reviewFingerprint: "{}" } }
      : event),
  };
  assert.throws(
    () => transition(forgedFingerprint, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
});

test("requires exactly three distinct ID-like surfaces", () => {
  for (const surfaces of [
    "synthetic_chatgpt_web_logged_out_us",
    ["synthetic_chatgpt_web_logged_out_us", undefined, "synthetic_openai_responses_web_search_required"],
    ["synthetic_chatgpt_web_logged_out_us", "synthetic_chatgpt_web_logged_out_us", "synthetic_openai_responses_web_search_required"],
    ["synthetic_chatgpt_web_logged_out_us", "not an id", "synthetic_openai_responses_web_search_required"],
  ]) {
    assert.throws(
      () => createInvestigationCase(caseInput({ surfaces })),
      (error) => error.code === "INVALID_CASE_SCOPE",
    );
  }
});

test("enforces the complete canonical v1 case identity", () => {
  const scenarios = [
    { projectId: "different-project" },
    { language: "ru" },
    { location: "GB" },
    { cadenceDays: 2 },
  ];

  for (const override of scenarios) {
    assert.throws(
      () => createInvestigationCase(caseInput(override)),
      (error) => error.code === "INVALID_CASE_SCOPE",
      JSON.stringify(override),
    );
  }
});
