import { VisibilityError } from "../visibility/visibility-error.mjs";

const CLOSED_FOLLOWUP_OUTCOMES = Object.freeze({
  closed_supported: "supported_after_followup",
  closed_weakened: "weakened_after_followup",
  closed_unresolved: "unresolved_after_followup",
});

const clone = (value, seen = new WeakMap()) => {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const [key, child] of Object.entries(value)) copy[key] = clone(child, seen);
  return copy;
};

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

const safeText = (value) => typeof value === "string" ? value : null;

const projectMetric = (metric) => ({
  id: safeText(metric?.id),
  label: safeText(metric?.label),
  numerator: Number.isInteger(metric?.numerator) ? metric.numerator : null,
  denominator: Number.isInteger(metric?.denominator) ? metric.denominator : null,
  surfaceId: safeText(metric?.surfaceId),
  window: safeText(metric?.window),
});

const projectIntervention = (intervention) => intervention ? {
  label: safeText(intervention.label),
  detail: safeText(intervention.detail),
  deployedAt: safeText(intervention.deployedAt),
} : null;

const projectFollowup = (followup, comparableOutcome) => followup ? {
  comparable: followup.comparable === true,
  outcome: comparableOutcome || safeText(followup.outcome),
  summary: safeText(followup.summary),
} : null;

const validateFollowupConsistency = (input) => {
  const levelFive = input?.assessment?.level === 5;
  const comparable = input?.followup?.comparable === true;
  if (levelFive && !comparable) {
    throw new VisibilityError(
      "LEVEL_FIVE_FOLLOWUP_REQUIRED",
      "Evidence level 5 requires a comparable follow-up.",
    );
  }
  if (!comparable) return null;

  const state = input?.caseRecord?.state;
  const expectedOutcome = CLOSED_FOLLOWUP_OUTCOMES[state];
  if (!expectedOutcome) {
    throw new VisibilityError(
      "CLOSED_FOLLOWUP_REQUIRED",
      "Comparable follow-up requires a closed follow-up state.",
    );
  }
  if (input.followup.outcome !== expectedOutcome) {
    throw new VisibilityError(
      "FOLLOWUP_OUTCOME_MISMATCH",
      `Follow-up outcome does not match ${state}.`,
    );
  }
  return expectedOutcome;
};

export function buildInvestigationDossier(input) {
  const evidenceItems = input?.evidenceItems || [];
  const alternatives = input?.alternatives || [];
  const comparableOutcome = validateFollowupConsistency(input);
  const hasIndependentEvidence = evidenceItems.some(({ type }) => type !== "provider_rationale" && type !== "analyst_annotation");
  const approved = input?.hypothesis?.reviewState === "approved"
    && alternatives.length > 0
    && hasIndependentEvidence;
  const comparable = input?.followup?.comparable === true;
  const evidenceState = approved
    ? (comparable ? comparableOutcome : "hypothesis_ready")
    : "unresolved";
  const rationale = approved ? {
    wording: clone(input.hypothesis.wording),
    confidence: clone(input.hypothesis.confidence),
    basis: clone(input.hypothesis.basis),
    contradictions: clone(input.hypothesis.contradictions),
    inferenceSteps: clone(input.hypothesis.inferenceSteps),
    falsifier: clone(input.hypothesis.falsifier),
    reviewState: "approved",
    alternatives: alternatives.map((item) => ({
      wording: clone(item.wording),
      disposition: clone(item.disposition),
    })),
  } : null;

  return deepFreeze({
    schemaVersion: 1,
    header: {
      investigationId: clone(input.caseRecord.id),
      project: clone(input.projectLabel),
      question: clone(input.caseRecord.question),
      state: clone(input.caseRecord.state),
      language: clone(input.caseRecord.language),
      location: clone(input.caseRecord.location),
      panelId: clone(input.caseRecord.panelId),
      panelVersion: clone(input.caseRecord.panelVersion),
      methodVersion: clone(input.caseRecord.methodVersion),
      surfaces: clone(input.surfaceLabels),
      baselineWindow: clone(input.baselineWindow),
      followupWindow: clone(input.followupWindow),
      exampleOnly: input.exampleOnly === true,
    },
    evidenceState: clone(evidenceState),
    evidenceLevel: clone(input.assessment.level),
    evidenceTerm: clone(input.assessment.term),
    sections: [
      {
        id: "observed-pattern",
        title: "Observed pattern",
        summary: clone(input.observedPattern.summary),
        metrics: input.observedPattern.metrics.map(projectMetric),
        coverage: clone(input.observedPattern.coverage),
      },
      {
        id: "evidence-chain",
        title: "Evidence chain",
        items: evidenceItems.map((item) => ({
          id: clone(item.id),
          type: clone(item.type),
          label: clone(item.label),
          excerpt: clone(item.excerpt),
          provenance: clone(item.provenance),
          relation: clone(item.relation),
          url: clone(item.url),
          optional: item.type === "provider_rationale",
        })),
      },
      {
        id: "diagnostic-rationale",
        title: "BLURSOR diagnostic rationale",
        status: rationale ? "reviewed" : "unresolved",
        hypothesis: rationale,
      },
      {
        id: "alternatives-next-test",
        title: "Alternatives and next test",
        alternatives: alternatives.map((item) => ({
          wording: clone(item.wording),
          disposition: clone(item.disposition),
        })),
        nextTest: clone(input.nextTest),
        intervention: projectIntervention(input.intervention),
        followup: projectFollowup(input.followup, comparableOutcome),
      },
    ],
    review: {
      analyst: clone(input.review.analyst),
      reviewedAt: clone(input.review.reviewedAt),
      extractorVersion: clone(input.review.extractorVersion),
    },
    limitations: clone(input.limitations),
  });
}
