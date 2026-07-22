import { getVisibilitySurface } from "../visibility/surface-registry.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";

export const OBSERVATION_STATES = Object.freeze(["success", "refused", "failed"]);
export const COLLECTION_CLASSES = Object.freeze(["official_api", "supplier", "consumer_interface", "synthetic_fixture"]);

const required = (value, code, message) => {
  const text = String(value ?? "").trim();
  if (!text) throw new VisibilityError(code, message);
  return text;
};

const timestamp = (value, field) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new VisibilityError("INVALID_OBSERVATION_TIMESTAMP", `${field} must be a valid timestamp.`);
  return date.toISOString();
};

const normalizeCost = (input) => {
  if (input == null) return null;
  const currency = String(input.currency || "");
  if (!/^[A-Z]{3}$/.test(currency)) throw new VisibilityError("INVALID_COST_CURRENCY", "Cost currency must be a three-letter code.");
  if (!Number.isSafeInteger(input.microAmount) || input.microAmount < 0) throw new VisibilityError("INVALID_COST_AMOUNT", "Cost microAmount must be a non-negative safe integer.");
  return { currency, microAmount: input.microAmount };
};

const url = (value) => {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
};

const normalizeLinks = (items, citation) => Object.freeze((items || []).map((item, index) => {
  try {
    return Object.freeze({
      id: required(item?.id, "INVALID_EVIDENCE_LINK", "Evidence link ID is required."),
      url: url(item?.url),
      title: String(item?.title || "").trim() || null,
      ...(citation ? { start: Number.isInteger(item?.start) ? item.start : null, end: Number.isInteger(item?.end) ? item.end : null } : {}),
    });
  } catch (error) {
    if (error instanceof VisibilityError) throw error;
    throw new VisibilityError("INVALID_EVIDENCE_URL", "Evidence URLs must use http or https.", { index });
  }
}));

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

export function normalizeObservation(input) {
  const state = required(input?.state, "INVALID_OBSERVATION_STATE", "Observation state is required.");
  if (!OBSERVATION_STATES.includes(state)) throw new VisibilityError("INVALID_OBSERVATION_STATE", "Unknown observation state.");
  const synthetic = input?.synthetic === true;
  const surfaceId = required(input?.surfaceId, "INVALID_OBSERVATION_SURFACE", "Surface ID is required.");
  const collectionClass = required(input?.collectionClass, "INVALID_COLLECTION_CLASS", "Collection class is required.");
  if (!COLLECTION_CLASSES.includes(collectionClass)) throw new VisibilityError("INVALID_COLLECTION_CLASS", "Unknown collection class.");
  if (synthetic) {
    if (!surfaceId.startsWith("synthetic_") || collectionClass !== "synthetic_fixture") {
      throw new VisibilityError("INVALID_SYNTHETIC_SURFACE", "Synthetic evidence requires a synthetic_ surface and synthetic_fixture class.");
    }
  } else {
    const surface = getVisibilitySurface(surfaceId);
    if (surface.publicLabel !== input.surfaceLabel || surface.collectionClass !== collectionClass) {
      throw new VisibilityError("SURFACE_IDENTITY_MISMATCH", "Observation surface identity does not match the registry.");
    }
  }
  const rawAnswer = input?.rawAnswer == null ? null : String(input.rawAnswer);
  if ((state === "success" || state === "refused") && !rawAnswer) throw new VisibilityError("ANSWER_REQUIRED", "Usable observations require answer text.");
  if (state === "failed" && rawAnswer) throw new VisibilityError("FAILED_OBSERVATION_HAS_ANSWER", "A failed observation cannot contain answer text.");
  if (state === "failed" && !input?.failure?.code) throw new VisibilityError("FAILURE_REQUIRED", "A failed observation requires a failure record.");
  const config = input?.requestConfig || {};
  const observation = {
    schemaVersion: 1,
    id: required(input?.id, "INVALID_OBSERVATION_ID", "Observation ID is required."),
    investigationId: required(input?.investigationId, "INVALID_INVESTIGATION_ID", "Investigation ID is required."),
    promptId: required(input?.promptId, "INVALID_PROMPT_ID", "Prompt ID is required."),
    panelVersion: input?.panelVersion,
    runId: required(input?.runId, "INVALID_RUN_ID", "Run ID is required."),
    repeatOrdinal: input?.repeatOrdinal,
    state,
    surfaceId,
    surfaceLabel: required(input?.surfaceLabel, "INVALID_SURFACE_LABEL", "Surface label is required."),
    collectionClass,
    synthetic,
    scheduledAt: timestamp(input?.scheduledAt, "scheduledAt"),
    collectedAt: timestamp(input?.collectedAt, "collectedAt"),
    latencyMs: Number.isInteger(input?.latencyMs) && input.latencyMs >= 0 ? input.latencyMs : null,
    retryCount: Number.isInteger(input?.retryCount) && input.retryCount >= 0 ? input.retryCount : 0,
    cost: normalizeCost(input?.cost),
    requestId: input?.requestId == null ? null : String(input.requestId),
    responseId: input?.responseId == null ? null : String(input.responseId),
    responseHash: /^[0-9a-f]{64}$/.test(String(input?.responseHash || "")) ? String(input.responseHash) : null,
    requestConfig: {
      promptText: required(config.promptText, "PROMPT_TEXT_REQUIRED", "Exact prompt text is required."),
      wrapper: String(config.wrapper || ""),
      instructions: String(config.instructions || ""),
      language: required(config.language, "LANGUAGE_REQUIRED", "Language is required."),
      country: required(config.country, "COUNTRY_REQUIRED", "Country is required."),
      toolChoice: config.toolChoice ?? null,
      searchMode: config.searchMode ?? null,
      liveAccess: config.liveAccess ?? null,
      requestedSourceInclusion: config.requestedSourceInclusion ?? null,
      deviceClass: config.deviceClass ?? null,
      authState: config.authState ?? null,
      conversationState: config.conversationState ?? null,
      modelLabel: config.modelLabel ?? null,
    },
    rawAnswer,
    citations: normalizeLinks(input?.citations, true),
    sources: normalizeLinks(input?.sources, false),
    providerRationale: input?.providerRationale ? {
      kind: required(input.providerRationale.kind, "RATIONALE_KIND_REQUIRED", "Provider rationale kind is required."),
      text: required(input.providerRationale.text, "RATIONALE_TEXT_REQUIRED", "Provider rationale text is required."),
      retentionStatus: required(input.providerRationale.retentionStatus, "RATIONALE_RETENTION_REQUIRED", "Provider rationale retention status is required."),
      provenance: "provider_supplied",
    } : null,
    featureFlags: { ...(input?.featureFlags || {}) },
    failure: state === "failed" ? { code: String(input.failure.code), message: String(input.failure.message || "Collection failed.") } : null,
  };
  if (!Number.isInteger(observation.panelVersion) || observation.panelVersion < 1) throw new VisibilityError("INVALID_PANEL_VERSION", "Panel version must be a positive integer.");
  if (!Number.isInteger(observation.repeatOrdinal) || observation.repeatOrdinal < 1) throw new VisibilityError("INVALID_REPEAT_ORDINAL", "Repeat ordinal must be positive.");
  if (state !== "failed" && !observation.responseHash) throw new VisibilityError("INVALID_RESPONSE_HASH", "Usable observations require a lowercase SHA-256 response hash.");
  return freeze(observation);
}
