import { VisibilityError } from "../visibility/visibility-error.mjs";

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

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

const reviewName = (value) => String(value || "").trim();

const isPositiveInteger = (value) => Number.isFinite(value) && Number.isInteger(value) && value >= 1;

const validSurfaces = (surfaces) => Array.isArray(surfaces)
  && surfaces.length === 3
  && surfaces.every((surface) => typeof surface === "string" && SURFACE_ID.test(surface))
  && new Set(surfaces).size === surfaces.length;

const historyError = (message) => new VisibilityError("INVALID_CASE_HISTORY", message);

const validateHypothesisGate = (evidenceLinks, alternativesCount, error) => {
  if (!isPositiveInteger(evidenceLinks) || !isPositiveInteger(alternativesCount)) {
    throw error("A reviewed hypothesis requires linked evidence and at least one alternative.");
  }
};

const validateFollowupGate = (from, to, comparability, error) => {
  if (to.startsWith("closed_") && from === "followup_review" && comparability !== true) {
    throw error("A follow-up conclusion requires a comparable window.");
  }
};

const validateGates = (from, to, values, error) => {
  if (to === "hypothesis_ready") validateHypothesisGate(values.evidenceLinks, values.alternativesCount, error);
  validateFollowupGate(from, to, values.comparability, error);
};

const validateCaseHistory = (record) => {
  if (!record || typeof record !== "object" || !Array.isArray(record.events)) {
    throw historyError("Case history must contain an event array.");
  }

  let replayState = "draft";
  for (const event of record.events) {
    if (!event || typeof event !== "object" || event.from !== replayState) {
      throw historyError("Case history event source does not match the replay state.");
    }
    if (!INVESTIGATION_STATES.includes(event.to) || !ALLOWED[replayState]?.has(event.to)) {
      throw historyError("Case history contains an invalid lifecycle transition.");
    }
    if (!reviewName(event.reviewer)) {
      throw historyError("Every case history event requires a reviewer.");
    }
    try {
      date(event.at);
    } catch {
      throw historyError("Case history event timestamp is invalid.");
    }
    validateGates(replayState, event.to, event, historyError);
    replayState = event.to;
  }

  if (record.state !== replayState) {
    throw historyError("Case state does not match the replayed event history.");
  }
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
  if (!Number.isInteger(record.panelVersion) || record.panelVersion < 1 || !validSurfaces(record.surfaces)) throw new VisibilityError("INVALID_CASE_SCOPE", "Case panel version and three distinct surface IDs are required.");
  return freeze(record);
}

export function transitionInvestigationCase(record, transition) {
  const to = String(transition?.to || "");
  if (!INVESTIGATION_STATES.includes(to) || !ALLOWED[record.state]?.has(to)) throw new VisibilityError("INVALID_CASE_TRANSITION", `Cannot transition from ${record.state} to ${to}.`);
  validateGates(record.state, to, transition || {}, (message) => new VisibilityError(to === "hypothesis_ready" ? "HYPOTHESIS_REVIEW_INCOMPLETE" : "FOLLOWUP_NOT_COMPARABLE", message));
  validateCaseHistory(record);
  const event = Object.freeze({ from: record.state, to, at: date(transition.at), reviewer: reviewName(transition.reviewer), note: String(transition.note || "").trim(), evidenceLinks: transition.evidenceLinks ?? null, alternativesCount: transition.alternativesCount ?? null, comparability: transition.comparability ?? null });
  if (!event.reviewer) throw new VisibilityError("REVIEWER_REQUIRED", "Every transition requires a reviewer.");
  const history = record.events.map((previousEvent) => ({ ...previousEvent }));
  return freeze({ ...record, state: to, events: [...history, event] });
}
