import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTIGATION_STATES,
  createInvestigationCase,
  transitionInvestigationCase,
} from "../../functions/lib/investigation/case-model.mjs";

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

test("follows the approved investigation lifecycle through a comparable follow-up", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  record = transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 1, alternativesCount: 1 });
  record = transition(record, "intervention_in_progress", "2026-07-29T10:00:00.000Z");
  record = transition(record, "followup_collecting", "2026-08-05T10:00:00.000Z");
  record = transition(record, "followup_review", "2026-08-12T10:00:00.000Z");
  record = transition(record, "closed_supported", "2026-08-12T11:00:00.000Z", { comparability: true });

  assert.equal(record.state, "closed_supported");
  assert.equal(record.events.length, 7);
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

test("requires evidence and an alternative before a hypothesis is review-ready", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");

  assert.throws(
    () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 1, alternativesCount: 0 }),
    /alternative/i,
  );
  assert.throws(
    () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 0, alternativesCount: 1 }),
    /linked evidence/i,
  );
});

test("requires finite positive integer hypothesis review counts", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");

  for (const invalidCount of [true, "1", 1.5, Infinity]) {
    assert.throws(
      () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: invalidCount, alternativesCount: 1 }),
      (error) => error.code === "HYPOTHESIS_REVIEW_INCOMPLETE",
    );
    assert.throws(
      () => transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 1, alternativesCount: invalidCount }),
      (error) => error.code === "HYPOTHESIS_REVIEW_INCOMPLETE",
    );
  }
});

test("reopens unresolved work by appending an immutable review event", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  const unresolved = transition(record, "unresolved", "2026-07-28T10:00:00.000Z", { note: "Evidence is insufficient." });
  const reopened = transition(unresolved, "baseline_collecting", "2026-07-29T10:00:00.000Z", { note: "Run the smallest next test." });

  assert.equal(unresolved.state, "unresolved");
  assert.equal(unresolved.events.length, 3);
  assert.equal(reopened.events.length, unresolved.events.length + 1);
  assert.notStrictEqual(reopened.events, unresolved.events);
  assert.equal(Object.isFrozen(reopened), true);
  assert.equal(Object.isFrozen(reopened.events), true);
  assert.equal(Object.isFrozen(reopened.events.at(-1)), true);
});

test("does not freeze a rehydrated caller history while appending a transition", () => {
  const draft = createInvestigationCase(caseInput());
  const baseline = transition(draft, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  const supplied = {
    ...baseline,
    events: baseline.events.map((event) => ({ ...event })),
  };
  const original = structuredClone(supplied);

  const next = transition(supplied, "evidence_review", "2026-07-28T09:01:00.000Z");

  assert.deepEqual(supplied, original);
  assert.equal(Object.isFrozen(supplied), false);
  assert.equal(Object.isFrozen(supplied.events), false);
  assert.equal(Object.isFrozen(supplied.events[0]), false);
  assert.notStrictEqual(next.events[0], supplied.events[0]);
  assert.equal(Object.isFrozen(next.events[0]), true);
});

test("requires a comparable follow-up window before closure", () => {
  const record = Object.freeze({
    ...createInvestigationCase(caseInput()),
    state: "followup_review",
  });

  assert.throws(
    () => transition(record, "closed_supported", "2026-08-12T10:00:00.000Z", { comparability: false }),
    /comparable/i,
  );
});

test("rejects forged case state and noncanonical review history", () => {
  const draft = createInvestigationCase(caseInput());
  const forgedHypothesis = Object.freeze({ ...draft, state: "hypothesis_ready" });
  const forgedFollowup = Object.freeze({ ...draft, state: "followup_review" });

  assert.throws(
    () => transition(forgedHypothesis, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
  assert.throws(
    () => transition(forgedFollowup, "closed_supported", "2026-08-12T10:00:00.000Z", { comparability: true }),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );

  const baseline = transition(draft, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  const badFrom = Object.freeze({
    ...draft,
    state: "baseline_collecting",
    events: [{ ...baseline.events[0], from: "evidence_review" }],
  });

  assert.throws(
    () => transition(badFrom, "evidence_review", "2026-07-28T09:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
});

test("rejects malformed review gates in replayed history", () => {
  let record = createInvestigationCase(caseInput());
  record = transition(record, "baseline_collecting", "2026-07-22T09:01:00.000Z");
  record = transition(record, "evidence_review", "2026-07-28T09:01:00.000Z");
  record = transition(record, "hypothesis_ready", "2026-07-28T10:00:00.000Z", { evidenceLinks: 1, alternativesCount: 1 });

  const badHypothesisCount = Object.freeze({
    ...record,
    events: record.events.map((event) => event.to === "hypothesis_ready" ? { ...event, evidenceLinks: 1.5 } : event),
  });
  const missingReviewer = Object.freeze({
    ...record,
    events: record.events.map((event) => event.to === "evidence_review" ? { ...event, reviewer: "" } : event),
  });

  assert.throws(
    () => transition(badHypothesisCount, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
  assert.throws(
    () => transition(missingReviewer, "intervention_in_progress", "2026-07-29T10:00:00.000Z"),
    (error) => error.code === "INVALID_CASE_HISTORY",
  );
});

test("requires exactly three distinct ID-like surfaces", () => {
  assert.doesNotThrow(() => createInvestigationCase(caseInput()));
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
