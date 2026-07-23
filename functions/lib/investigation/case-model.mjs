import { VisibilityError } from "../visibility/visibility-error.mjs";
import { buildEvidenceTrace } from "./evidence-trace.mjs";
import {
  assertStoredComparisonReceipt,
  validateFollowupComparisonReceipt,
} from "./followup-comparison.mjs";
import {
  createExpectedCohortReceipt,
  evaluateCohortAgainstExpectation,
  validateExpectedCohortReceipt,
} from "./expected-cohort.mjs";
import { validatePanelFingerprint } from "./panel-identity.mjs";
import { V1_PROMPT_PANEL } from "./v1-panel.mjs";

export const INVESTIGATION_STATES = Object.freeze([
  "draft", "baseline_collecting", "evidence_review", "unresolved", "hypothesis_ready",
  "intervention_in_progress", "followup_collecting", "followup_review",
  "closed_supported", "closed_weakened", "closed_unresolved",
]);

const ALLOWED = Object.freeze({
  draft: new Set(["baseline_collecting"]),
  baseline_collecting: new Set(["evidence_review"]),
  evidence_review: new Set(["unresolved", "hypothesis_ready"]),
  unresolved: new Set(["baseline_collecting", "evidence_review"]),
  hypothesis_ready: new Set(["intervention_in_progress", "closed_unresolved"]),
  intervention_in_progress: new Set(["followup_collecting"]),
  followup_collecting: new Set(["followup_review"]),
  followup_review: new Set(["closed_supported", "closed_weakened", "closed_unresolved"]),
  closed_supported: new Set(),
  closed_weakened: new Set(),
  closed_unresolved: new Set(),
});

const SURFACE_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;

const date = (value) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new VisibilityError("INVALID_CASE_TIMESTAMP", "Case event timestamp is invalid.");
  return parsed.toISOString();
};

const clone = (value, seen = new WeakMap()) => {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const [key, child] of Object.entries(value)) copy[key] = clone(child, seen);
  return copy;
};

const freeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
};

const reviewName = (value) => String(value || "").trim();

const validSurfaces = (surfaces) => Array.isArray(surfaces)
  && surfaces.length === 3
  && surfaces.every((surface) => typeof surface === "string" && SURFACE_ID.test(surface))
  && new Set(surfaces).size === surfaces.length;

const historyError = (message) => new VisibilityError("INVALID_CASE_HISTORY", message);

const normalizeIntervention = (value, eventAt, stored = false) => {
  const error = (message) => {
    if (stored) throw historyError(message);
    throw new VisibilityError("INVALID_INTERVENTION", message);
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (stored) throw historyError("A structured intervention receipt is required.");
    throw new VisibilityError("INTERVENTION_REQUIRED", "A structured intervention is required before follow-up.");
  }
  const label = String(value.label || "").trim();
  if (!label) error("Intervention label is required.");
  let deployedAt;
  try {
    deployedAt = date(value.deployedAt);
  } catch {
    error("Intervention deployment timestamp is invalid.");
  }
  if (new Date(deployedAt).getTime() > new Date(eventAt).getTime()) {
    error("Intervention deployment cannot occur after its lifecycle event.");
  }
  return freeze({
    schemaVersion: 1,
    label,
    detail: value.detail == null ? null : String(value.detail),
    deployedAt,
  });
};

const validateCaseScope = (record) => {
  const identityFields = ["id", "projectId", "question", "methodVersion", "panelId", "language", "location"];
  if (
    record?.schemaVersion !== 1
    || identityFields.some((field) => !String(record?.[field] || "").trim())
    || !Number.isInteger(record?.panelVersion)
    || record.panelVersion < 1
    || !Number.isInteger(record?.cycleCount)
    || record.cycleCount < 1
    || !validSurfaces(record?.surfaces)
  ) {
    throw historyError("Case scope is invalid.");
  }
  try {
    validatePanelFingerprint(record.panelFingerprint, {
      panelId: record.panelId,
      panelVersion: record.panelVersion,
      methodologyVersion: record.methodVersion,
    });
    if (record.panelId === V1_PROMPT_PANEL.id && record.cycleCount < 3) {
      throw new VisibilityError("INVALID_EXPECTED_COHORT", "The v1 case requires at least three cycles.");
    }
    validateExpectedCohortReceipt(record.expectedCohortReceipt, {
      panelId: record.panelId,
      panelVersion: record.panelVersion,
      methodologyVersion: record.methodVersion,
      panelFingerprint: record.panelFingerprint,
      surfaces: record.surfaces,
      cycleCount: record.cycleCount,
    });
  } catch (error) {
    if (error?.code === "INVALID_CASE_HISTORY") throw error;
    throw historyError(error?.message || "Case panel and expected cohort are invalid.");
  }
};

const validateStoredHypothesisReceipt = (receipt, error) => {
  const evidenceIds = receipt?.reviewedEvidenceItemIds;
  const alternativeIds = receipt?.reviewedAlternativeIds;
  if (
    receipt?.schemaVersion !== 1
    || typeof receipt.hypothesisId !== "string"
    || !receipt.hypothesisId
    || !Array.isArray(evidenceIds)
    || evidenceIds.length < 1
    || evidenceIds.some((id) => typeof id !== "string" || !id)
    || new Set(evidenceIds).size !== evidenceIds.length
    || !Array.isArray(alternativeIds)
    || alternativeIds.length < 1
    || alternativeIds.some((id) => typeof id !== "string" || !id)
    || new Set(alternativeIds).size !== alternativeIds.length
  ) {
    throw error("A reviewed hypothesis requires structured evidence and alternatives.");
  }
  return receipt;
};

const createHypothesisReviewReceipt = (review) => {
  if (!review || typeof review !== "object") {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "A reviewed hypothesis record is required.");
  }
  const hypothesisId = String(review.hypothesis?.id || "").trim();
  if (!hypothesisId || review.hypothesis?.reviewState !== "approved") {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "The hypothesis must be an approved structured record.");
  }
  const reviewedAlternatives = (review.alternatives || []).filter((alternative) => (
    alternative?.reviewState === "reviewed"
    && String(alternative?.id || "").trim()
    && String(alternative?.wording || "").trim()
    && String(alternative?.disposition || "").trim()
  ));
  if (reviewedAlternatives.length === 0) {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "At least one reviewed alternative record is required.");
  }
  const trace = buildEvidenceTrace(review.evidence || {});
  const reviewedEvidenceItemIds = [...new Set(trace.claims.flatMap(({ evidence }) => evidence
    .filter(({ relation, item }) => (
      item.reviewState === "reviewed"
      && !["provider_rationale", "analyst_annotation"].includes(item.type)
      && ["supports", "contextualizes"].includes(relation)
    ))
    .map(({ item }) => item.id)))].sort();
  if (reviewedEvidenceItemIds.length === 0) {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "Reviewed independent evidence must support or contextualize the hypothesis.");
  }
  return freeze({
    schemaVersion: 1,
    hypothesisId,
    reviewedEvidenceItemIds,
    reviewedAlternativeIds: reviewedAlternatives.map(({ id }) => String(id).trim()).sort(),
  });
};

const validateHistoryGate = (from, event) => {
  if (event.to === "hypothesis_ready") {
    validateStoredHypothesisReceipt(event.hypothesisReviewReceipt, historyError);
  }
  if (event.to.startsWith("closed_") && from === "followup_review") {
    try {
      const receipt = assertStoredComparisonReceipt(event.comparisonReceipt);
      if (!receipt.comparable) throw new Error("not comparable");
    } catch {
      throw historyError("A follow-up conclusion requires a valid comparable cohort receipt.");
    }
  }
  if (event.to === "intervention_in_progress") {
    normalizeIntervention(event.interventionReceipt, event.at, true);
  }
};

const validateCaseHistory = (record) => {
  if (!record || typeof record !== "object" || !Array.isArray(record.events)) {
    throw historyError("Case history must contain an event array.");
  }
  validateCaseScope(record);
  let previousAt;
  try {
    previousAt = new Date(date(record.createdAt)).getTime();
  } catch {
    throw historyError("Case creation timestamp is invalid.");
  }

  let replayState = "draft";
  for (const event of record.events) {
    if (!event || typeof event !== "object" || event.from !== replayState) {
      throw historyError("Case history event source does not match the replay state.");
    }
    if (!INVESTIGATION_STATES.includes(event.to) || !ALLOWED[replayState]?.has(event.to)) {
      throw historyError("Case history contains an invalid lifecycle transition.");
    }
    if (!reviewName(event.reviewer)) throw historyError("Every case history event requires a reviewer.");
    let eventAt;
    try {
      eventAt = new Date(date(event.at)).getTime();
    } catch {
      throw historyError("Case history event timestamp is invalid.");
    }
    if (eventAt <= previousAt) throw historyError("Case history timestamps must be strictly increasing.");
    validateHistoryGate(replayState, event);
    previousAt = eventAt;
    replayState = event.to;
  }

  if (record.state !== replayState) throw historyError("Case state does not match the replayed event history.");
};

export function createInvestigationCase(input) {
  const suppliedSurfaces = input?.surfaces;
  const record = {
    schemaVersion: 1,
    id: String(input?.id || "").trim(),
    projectId: String(input?.projectId || "").trim(),
    question: String(input?.question || "").trim(),
    methodVersion: String(input?.methodVersion || "").trim(),
    panelId: String(input?.panelId || "").trim(),
    panelVersion: input?.panelVersion,
    panelFingerprint: String(input?.panelFingerprint || "").trim(),
    cycleCount: input?.cycleCount,
    language: String(input?.language || "").trim(),
    location: String(input?.location || "").trim(),
    surfaces: Array.isArray(suppliedSurfaces) ? [...suppliedSurfaces] : suppliedSurfaces,
    state: "draft",
    createdAt: date(input?.createdAt),
    events: [],
  };
  for (const [key, value] of Object.entries({ id: record.id, projectId: record.projectId, question: record.question, methodVersion: record.methodVersion, panelId: record.panelId, language: record.language, location: record.location })) {
    if (!value) throw new VisibilityError("INVALID_CASE", `${key} is required.`);
  }
  if (!Number.isInteger(record.panelVersion) || record.panelVersion < 1 || !validSurfaces(record.surfaces)) {
    throw new VisibilityError("INVALID_CASE_SCOPE", "Case panel version and three distinct surface IDs are required.");
  }
  validatePanelFingerprint(record.panelFingerprint, {
    panelId: record.panelId,
    panelVersion: record.panelVersion,
    methodologyVersion: record.methodVersion,
  });
  if (!Number.isInteger(record.cycleCount) || record.cycleCount < 1) {
    throw new VisibilityError("INVALID_CASE_SCOPE", "Case cycle count must be a positive integer.");
  }
  if (record.panelId === V1_PROMPT_PANEL.id && record.cycleCount < 3) {
    throw new VisibilityError("INVALID_CASE_SCOPE", "The v1 case requires at least three cycles.");
  }
  record.expectedCohortReceipt = createExpectedCohortReceipt({
    panelId: record.panelId,
    panelVersion: record.panelVersion,
    methodologyVersion: record.methodVersion,
    panelFingerprint: record.panelFingerprint,
    surfaces: record.surfaces,
    cycleCount: record.cycleCount,
  });
  return freeze(record);
}

export function validateInvestigationCase(record) {
  validateCaseHistory(record);
  return freeze(clone(record));
}

export function transitionInvestigationCase(record, transition) {
  const to = String(transition?.to || "");
  if (!INVESTIGATION_STATES.includes(to) || !ALLOWED[record.state]?.has(to)) {
    throw new VisibilityError("INVALID_CASE_TRANSITION", `Cannot transition from ${record.state} to ${to}.`);
  }
  validateCaseHistory(record);
  if (to === "hypothesis_ready" && (transition?.evidenceLinks != null || transition?.alternativesCount != null)) {
    throw new VisibilityError("RAW_REVIEW_COUNTS_NOT_ALLOWED", "Hypothesis readiness requires reviewed structured records, not caller counts.");
  }
  if (to.startsWith("closed_") && transition?.comparability != null) {
    throw new VisibilityError("RAW_COMPARABILITY_NOT_ALLOWED", "Follow-up closure requires a validated comparison receipt, not a caller boolean.");
  }

  const eventAt = date(transition?.at);
  const priorAt = record.events.length ? record.events.at(-1).at : record.createdAt;
  if (new Date(eventAt).getTime() <= new Date(priorAt).getTime()) {
    throw new VisibilityError("INVALID_CASE_TIMESTAMP_ORDER", "Case event timestamps must be strictly increasing.");
  }
  const hypothesisReviewReceipt = to === "hypothesis_ready"
    ? createHypothesisReviewReceipt(transition?.hypothesisReview)
    : null;
  const interventionReceipt = to === "intervention_in_progress"
    ? normalizeIntervention(transition?.intervention, eventAt)
    : null;
  let comparisonReceipt = null;
  if (to.startsWith("closed_") && record.state === "followup_review") {
    const comparison = transition?.comparison;
    evaluateCohortAgainstExpectation(comparison?.baselineObservations, record.expectedCohortReceipt, {
      field: "baselineObservations",
      requireComplete: true,
    });
    evaluateCohortAgainstExpectation(comparison?.followupObservations, record.expectedCohortReceipt, {
      field: "followupObservations",
      requireComplete: true,
    });
    comparisonReceipt = validateFollowupComparisonReceipt(comparison?.receipt, {
      baselineObservations: comparison?.baselineObservations,
      followupObservations: comparison?.followupObservations,
    });
    if (!comparisonReceipt.comparable) {
      throw new VisibilityError("FOLLOWUP_NOT_COMPARABLE", "A follow-up conclusion requires comparable observation cohorts.");
    }
    const intervention = record.events.find(({ to: priorTo }) => priorTo === "intervention_in_progress")?.interventionReceipt;
    if (!intervention) {
      throw new VisibilityError("INTERVENTION_REQUIRED", "A stored structured intervention is required before closure.");
    }
    const deployedMs = new Date(intervention.deployedAt).getTime();
    const baselineBefore = comparison.baselineObservations.every((observation) => (
      new Date(observation.observationCompletedAt).getTime() < deployedMs
    ));
    const followupAfter = comparison.followupObservations.every((observation) => (
      new Date(observation.observationStartedAt).getTime() > deployedMs
    ));
    if (!baselineBefore || !followupAfter) {
      throw new VisibilityError("INVALID_INTERVENTION_TIME_BOUNDARY", "Baseline must precede and follow-up must follow the intervention.");
    }
  }
  const reviewer = reviewName(transition?.reviewer);
  if (!reviewer) throw new VisibilityError("REVIEWER_REQUIRED", "Every transition requires a reviewer.");
  const event = {
    from: record.state,
    to,
    at: eventAt,
    reviewer,
    note: String(transition?.note || "").trim(),
    hypothesisReviewReceipt,
    interventionReceipt,
    comparisonReceipt,
  };
  const history = record.events.map((previousEvent) => clone(previousEvent));
  return freeze({ ...record, surfaces: [...record.surfaces], state: to, events: [...history, event] });
}
