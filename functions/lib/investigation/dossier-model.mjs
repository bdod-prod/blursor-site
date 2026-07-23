import { VisibilityError } from "../visibility/visibility-error.mjs";
import { extractAnswerEvidence } from "./answer-extractor.mjs";
import { validateInvestigationCase } from "./case-model.mjs";
import { validateCohortCadence } from "./cohort-cadence.mjs";
import { EVIDENCE_TERMS, buildEvidenceTrace } from "./evidence-trace.mjs";
import { evaluateCohortAgainstExpectation } from "./expected-cohort.mjs";
import { validateFollowupComparisonReceipt } from "./followup-comparison.mjs";
import {
  assertStoredHypothesisReviewReceipt,
  createHypothesisReviewReceipt,
} from "./hypothesis-review.mjs";
import { normalizeObservation } from "./observation-model.mjs";

const CLOSED_FOLLOWUP_OUTCOMES = Object.freeze({
  closed_supported: "supported_after_followup",
  closed_weakened: "weakened_after_followup",
  closed_unresolved: "unresolved_after_followup",
});

const FOLLOWUP_STATES = new Set([
  "intervention_in_progress",
  "followup_collecting",
  "followup_review",
  ...Object.keys(CLOSED_FOLLOWUP_OUTCOMES),
]);

const OBSERVATION_EVIDENCE_TYPES = new Set([
  "inline_citation",
  "returned_source",
  "provider_rationale",
]);

const LEVEL_FIVE_TERMS = Object.freeze({
  supported_after_followup: "supported after follow-up",
  weakened_after_followup: "weakened after follow-up",
  unresolved_after_followup: "unresolved after follow-up",
});

const CALLER_DERIVED_FIELDS = Object.freeze([
  "assessment",
  "observedPattern",
  "evidenceItems",
  "surfaceLabels",
  "baselineWindow",
  "followupWindow",
]);

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
  if (typeof value !== "string") throw invalidField(field, nullable ? "a string or null" : "a string");
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

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

const normalizeCohort = (value, field, required) => {
  const observations = arrayField(value, field).map((observation) => normalizeObservation(observation));
  if (required && observations.length === 0) throw invalidField(field, "a non-empty observation array");
  const ids = observations.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new VisibilityError("DUPLICATE_DOSSIER_OBSERVATION", `${field} contains duplicate observation IDs.`);
  }
  return observations;
};

const assertCohortScope = (observations, record, extractionConfig, field) => {
  const surfaceLabels = new Map();
  for (const observation of observations) {
    if (
      observation.investigationId !== record.id
      || observation.projectId !== record.projectId
      || observation.panelId !== record.panelId
      || observation.panelVersion !== record.panelVersion
      || observation.methodologyVersion !== record.methodVersion
      || observation.panelFingerprint !== record.panelFingerprint
      || observation.requestConfig.language !== record.language
      || observation.requestConfig.country !== record.location
      || !record.surfaces.includes(observation.surfaceId)
      || observation.extractorVersion !== extractionConfig.extractorVersion
    ) {
      throw new VisibilityError("DOSSIER_SCOPE_MISMATCH", `${field} contains an observation outside the frozen case scope.`);
    }
    const priorLabel = surfaceLabels.get(observation.surfaceId);
    if (priorLabel && priorLabel !== observation.surfaceLabel) {
      throw new VisibilityError("DOSSIER_SURFACE_MISMATCH", "A dossier surface ID has conflicting labels.");
    }
    surfaceLabels.set(observation.surfaceId, observation.surfaceLabel);
  }
  return surfaceLabels;
};

const windowLabel = (observations) => {
  if (observations.length === 0) return "No follow-up collected";
  const dates = observations.map(({ observationCompletedAt }) => observationCompletedAt.slice(0, 10)).sort();
  return dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}`;
};

const extractionRecords = (observations, config) => observations.map((observation) => ({
  observation,
  extraction: extractAnswerEvidence(observation, config),
}));

const assertObservationEvidenceProvenance = ({ trace, observations, extractions }) => {
  const observationMap = new Map(observations.map((observation) => [observation.id, observation]));
  const extractionMap = new Map(extractions.map(({ observation, extraction }) => [observation.id, extraction]));

  for (const claim of trace.claims) {
    if (claim.observationId) {
      const observation = observationMap.get(claim.observationId);
      if (!observation) {
        throw new VisibilityError("UNKNOWN_DOSSIER_OBSERVATION", "Evidence claim references an observation outside the dossier cohorts.");
      }
      const extractedClaim = extractionMap.get(observation.id)?.claims.find(({ id }) => id === claim.id);
      const claimKeys = Object.keys(claim).filter((key) => key !== "evidence").sort();
      const extractedKeys = extractedClaim ? Object.keys(extractedClaim).sort() : [];
      if (
        !extractedClaim
        || JSON.stringify(claimKeys) !== JSON.stringify(extractedKeys)
        || extractedKeys.some((key) => claim[key] !== extractedClaim[key])
      ) {
        throw new VisibilityError(
          "OBSERVATION_CLAIM_MISMATCH",
          "Observation-linked claims must exactly match deterministic extraction for the configured extractor version.",
        );
      }
    }

    for (const { item } of claim.evidence) {
      if (OBSERVATION_EVIDENCE_TYPES.has(item.type) && (
        !claim.observationId
        || claim.observationId !== item.observationId
      )) {
        throw new VisibilityError(
          "OBSERVATION_CLAIM_LINK_MISMATCH",
          "Observation evidence must be linked to a deterministic claim from the same observation.",
        );
      }
      if (!item.observationId) continue;
      const observation = observationMap.get(item.observationId);
      if (!observation) {
        throw new VisibilityError("UNKNOWN_DOSSIER_OBSERVATION", "Evidence item references an observation outside the dossier cohorts.");
      }
      if (!OBSERVATION_EVIDENCE_TYPES.has(item.type)) continue;
      if (
        item.surfaceId !== observation.surfaceId
        || item.surfaceLabel !== observation.surfaceLabel
        || item.collectedAt !== observation.observationCompletedAt
      ) {
        throw new VisibilityError(
          "OBSERVATION_EVIDENCE_MISMATCH",
          "Observation evidence surface identity and collection time must match the persisted observation.",
        );
      }
      if (item.reviewState === "reviewed" && observation.reviewStatus !== "reviewed") {
        throw new VisibilityError(
          "UNREVIEWED_OBSERVATION_EVIDENCE",
          "Reviewed evidence cannot be derived from an unreviewed or excluded observation.",
        );
      }
      const validTypePayload = item.type === "inline_citation"
        ? item.url != null && observation.citations.some(({ url }) => url === item.url)
        : item.type === "returned_source"
          ? item.url != null && observation.sources.some(({ url }) => url === item.url)
          : observation.providerRationale != null
            && item.excerpt === observation.providerRationale.text
            && item.url == null;
      if (!validTypePayload) {
        throw new VisibilityError(
          "OBSERVATION_EVIDENCE_MISMATCH",
          "Observation evidence must match the persisted citation, returned source, or provider rationale.",
        );
      }
    }
  }
};

const mentionsBrand = ({ extraction }) => extraction.mentions.some(({ entityId }) => entityId === "brand");

const isValidMentionObservation = ({ observation }) => (
  observation.state === "success"
  && observation.reviewStatus === "reviewed"
);

const deriveMetrics = (record, baseline, followup) => record.surfaces.flatMap((surfaceId) => {
  const metrics = [];
  for (const [window, records] of [["baseline", baseline], ["follow-up", followup]]) {
    if (records.length === 0) continue;
    const surfaceRecords = records.filter((record) => (
      record.observation.surfaceId === surfaceId && isValidMentionObservation(record)
    ));
    const numerator = surfaceRecords.filter(mentionsBrand).length;
    const denominator = surfaceRecords.length;
    if (numerator < 0 || denominator < 0 || numerator > denominator) {
      throw new VisibilityError("INVALID_DERIVED_METRIC", "Derived dossier metric is internally inconsistent.");
    }
    metrics.push({
      id: `${surfaceId}-${window}`,
      label: "Brand mentions",
      numerator,
      denominator,
      surfaceId,
      window,
    });
  }
  return metrics;
});

const hasRepeatedPattern = (baseline) => {
  const groups = new Map();
  for (const record of baseline.filter((candidate) => (
    isValidMentionObservation(candidate) && candidate.extraction.extractionState === "complete"
  ))) {
    const key = `${record.observation.surfaceId}|${record.observation.promptId}`;
    const values = groups.get(key) || [];
    values.push({ repeatOrdinal: record.observation.repeatOrdinal, mentioned: mentionsBrand(record) });
    groups.set(key, values);
  }
  return [...groups.values()].some((values) => (
    new Set(values.map(({ repeatOrdinal }) => repeatOrdinal)).size >= 2
    && new Set(values.map(({ mentioned }) => mentioned)).size === 1
  ));
};

const usableCycleCount = (records, receipt) => receipt.repeatOrdinals.filter((repeatOrdinal) => {
  const usable = new Set(records.filter(({ observation, extraction }) => (
    observation.repeatOrdinal === repeatOrdinal
    && isValidMentionObservation({ observation })
    && extraction.extractionState === "complete"
  )).map(({ observation }) => `${observation.surfaceId}|${observation.promptId}`));
  return receipt.surfaceIds.every((surfaceId) => receipt.promptIds.every((promptId) => (
    usable.has(`${surfaceId}|${promptId}`)
  )));
}).length;

const projectAlternative = (value, index) => {
  const alternative = objectField(value, `alternatives[${index}]`);
  return {
    id: stringField(alternative.id, `alternatives[${index}].id`),
    wording: stringField(alternative.wording, `alternatives[${index}].wording`),
    disposition: stringField(alternative.disposition, `alternatives[${index}].disposition`),
    reviewState: stringField(alternative.reviewState, `alternatives[${index}].reviewState`),
  };
};

const projectHypothesis = (value) => {
  if (value == null) return null;
  const hypothesis = objectField(value, "hypothesis");
  return {
    id: stringField(hypothesis.id, "hypothesis.id"),
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
  const deployedAt = stringField(intervention.deployedAt, "intervention.deployedAt");
  const parsed = new Date(deployedAt);
  if (Number.isNaN(parsed.getTime())) throw invalidField("intervention.deployedAt", "a valid timestamp");
  return {
    label: stringField(intervention.label, "intervention.label"),
    detail: stringField(intervention.detail, "intervention.detail", true),
    deployedAt: parsed.toISOString(),
  };
};

const projectReview = (value) => {
  const review = objectField(value, "review");
  const reviewedAt = stringField(review.reviewedAt, "review.reviewedAt");
  const parsed = new Date(reviewedAt);
  if (Number.isNaN(parsed.getTime())) throw invalidField("review.reviewedAt", "a valid timestamp");
  return {
    analyst: stringField(review.analyst, "review.analyst"),
    reviewedAt: parsed.toISOString(),
    extractorVersion: stringField(review.extractorVersion, "review.extractorVersion"),
  };
};

const flattenEvidence = (trace) => {
  const projected = [];
  const seen = new Set();
  for (const claim of trace.claims) {
    for (const { relation, item } of claim.evidence) {
      const key = `${item.id}|${relation}`;
      if (seen.has(key)) continue;
      seen.add(key);
      projected.push({
        id: item.id,
        type: item.type,
        label: item.label,
        excerpt: item.excerpt,
        provenance: item.provenance,
        relation,
        url: item.url,
        surfaceId: item.surfaceId,
        surfaceLabel: item.surfaceLabel,
        observationId: item.observationId,
        collectedAt: item.collectedAt,
        reviewState: item.reviewState,
        optional: item.type === "provider_rationale",
      });
    }
  }
  return projected;
};

const deriveAssessment = ({ baseline, evidenceItems, hypothesis, alternatives, levelFiveReady, lifecycleHypothesisReady, closedOutcome }) => {
  const repeated = hasRepeatedPattern(baseline);
  const reviewedObservable = evidenceItems.filter(({ relation, reviewState, type }) => (
    reviewState === "reviewed"
    && ["supports", "contextualizes"].includes(relation)
    && !["provider_rationale", "analyst_annotation"].includes(type)
  ));
  const independentSources = new Set(reviewedObservable.map(({ type, provenance, surfaceId }) => `${type}|${provenance}|${surfaceId}`));
  const reviewedAlternatives = alternatives.filter(({ reviewState }) => reviewState === "reviewed");
  const hypothesisApproved = hypothesis?.reviewState === "approved";
  let level = 1;
  if (repeated) level = 2;
  if (level >= 2 && reviewedObservable.length >= 1) level = 3;
  if (level >= 3 && independentSources.size >= 2 && hypothesisApproved && reviewedAlternatives.length >= 1 && lifecycleHypothesisReady) level = 4;
  if (level === 4 && levelFiveReady) level = 5;
  return {
    level,
    term: level === 5 ? LEVEL_FIVE_TERMS[closedOutcome] : EVIDENCE_TERMS[level],
    reviewedAlternatives,
  };
};

const deriveCoverage = (observations, scheduled) => {
  const coverage = {
    scheduled,
    observed: observations.length,
    valid: 0,
    refused: 0,
    missing: 0,
    failed: 0,
    unreviewed: 0,
    excluded: 0,
    omitted: scheduled - observations.length,
  };
  for (const observation of observations) {
    if (observation.reviewStatus === "excluded") coverage.excluded += 1;
    else if (observation.reviewStatus === "unreviewed") coverage.unreviewed += 1;
    else if (observation.state === "success") coverage.valid += 1;
    else if (observation.state === "refused") coverage.refused += 1;
    else if (observation.state === "missing_answer") coverage.missing += 1;
    else if (observation.state === "failed") coverage.failed += 1;
  }
  const classified = coverage.valid + coverage.refused + coverage.missing + coverage.failed
    + coverage.unreviewed + coverage.excluded;
  if (coverage.omitted < 0 || classified !== coverage.observed || coverage.observed + coverage.omitted !== coverage.scheduled) {
    throw new VisibilityError("INVALID_DERIVED_COVERAGE", "Derived dossier coverage is internally inconsistent.");
  }
  return coverage;
};

const lifecycleHypothesisMatches = (record, review) => {
  const stored = record.events.find(({ to }) => to === "hypothesis_ready")?.hypothesisReviewReceipt;
  if (!stored) return false;
  let supplied;
  let derived;
  try {
    supplied = assertStoredHypothesisReviewReceipt(stored);
    derived = createHypothesisReviewReceipt(review);
  } catch {
    throw new VisibilityError(
      "CASE_HYPOTHESIS_REVIEW_MISMATCH",
      "Dossier hypothesis content does not match the lifecycle review receipt.",
    );
  }
  if (supplied.reviewFingerprint !== derived.reviewFingerprint) {
    throw new VisibilityError(
      "CASE_HYPOTHESIS_REVIEW_MISMATCH",
      "Dossier hypothesis content does not match the lifecycle review receipt.",
    );
  }
  return true;
};

const assertNoCallerDerivedFields = (input) => {
  for (const field of CALLER_DERIVED_FIELDS) {
    if (Object.hasOwn(input || {}, field)) {
      throw new VisibilityError("CALLER_DERIVED_FIELD_NOT_ALLOWED", `${field} is derived by the dossier boundary.`);
    }
  }
  if (input?.followup && (Object.hasOwn(input.followup, "comparable") || Object.hasOwn(input.followup, "outcome"))) {
    throw new VisibilityError("RAW_COMPARABILITY_NOT_ALLOWED", "Follow-up comparability and outcome are derived, not caller fields.");
  }
};

export function buildInvestigationDossier(input) {
  assertNoCallerDerivedFields(input);
  const record = validateInvestigationCase(objectField(input?.caseRecord, "caseRecord"));
  const surfaces = stringList(record.surfaces, "caseRecord.surfaces");
  const scopedRecord = {
    id: stringField(record.id, "caseRecord.id"),
    projectId: stringField(record.projectId, "caseRecord.projectId"),
    question: stringField(record.question, "caseRecord.question"),
    state: stringField(record.state, "caseRecord.state"),
    language: stringField(record.language, "caseRecord.language"),
    location: stringField(record.location, "caseRecord.location"),
    panelId: stringField(record.panelId, "caseRecord.panelId"),
    panelVersion: integerField(record.panelVersion, "caseRecord.panelVersion"),
    panelFingerprint: stringField(record.panelFingerprint, "caseRecord.panelFingerprint"),
    methodVersion: stringField(record.methodVersion, "caseRecord.methodVersion"),
    cadenceDays: integerField(record.cadenceDays, "caseRecord.cadenceDays"),
    surfaces,
  };
  const extractionConfig = objectField(input?.extractionConfig, "extractionConfig");
  stringField(extractionConfig.extractorVersion, "extractionConfig.extractorVersion");
  const baselineObservations = normalizeCohort(input?.baselineObservations, "baselineObservations", true);
  const followupObservations = normalizeCohort(input?.followupObservations, "followupObservations", false);
  const allObservationIds = [...baselineObservations, ...followupObservations].map(({ id }) => id);
  if (new Set(allObservationIds).size !== allObservationIds.length) {
    throw new VisibilityError(
      "DUPLICATE_DOSSIER_OBSERVATION",
      "Baseline and follow-up observation IDs must be unique across the complete dossier.",
    );
  }
  validateCohortCadence(baselineObservations, {
    cadenceDays: scopedRecord.cadenceDays,
    repeatOrdinals: record.expectedCohortReceipt.repeatOrdinals,
    field: "baselineObservations",
  });
  validateCohortCadence(followupObservations, {
    cadenceDays: scopedRecord.cadenceDays,
    repeatOrdinals: record.expectedCohortReceipt.repeatOrdinals,
    field: "followupObservations",
  });
  const baselineExpected = evaluateCohortAgainstExpectation(baselineObservations, record.expectedCohortReceipt, {
    field: "baselineObservations",
  });
  const expectsFollowup = FOLLOWUP_STATES.has(record.state) || followupObservations.length > 0;
  const followupExpected = expectsFollowup
    ? evaluateCohortAgainstExpectation(followupObservations, record.expectedCohortReceipt, { field: "followupObservations" })
    : null;
  const baselineLabels = assertCohortScope(baselineObservations, scopedRecord, extractionConfig, "baselineObservations");
  const followupLabels = assertCohortScope(followupObservations, scopedRecord, extractionConfig, "followupObservations");
  for (const [surfaceId, label] of followupLabels) {
    if (baselineLabels.has(surfaceId) && baselineLabels.get(surfaceId) !== label) {
      throw new VisibilityError("DOSSIER_SURFACE_MISMATCH", "Baseline and follow-up surface labels differ.");
    }
  }
  const trace = buildEvidenceTrace(objectField(input?.evidence, "evidence"));
  const baselineExtractions = extractionRecords(baselineObservations, extractionConfig);
  const followupExtractions = extractionRecords(followupObservations, extractionConfig);
  assertObservationEvidenceProvenance({
    trace,
    observations: [...baselineObservations, ...followupObservations],
    extractions: [...baselineExtractions, ...followupExtractions],
  });
  const metrics = deriveMetrics(scopedRecord, baselineExtractions, followupExtractions);
  const allObservations = [...baselineObservations, ...followupObservations];
  const scheduled = baselineExpected.expected + (followupExpected?.expected || 0);
  const coverage = deriveCoverage(allObservations, scheduled);
  const evidenceItems = flattenEvidence(trace);
  const hypothesis = projectHypothesis(input?.hypothesis);
  const alternatives = arrayField(input?.alternatives, "alternatives").map(projectAlternative);
  const lifecycleHypothesisReady = lifecycleHypothesisMatches(record, {
    hypothesis,
    alternatives,
    evidence: input?.evidence,
  });
  let comparisonReceipt = null;
  if (input?.comparisonReceipt != null) {
    comparisonReceipt = validateFollowupComparisonReceipt(input.comparisonReceipt, {
      baselineObservations,
      followupObservations,
    });
  }
  const closedOutcome = CLOSED_FOLLOWUP_OUTCOMES[scopedRecord.state] || null;
  if (closedOutcome) {
    const storedReceipt = record.events?.at(-1)?.comparisonReceipt;
    if (
      !storedReceipt
      || !comparisonReceipt
      || storedReceipt.baselineFingerprint !== comparisonReceipt.baselineFingerprint
      || storedReceipt.followupFingerprint !== comparisonReceipt.followupFingerprint
      || !comparisonReceipt.comparable
    ) {
      throw new VisibilityError("CASE_COMPARISON_RECEIPT_MISMATCH", "Closed dossier state requires the case's validated comparison receipt.");
    }
  }
  const intervention = projectIntervention(input?.intervention);
  const storedIntervention = record.events.find(({ to }) => to === "intervention_in_progress")?.interventionReceipt || null;
  if (closedOutcome && (
    !intervention
    || !storedIntervention
    || intervention.label !== storedIntervention.label
    || intervention.detail !== storedIntervention.detail
    || intervention.deployedAt !== storedIntervention.deployedAt
  )) {
    throw new VisibilityError("CASE_INTERVENTION_MISMATCH", "Closed dossier state requires the case's validated intervention receipt.");
  }
  if (closedOutcome) {
    const deployedMs = new Date(storedIntervention.deployedAt).getTime();
    const baselineBefore = baselineObservations.every(({ observationCompletedAt }) => (
      new Date(observationCompletedAt).getTime() < deployedMs
    ));
    const followupAfter = followupObservations.every(({ observationStartedAt }) => (
      new Date(observationStartedAt).getTime() > deployedMs
    ));
    if (!baselineBefore || !followupAfter) {
      throw new VisibilityError(
        "INVALID_INTERVENTION_TIME_BOUNDARY",
        "Baseline must precede and follow-up must follow the intervention.",
      );
    }
    const closureMs = new Date(record.events.at(-1).at).getTime();
    if ([...baselineObservations, ...followupObservations].some(({ observationCompletedAt }) => (
      new Date(observationCompletedAt).getTime() > closureMs
    ))) {
      throw new VisibilityError(
        "INVALID_CLOSURE_TIME_BOUNDARY",
        "Closure observations cannot finish after the closure event.",
      );
    }
  }
  const baselineUsableCycles = usableCycleCount(baselineExtractions, record.expectedCohortReceipt);
  const followupUsableCycles = usableCycleCount(followupExtractions, record.expectedCohortReceipt);
  const levelFiveReady = Boolean(
    closedOutcome
    && comparisonReceipt?.comparable
    && baselineExpected.complete
    && followupExpected?.complete
    && baselineUsableCycles >= 3
    && followupUsableCycles >= 3
    && storedIntervention,
  );
  const assessment = deriveAssessment({
    baseline: baselineExtractions,
    evidenceItems,
    hypothesis,
    alternatives,
    levelFiveReady,
    lifecycleHypothesisReady,
    closedOutcome,
  });
  const approved = assessment.level >= 4;
  const evidenceState = approved
    ? (assessment.level === 5 ? closedOutcome : "hypothesis_ready")
    : "unresolved";
  const rationale = approved ? {
    wording: hypothesis.wording,
    confidence: hypothesis.confidence,
    basis: [...hypothesis.basis],
    contradictions: [...hypothesis.contradictions],
    inferenceSteps: [...hypothesis.inferenceSteps],
    falsifier: hypothesis.falsifier,
    reviewState: "approved",
    alternatives: assessment.reviewedAlternatives.map(({ wording, disposition, reviewState }) => ({ wording, disposition, reviewState })),
  } : null;
  const projectedFollowup = input?.followup == null ? null : {
    comparable: comparisonReceipt?.comparable === true,
    outcome: assessment.level === 5 && comparisonReceipt?.comparable === true ? closedOutcome : null,
    summary: stringField(objectField(input.followup, "followup").summary, "followup.summary", true),
  };
  const review = projectReview(input?.review);
  if (review.extractorVersion !== extractionConfig.extractorVersion) {
    throw new VisibilityError("DOSSIER_EXTRACTOR_MISMATCH", "Dossier review and observation extractor versions must match.");
  }
  const reviewedMs = new Date(review.reviewedAt).getTime();
  if (
    [...baselineObservations, ...followupObservations].some(({ observationCompletedAt }) => (
      new Date(observationCompletedAt).getTime() > reviewedMs
    ))
    || record.events.some(({ at }) => new Date(at).getTime() > reviewedMs)
  ) {
    throw new VisibilityError(
      "INVALID_DOSSIER_REVIEW_TIME_BOUNDARY",
      "Dossier observations and lifecycle events cannot occur after dossier review.",
    );
  }

  return deepFreeze({
    schemaVersion: 1,
    header: {
      investigationId: scopedRecord.id,
      project: stringField(input?.projectLabel, "projectLabel"),
      question: scopedRecord.question,
      state: scopedRecord.state,
      language: scopedRecord.language,
      location: scopedRecord.location,
      panelId: scopedRecord.panelId,
      panelVersion: scopedRecord.panelVersion,
      methodVersion: scopedRecord.methodVersion,
      surfaces: scopedRecord.surfaces.map((surfaceId) => (
        baselineLabels.get(surfaceId) || followupLabels.get(surfaceId) || surfaceId
      )),
      baselineWindow: windowLabel(baselineObservations),
      followupWindow: windowLabel(followupObservations),
      exampleOnly: booleanField(input?.exampleOnly, "exampleOnly"),
    },
    evidenceState,
    evidenceLevel: assessment.level,
    evidenceTerm: assessment.term,
    sections: [
      {
        id: "finding",
        title: "Finding",
        summary: stringField(input?.observedSummary, "observedSummary"),
        metrics,
        coverage,
      },
      {
        id: "evidence",
        title: "Evidence",
        items: evidenceItems,
        status: rationale ? "reviewed" : "unresolved",
        hypothesis: rationale,
      },
      {
        id: "alternative-explanations",
        title: "Alternative explanations",
        alternatives: assessment.reviewedAlternatives.map(({ wording, disposition, reviewState }) => ({ wording, disposition, reviewState })),
        nextTest: stringField(input?.nextTest, "nextTest"),
      },
      {
        id: "follow-up-verdict",
        title: "Follow-up verdict",
        intervention,
        followup: projectedFollowup,
      },
    ],
    review,
    limitations: stringList(input?.limitations, "limitations"),
  });
}
