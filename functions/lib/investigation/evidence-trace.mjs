import { VisibilityError } from "../visibility/visibility-error.mjs";

export const EVIDENCE_TYPES = Object.freeze([
  "inline_citation",
  "returned_source",
  "page_fact",
  "checker_fact",
  "provider_rationale",
  "analyst_annotation",
]);

export const EVIDENCE_RELATIONS = Object.freeze([
  "supports",
  "contradicts",
  "contextualizes",
  "unclear",
]);

const TERMS = Object.freeze({
  1: "observed",
  2: "repeated",
  3: "consistent with",
  4: "likely",
  5: "supported after follow-up",
});

export function normalizeEvidenceItem(input) {
  const id = String(input?.id || "").trim();
  const type = String(input?.type || "").trim();
  if (!id) throw new VisibilityError("INVALID_EVIDENCE_ID", "Evidence ID is required.");
  if (!EVIDENCE_TYPES.includes(type)) throw new VisibilityError("INVALID_EVIDENCE_TYPE", "Unknown evidence type.");

  const provenance = type === "provider_rationale"
    ? "provider_supplied"
    : String(input?.provenance || "").trim();
  if (!provenance) throw new VisibilityError("INVALID_EVIDENCE_PROVENANCE", "Evidence provenance is required.");

  return Object.freeze({
    id,
    type,
    provenance,
    label: String(input?.label || "").trim(),
    excerpt: input?.excerpt == null ? null : String(input.excerpt),
    url: input?.url || null,
    collectedAt: input?.collectedAt || null,
    reviewState: input?.reviewState || "unreviewed",
  });
}

export function buildEvidenceTrace({ claims, evidenceItems, relations }) {
  const claimMap = new Map((claims || []).map((claim) => [claim.id, claim]));
  const itemMap = new Map((evidenceItems || []).map((item) => {
    const normalized = normalizeEvidenceItem(item);
    return [normalized.id, normalized];
  }));
  const grouped = new Map([...claimMap.keys()].map((id) => [id, []]));

  for (const relation of relations || []) {
    if (!claimMap.has(relation.claimId)) {
      throw new VisibilityError("UNKNOWN_EVIDENCE_CLAIM", "Evidence relation references an unknown claim.");
    }
    if (!itemMap.has(relation.evidenceItemId)) {
      throw new VisibilityError("UNKNOWN_EVIDENCE_ITEM", "Evidence relation references an unknown item.");
    }
    if (!EVIDENCE_RELATIONS.includes(relation.relation)) {
      throw new VisibilityError("INVALID_EVIDENCE_RELATION", "Unknown evidence relation.");
    }
    grouped.get(relation.claimId).push(Object.freeze({
      relation: relation.relation,
      item: itemMap.get(relation.evidenceItemId),
    }));
  }

  return Object.freeze({
    claims: Object.freeze([...claimMap.values()].map((claim) => Object.freeze({
      ...claim,
      evidence: Object.freeze(grouped.get(claim.id)),
    }))),
  });
}

export function validateEvidenceAssessment(input) {
  const level = input?.level;
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new VisibilityError("INVALID_EVIDENCE_LEVEL", "Evidence level must be 1 through 5.");
  }
  if (level >= 2 && input.repeated !== true) {
    throw new VisibilityError("REPETITION_REQUIRED", "Evidence level 2 or higher requires a repeated pattern.");
  }
  if (level >= 3 && (
    !Number.isInteger(input.observableLinks)
    || input.observableLinks < 1
    || !Number.isInteger(input.independentLinks)
    || input.independentLinks < 1
  )) {
    throw new VisibilityError(
      "INDEPENDENT_EVIDENCE_REQUIRED",
      "Evidence level 3 or higher requires independent observable evidence.",
    );
  }
  if (level >= 4 && (
    !Number.isInteger(input.alternativesReviewed)
    || input.alternativesReviewed < 1
    || input.independentLinks < 2
  )) {
    throw new VisibilityError(
      "CORROBORATION_REQUIRED",
      "Evidence level 4 requires two independent links and a reviewed alternative.",
    );
  }
  if (level >= 5 && input.followupComparable !== true) {
    throw new VisibilityError("COMPARABLE_FOLLOWUP_REQUIRED", "Evidence level 5 requires comparable follow-up.");
  }

  return Object.freeze({ level, term: TERMS[level] });
}
