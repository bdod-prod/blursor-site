import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTIGATION_STATES,
  createInvestigationCase,
  transitionInvestigationCase,
} from "../../functions/lib/investigation/case-model.mjs";
import { createFollowupComparisonReceipt } from "../../functions/lib/investigation/followup-comparison.mjs";
import { hypothesisReview, makeObservation } from "./test-fixtures.mjs";

function caseInput(overrides = {}) {
  return {
    id: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    question: "Why is the brand absent from this US prompt cohort?",
    methodVersion: "0.2",
    panelId: "kamran-us-en-v1",
    panelVersion: 1,
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

function comparableFollowup() {
  const baselineObservations = [makeObservation({ day: "2026-07-22", windowName: "baseline" })];
  const followupObservations = [makeObservation({ day: "2026-08-05", windowName: "followup" })];
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
  record = transition(record, "intervention_in_progress", "2026-07-29T10:00:00.000Z");
  record = transition(record, "followup_collecting", "2026-08-05T10:00:00.000Z");
  return transition(record, "followup_review", "2026-08-12T10:00:00.000Z");
}

test("follows the approved lifecycle through reviewed evidence and comparable cohorts", () => {
  let record = advanceToFollowupReview();
  record = transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparison: comparableFollowup() });

  assert.equal(record.state, "closed_supported");
  assert.equal(record.events.length, 7);
  assert.equal(record.events[2].hypothesisReviewReceipt.reviewedEvidenceItemIds.length, 1);
  assert.equal(record.events.at(-1).comparisonReceipt.comparable, true);
  assert.deepEqual(INVESTIGATION_STATES, [
    "draft", "baseline_collecting", "evidence_review", "unresolved", "hypothesis_ready",
    "intervention_in_progress", "followup_collecting", "followup_review",
    "closed_supported", "closed_weakened", "closed_unresolved",
  ]);
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
      comparison: { receipt: { comparable: true }, baselineObservations: [], followupObservations: [] },
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
