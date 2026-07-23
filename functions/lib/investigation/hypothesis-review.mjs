import { VisibilityError } from "../visibility/visibility-error.mjs";
import { buildEvidenceTrace } from "./evidence-trace.mjs";

const required = (value, message) => {
  const text = String(value ?? "").trim();
  if (!text) throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", message);
  return text;
};

const textList = (value, message) => {
  if (!Array.isArray(value)) throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", message);
  return value.map((item) => {
    if (typeof item !== "string") throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", message);
    return item;
  });
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const freeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
};

const normalizeHypothesis = (value) => {
  if (!value || typeof value !== "object" || value.reviewState !== "approved") {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "The hypothesis must be an approved structured record.");
  }
  return {
    id: required(value.id, "The approved hypothesis requires an ID."),
    wording: required(value.wording, "The approved hypothesis requires wording."),
    confidence: required(value.confidence, "The approved hypothesis requires bounded confidence."),
    basis: textList(value.basis, "The approved hypothesis requires a basis list."),
    contradictions: textList(value.contradictions, "The approved hypothesis requires a contradictions list."),
    inferenceSteps: textList(value.inferenceSteps, "The approved hypothesis requires inference steps."),
    falsifier: required(value.falsifier, "The approved hypothesis requires a falsifier."),
    reviewState: "approved",
  };
};

const normalizeAlternatives = (values) => {
  if (!Array.isArray(values)) {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "Reviewed alternatives must be an array.");
  }
  const reviewed = values.filter((alternative) => alternative?.reviewState === "reviewed").map((alternative) => ({
    id: required(alternative.id, "A reviewed alternative requires an ID."),
    wording: required(alternative.wording, "A reviewed alternative requires wording."),
    disposition: required(alternative.disposition, "A reviewed alternative requires a disposition."),
    reviewState: "reviewed",
  }));
  if (reviewed.length === 0) {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "At least one reviewed alternative record is required.");
  }
  if (new Set(reviewed.map(({ id }) => id)).size !== reviewed.length) {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "Reviewed alternative IDs must be unique.");
  }
  reviewed.sort((left, right) => left.id.localeCompare(right.id));
  return reviewed;
};

const reviewSnapshot = (review) => {
  if (!review || typeof review !== "object") {
    throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "A reviewed hypothesis record is required.");
  }
  const hypothesis = normalizeHypothesis(review.hypothesis);
  const alternatives = normalizeAlternatives(review.alternatives);
  const trace = buildEvidenceTrace(review.evidence || {});
  const claims = [];
  const items = new Map();
  const relations = [];
  const reviewedIndependentIds = new Set();

  for (const claim of trace.claims) {
    const reviewedEvidence = claim.evidence.filter(({ item }) => item.reviewState === "reviewed");
    if (reviewedEvidence.length === 0) continue;
    const { evidence: _evidence, ...claimContent } = claim;
    claims.push(canonicalize(claimContent));
    for (const { relation, item } of reviewedEvidence) {
      items.set(item.id, canonicalize(item));
      relations.push({ claimId: claim.id, evidenceItemId: item.id, relation });
      if (
        ["supports", "contextualizes"].includes(relation)
        && !["provider_rationale", "analyst_annotation"].includes(item.type)
      ) {
        reviewedIndependentIds.add(item.id);
      }
    }
  }
  if (reviewedIndependentIds.size === 0) {
    throw new VisibilityError(
      "HYPOTHESIS_REVIEW_INCOMPLETE",
      "Reviewed independent evidence must support or contextualize the hypothesis.",
    );
  }

  claims.sort((left, right) => String(left.id).localeCompare(String(right.id)));
  relations.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const evidenceItems = [...items.values()].sort((left, right) => left.id.localeCompare(right.id));
  return canonicalize({
    schema: "hypothesis-review-content-v1",
    hypothesis,
    alternatives,
    claims,
    evidenceItems,
    relations,
  });
};

export function createHypothesisReviewReceipt(review) {
  const snapshot = reviewSnapshot(review);
  const reviewedEvidenceItemIds = snapshot.evidenceItems
    .filter(({ type }) => !["provider_rationale", "analyst_annotation"].includes(type))
    .map(({ id }) => id)
    .sort();
  return freeze({
    schemaVersion: 1,
    hypothesisId: snapshot.hypothesis.id,
    reviewedEvidenceItemIds,
    reviewedAlternativeIds: snapshot.alternatives.map(({ id }) => id),
    reviewFingerprint: JSON.stringify(snapshot),
  });
}

export function assertStoredHypothesisReviewReceipt(receipt, errorFactory) {
  const fail = (message) => {
    if (errorFactory) throw errorFactory(message);
    throw new VisibilityError("INVALID_HYPOTHESIS_REVIEW_RECEIPT", message);
  };
  const evidenceIds = receipt?.reviewedEvidenceItemIds;
  const alternativeIds = receipt?.reviewedAlternativeIds;
  let snapshot;
  try {
    snapshot = JSON.parse(receipt?.reviewFingerprint);
  } catch {
    snapshot = null;
  }
  const fingerprintIsCanonical = snapshot != null
    && JSON.stringify(canonicalize(snapshot)) === receipt?.reviewFingerprint;
  const snapshotEvidenceIds = Array.isArray(snapshot?.evidenceItems)
    ? snapshot.evidenceItems
      .filter(({ type }) => !["provider_rationale", "analyst_annotation"].includes(type))
      .map(({ id }) => id)
      .sort()
    : null;
  const snapshotAlternativeIds = Array.isArray(snapshot?.alternatives)
    ? snapshot.alternatives.map(({ id }) => id)
    : null;
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
    || typeof receipt.reviewFingerprint !== "string"
    || !receipt.reviewFingerprint
    || !fingerprintIsCanonical
    || snapshot?.schema !== "hypothesis-review-content-v1"
    || snapshot?.hypothesis?.id !== receipt.hypothesisId
    || JSON.stringify(snapshotEvidenceIds) !== JSON.stringify(evidenceIds)
    || JSON.stringify(snapshotAlternativeIds) !== JSON.stringify(alternativeIds)
  ) {
    fail("A reviewed hypothesis requires a content-bound receipt, structured evidence, and alternatives.");
  }
  return freeze({
    schemaVersion: 1,
    hypothesisId: receipt.hypothesisId,
    reviewedEvidenceItemIds: [...evidenceIds],
    reviewedAlternativeIds: [...alternativeIds],
    reviewFingerprint: receipt.reviewFingerprint,
  });
}
