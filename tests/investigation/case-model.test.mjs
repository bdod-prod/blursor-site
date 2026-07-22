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
