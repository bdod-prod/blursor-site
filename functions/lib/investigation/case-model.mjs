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

export function createInvestigationCase(input) {
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
    surfaces: [...(input?.surfaces || [])],
    state: "draft",
    createdAt: date(input?.createdAt),
    events: [],
  };
  for (const [key, value] of Object.entries({ id: record.id, projectId: record.projectId, question: record.question, methodVersion: record.methodVersion, panelId: record.panelId, language: record.language, location: record.location })) {
    if (!value) throw new VisibilityError("INVALID_CASE", `${key} is required.`);
  }
  if (!Number.isInteger(record.panelVersion) || record.panelVersion < 1 || record.surfaces.length !== 3) throw new VisibilityError("INVALID_CASE_SCOPE", "Case panel version and three surfaces are required.");
  return freeze(record);
}

export function transitionInvestigationCase(record, transition) {
  const to = String(transition?.to || "");
  if (!INVESTIGATION_STATES.includes(to) || !ALLOWED[record.state]?.has(to)) throw new VisibilityError("INVALID_CASE_TRANSITION", `Cannot transition from ${record.state} to ${to}.`);
  if (to === "hypothesis_ready" && (!(transition.evidenceLinks >= 1) || !(transition.alternativesCount >= 1))) throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "A reviewed hypothesis requires linked evidence and at least one alternative.");
  if (to.startsWith("closed_") && record.state === "followup_review" && transition.comparability !== true) throw new VisibilityError("FOLLOWUP_NOT_COMPARABLE", "A follow-up conclusion requires a comparable window.");
  const event = Object.freeze({ from: record.state, to, at: date(transition.at), reviewer: String(transition.reviewer || "").trim(), note: String(transition.note || "").trim(), evidenceLinks: transition.evidenceLinks ?? null, alternativesCount: transition.alternativesCount ?? null, comparability: transition.comparability ?? null });
  if (!event.reviewer) throw new VisibilityError("REVIEWER_REQUIRED", "Every transition requires a reviewer.");
  return freeze({ ...record, state: to, events: [...record.events, event] });
}
