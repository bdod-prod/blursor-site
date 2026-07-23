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

export const EVIDENCE_REVIEW_STATES = Object.freeze(["unreviewed", "reviewed", "excluded"]);

const OBSERVATION_EVIDENCE_TYPES = new Set([
  "inline_citation",
  "returned_source",
  "provider_rationale",
]);

const required = (value, code, message) => {
  const text = String(value ?? "").trim();
  if (!text) throw new VisibilityError(code, message);
  return text;
};

const safeUrl = (value) => {
  if (value == null) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new VisibilityError("INVALID_EVIDENCE_URL", "Evidence URL must use http or https.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new VisibilityError("INVALID_EVIDENCE_URL", "Evidence URL must use http or https.");
  }
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
};

const evidenceTimestamp = (value) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new VisibilityError("INVALID_EVIDENCE_TIMESTAMP", "Evidence collection timestamp is invalid.");
  }
  return parsed.toISOString();
};

export const EVIDENCE_TERMS = Object.freeze({
  1: "observed",
  2: "repeated",
  3: "consistent with",
  4: "likely",
  5: "supported after follow-up",
});

export function normalizeEvidenceItem(input) {
  const id = required(input?.id, "INVALID_EVIDENCE_ID", "Evidence ID is required.");
  const type = String(input?.type || "").trim();
  if (!EVIDENCE_TYPES.includes(type)) throw new VisibilityError("INVALID_EVIDENCE_TYPE", "Unknown evidence type.");

  const provenance = type === "provider_rationale"
    ? "provider_supplied"
    : String(input?.provenance || "").trim();
  if (!provenance) throw new VisibilityError("INVALID_EVIDENCE_PROVENANCE", "Evidence provenance is required.");
  const reviewState = String(input?.reviewState || "").trim();
  if (!EVIDENCE_REVIEW_STATES.includes(reviewState)) {
    throw new VisibilityError("INVALID_EVIDENCE_REVIEW_STATE", "Unknown evidence review state.");
  }
  const observationId = input?.observationId == null
    ? null
    : required(input.observationId, "INVALID_EVIDENCE_OBSERVATION", "Evidence observation ID cannot be blank.");
  if (OBSERVATION_EVIDENCE_TYPES.has(type) && !observationId) {
    throw new VisibilityError("EVIDENCE_OBSERVATION_REQUIRED", "Observation evidence requires an observation ID.");
  }

  return Object.freeze({
    id,
    type,
    provenance,
    label: required(input?.label, "INVALID_EVIDENCE_LABEL", "Evidence label is required."),
    excerpt: input?.excerpt == null ? null : String(input.excerpt),
    url: safeUrl(input?.url),
    surfaceId: required(input?.surfaceId, "INVALID_EVIDENCE_SURFACE", "Evidence surface ID is required."),
    surfaceLabel: required(input?.surfaceLabel, "INVALID_EVIDENCE_SURFACE_LABEL", "Evidence surface label is required."),
    observationId,
    collectedAt: evidenceTimestamp(input?.collectedAt),
    reviewState,
  });
}

export function buildEvidenceTrace({ claims, evidenceItems, relations }) {
  const claimMap = new Map();
  for (const claim of claims || []) {
    const claimId = required(claim?.id, "INVALID_EVIDENCE_CLAIM", "Evidence claim ID is required.");
    if (claimMap.has(claimId)) throw new VisibilityError("DUPLICATE_EVIDENCE_CLAIM", "Evidence claim IDs must be unique.");
    claimMap.set(claimId, Object.freeze({ ...claim, id: claimId }));
  }
  const itemMap = new Map();
  for (const item of evidenceItems || []) {
    const normalized = normalizeEvidenceItem(item);
    if (itemMap.has(normalized.id)) throw new VisibilityError("DUPLICATE_EVIDENCE_ITEM", "Evidence item IDs must be unique.");
    itemMap.set(normalized.id, normalized);
  }
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

export function validateLowLevelEvidenceAssessment(input) {
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

  return Object.freeze({ level, term: EVIDENCE_TERMS[level] });
}
