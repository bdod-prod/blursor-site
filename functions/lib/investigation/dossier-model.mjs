import { EVIDENCE_TERMS } from "./evidence-trace.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";

const CLOSED_FOLLOWUP_OUTCOMES = Object.freeze({
  closed_supported: "supported_after_followup",
  closed_weakened: "weakened_after_followup",
  closed_unresolved: "unresolved_after_followup",
});

const invalidField = (field, expected) => new VisibilityError(
  "INVALID_DOSSIER_FIELD",
  `${field} must be ${expected}.`,
);

const objectField = (value, field, nullable = false) => {
  if (value == null && nullable) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidField(field, nullable ? "an object or null" : "an object");
  }
  return value;
};

const stringField = (value, field, nullable = false) => {
  if (value == null && nullable) return null;
  if (typeof value !== "string") {
    throw invalidField(field, nullable ? "a string or null" : "a string");
  }
  return value;
};

const integerField = (value, field) => {
  if (!Number.isInteger(value)) throw invalidField(field, "an integer");
  return value;
};

const booleanField = (value, field) => {
  if (typeof value !== "boolean") throw invalidField(field, "a boolean");
  return value;
};

const arrayField = (value, field) => {
  if (!Array.isArray(value)) throw invalidField(field, "an array");
  return value;
};

const stringList = (value, field) => arrayField(value, field).map((item, index) => (
  stringField(item, `${field}[${index}]`)
));

const projectHeader = (input) => {
  const record = objectField(input?.caseRecord, "caseRecord");
  return {
    investigationId: stringField(record.id, "caseRecord.id"),
    project: stringField(input?.projectLabel, "projectLabel"),
    question: stringField(record.question, "caseRecord.question"),
    state: stringField(record.state, "caseRecord.state"),
    language: stringField(record.language, "caseRecord.language"),
    location: stringField(record.location, "caseRecord.location"),
    panelId: stringField(record.panelId, "caseRecord.panelId"),
    panelVersion: integerField(record.panelVersion, "caseRecord.panelVersion"),
    methodVersion: stringField(record.methodVersion, "caseRecord.methodVersion"),
    surfaces: stringList(input?.surfaceLabels, "surfaceLabels"),
    baselineWindow: stringField(input?.baselineWindow, "baselineWindow"),
    followupWindow: stringField(input?.followupWindow, "followupWindow"),
    exampleOnly: booleanField(input?.exampleOnly, "exampleOnly"),
  };
};

const projectAssessment = (value) => {
  const assessment = objectField(value, "assessment");
  const level = integerField(assessment.level, "assessment.level");
  const canonicalTerm = EVIDENCE_TERMS[level];
  if (!canonicalTerm) throw invalidField("assessment.level", "an integer from 1 through 5");
  const term = stringField(assessment.term, "assessment.term");
  if (term !== canonicalTerm) {
    throw invalidField("assessment.term", `the canonical level ${level} term ${JSON.stringify(canonicalTerm)}`);
  }
  return { level, term: canonicalTerm };
};

const projectMetric = (value, index) => {
  const metric = objectField(value, `observedPattern.metrics[${index}]`);
  const prefix = `observedPattern.metrics[${index}]`;
  return {
    id: stringField(metric.id, `${prefix}.id`),
    label: stringField(metric.label, `${prefix}.label`),
    numerator: integerField(metric.numerator, `${prefix}.numerator`),
    denominator: integerField(metric.denominator, `${prefix}.denominator`),
    surfaceId: stringField(metric.surfaceId, `${prefix}.surfaceId`),
    window: stringField(metric.window, `${prefix}.window`),
  };
};

const projectObservedPattern = (value) => {
  const observed = objectField(value, "observedPattern");
  const coverage = objectField(observed.coverage, "observedPattern.coverage");
  return {
    summary: stringField(observed.summary, "observedPattern.summary"),
    metrics: arrayField(observed.metrics, "observedPattern.metrics").map(projectMetric),
    coverage: {
      valid: integerField(coverage.valid, "observedPattern.coverage.valid"),
      scheduled: integerField(coverage.scheduled, "observedPattern.coverage.scheduled"),
      failed: integerField(coverage.failed, "observedPattern.coverage.failed"),
    },
  };
};

const projectEvidenceItem = (value, index) => {
  const item = objectField(value, `evidenceItems[${index}]`);
  const prefix = `evidenceItems[${index}]`;
  const type = stringField(item.type, `${prefix}.type`);
  return {
    id: stringField(item.id, `${prefix}.id`),
    type,
    label: stringField(item.label, `${prefix}.label`),
    excerpt: stringField(item.excerpt, `${prefix}.excerpt`, true),
    provenance: stringField(item.provenance, `${prefix}.provenance`),
    relation: stringField(item.relation, `${prefix}.relation`),
    url: stringField(item.url, `${prefix}.url`, true),
    optional: type === "provider_rationale",
  };
};

const projectEvidenceItems = (value) => arrayField(value, "evidenceItems").map(projectEvidenceItem);

const projectAlternative = (value, index) => {
  const item = objectField(value, `alternatives[${index}]`);
  return {
    wording: stringField(item.wording, `alternatives[${index}].wording`),
    disposition: stringField(item.disposition, `alternatives[${index}].disposition`),
  };
};

const projectAlternatives = (value) => arrayField(value, "alternatives").map(projectAlternative);

const projectHypothesis = (value) => {
  if (value == null) return null;
  const hypothesis = objectField(value, "hypothesis");
  return {
    wording: stringField(hypothesis.wording, "hypothesis.wording"),
    confidence: stringField(hypothesis.confidence, "hypothesis.confidence"),
    basis: stringList(hypothesis.basis, "hypothesis.basis"),
    contradictions: stringList(hypothesis.contradictions, "hypothesis.contradictions"),
    inferenceSteps: stringList(hypothesis.inferenceSteps, "hypothesis.inferenceSteps"),
    falsifier: stringField(hypothesis.falsifier, "hypothesis.falsifier"),
    reviewState: stringField(hypothesis.reviewState, "hypothesis.reviewState"),
  };
};

const projectIntervention = (value) => {
  if (value == null) return null;
  const intervention = objectField(value, "intervention");
  return {
    label: stringField(intervention.label, "intervention.label"),
    detail: stringField(intervention.detail, "intervention.detail", true),
    deployedAt: stringField(intervention.deployedAt, "intervention.deployedAt", true),
  };
};

const projectFollowup = (value) => {
  if (value == null) return null;
  const followup = objectField(value, "followup");
  return {
    comparable: booleanField(followup.comparable, "followup.comparable"),
    outcome: stringField(followup.outcome, "followup.outcome", true),
    summary: stringField(followup.summary, "followup.summary", true),
  };
};

const projectReview = (value) => {
  const review = objectField(value, "review");
  return {
    analyst: stringField(review.analyst, "review.analyst"),
    reviewedAt: stringField(review.reviewedAt, "review.reviewedAt"),
    extractorVersion: stringField(review.extractorVersion, "review.extractorVersion"),
  };
};

const validateFollowupConsistency = ({ assessment, followup, state }) => {
  const levelFive = assessment.level === 5;
  const comparable = followup?.comparable === true;
  if (levelFive && !comparable) {
    throw new VisibilityError(
      "LEVEL_FIVE_FOLLOWUP_REQUIRED",
      "Evidence level 5 requires a comparable follow-up.",
    );
  }
  if (!comparable) return null;

  const expectedOutcome = CLOSED_FOLLOWUP_OUTCOMES[state];
  if (!expectedOutcome) {
    throw new VisibilityError(
      "CLOSED_FOLLOWUP_REQUIRED",
      "Comparable follow-up requires a closed follow-up state.",
    );
  }
  if (followup.outcome !== expectedOutcome) {
    throw new VisibilityError(
      "FOLLOWUP_OUTCOME_MISMATCH",
      `Follow-up outcome does not match ${state}.`,
    );
  }
  return expectedOutcome;
};

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

export function buildInvestigationDossier(input) {
  const header = projectHeader(input);
  const assessment = projectAssessment(input?.assessment);
  const observedPattern = projectObservedPattern(input?.observedPattern);
  const evidenceItems = projectEvidenceItems(input?.evidenceItems);
  const hypothesis = projectHypothesis(input?.hypothesis);
  const alternatives = projectAlternatives(input?.alternatives);
  const nextTest = stringField(input?.nextTest, "nextTest");
  const intervention = projectIntervention(input?.intervention);
  const followup = projectFollowup(input?.followup);
  const review = projectReview(input?.review);
  const limitations = stringList(input?.limitations, "limitations");
  const comparableOutcome = validateFollowupConsistency({ assessment, followup, state: header.state });
  const hasIndependentEvidence = evidenceItems.some(({ type }) => type !== "provider_rationale" && type !== "analyst_annotation");
  const approved = hypothesis?.reviewState === "approved"
    && alternatives.length > 0
    && hasIndependentEvidence;
  const evidenceState = approved
    ? (followup?.comparable === true ? comparableOutcome : "hypothesis_ready")
    : "unresolved";
  const rationale = approved ? {
    ...hypothesis,
    reviewState: "approved",
    alternatives: alternatives.map((item) => ({ ...item })),
  } : null;

  return deepFreeze({
    schemaVersion: 1,
    header,
    evidenceState,
    evidenceLevel: assessment.level,
    evidenceTerm: assessment.term,
    sections: [
      {
        id: "observed-pattern",
        title: "Observed pattern",
        ...observedPattern,
      },
      {
        id: "evidence-chain",
        title: "Evidence chain",
        items: evidenceItems,
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
        alternatives,
        nextTest,
        intervention,
        followup: followup?.comparable === true ? { ...followup, outcome: comparableOutcome } : followup,
      },
    ],
    review,
    limitations,
  });
}
