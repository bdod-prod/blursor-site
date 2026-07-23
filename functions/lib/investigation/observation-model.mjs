import { getVisibilitySurface } from "../visibility/surface-registry.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";
import { validatePanelFingerprint } from "./panel-identity.mjs";

export const OBSERVATION_STATES = Object.freeze(["success", "refused", "missing_answer", "failed"]);
export const COLLECTION_CLASSES = Object.freeze(["official_api", "supplier", "consumer_interface", "native_dashboard", "synthetic_fixture"]);
export const OBSERVATION_REVIEW_STATUSES = Object.freeze(["unreviewed", "reviewed", "excluded"]);

const VISIBLE_ANSWER_CONTENT = /[\p{L}\p{N}\p{P}\p{S}]/u;

const hasVisibleAnswerContent = (value) => VISIBLE_ANSWER_CONTENT.test(String(value ?? ""));

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

const version = (value, code, message) => required(value, code, message);

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
  if ((state === "success" || state === "refused") && !hasVisibleAnswerContent(rawAnswer)) {
    throw new VisibilityError("ANSWER_REQUIRED", "Successful and refused observations require visible answer content.");
  }
  if (state === "failed" && rawAnswer) throw new VisibilityError("FAILED_OBSERVATION_HAS_ANSWER", "A failed observation cannot contain answer text.");
  if (state === "missing_answer" && rawAnswer) throw new VisibilityError("MISSING_ANSWER_HAS_ANSWER", "A missing-answer observation cannot contain answer text.");
  if (state === "failed" && !input?.failure?.code) throw new VisibilityError("FAILURE_REQUIRED", "A failed observation requires a failure record.");
  if (state !== "failed" && input?.failure != null) throw new VisibilityError("UNEXPECTED_FAILURE", "Only a failed observation may contain failure information.");
  const config = clone(input?.requestConfig || {});
  const projectId = required(input?.projectId, "INVALID_PROJECT_ID", "Observation project ID is required.");
  const panelId = required(input?.panelId, "INVALID_PANEL_ID", "Observation prompt-panel ID is required.");
  const panelVersion = input?.panelVersion;
  if (!Number.isInteger(panelVersion) || panelVersion < 1) throw new VisibilityError("INVALID_PANEL_VERSION", "Panel version must be a positive integer.");
  const methodologyVersion = required(input?.methodologyVersion, "INVALID_METHODOLOGY_VERSION", "Observation methodology version is required.");
  if (!/^\d+\.\d+$/.test(methodologyVersion)) throw new VisibilityError("INVALID_METHODOLOGY_VERSION", "Observation methodology version must use major.minor format.");
  const promptId = required(input?.promptId, "INVALID_PROMPT_ID", "Prompt ID is required.");
  const panelIdentity = validatePanelFingerprint(input?.panelFingerprint, { panelId, panelVersion, methodologyVersion });
  const promptIdentity = panelIdentity.panel.prompts.find((prompt) => prompt.id === promptId);
  const promptText = required(config.promptText, "PROMPT_TEXT_REQUIRED", "Exact prompt text is required.");
  if (!promptIdentity || promptIdentity.text !== promptText) {
    throw new VisibilityError("PROMPT_IDENTITY_MISMATCH", "Observation prompt does not match the canonical panel fingerprint.");
  }
  const scheduledAt = timestamp(input?.scheduledAt, "scheduledAt");
  const observationStartedAt = timestamp(input?.observationStartedAt, "observationStartedAt");
  const observationCompletedAt = timestamp(input?.observationCompletedAt, "observationCompletedAt");
  const scheduledMs = new Date(scheduledAt).getTime();
  const startedMs = new Date(observationStartedAt).getTime();
  const completedMs = new Date(observationCompletedAt).getTime();
  if (scheduledMs > startedMs || startedMs > completedMs) {
    throw new VisibilityError("INVALID_OBSERVATION_TIME_ORDER", "Observation timestamps must be ordered scheduled, started, completed.");
  }
  const adapterVersion = version(input?.adapterVersion, "INVALID_ADAPTER_VERSION", "Adapter version is required.");
  const supplierVersion = input?.supplierVersion == null
    ? null
    : version(input.supplierVersion, "INVALID_SUPPLIER_VERSION", "Supplier version cannot be blank.");
  if (collectionClass === "supplier" && !supplierVersion) {
    throw new VisibilityError("SUPPLIER_VERSION_REQUIRED", "Supplier-collected observations require a supplier version.");
  }
  const extractorVersion = version(input?.extractorVersion, "INVALID_EXTRACTOR_VERSION", "Extractor version is required.");
  const reviewStatus = required(input?.reviewStatus, "INVALID_REVIEW_STATUS", "Observation review status is required.");
  if (!OBSERVATION_REVIEW_STATUSES.includes(reviewStatus)) {
    throw new VisibilityError("INVALID_REVIEW_STATUS", "Unknown observation review status.");
  }
  const citations = normalizeLinks(input?.citations, true);
  const sources = normalizeLinks(input?.sources, false);
  if ((state === "failed" || state === "missing_answer") && (citations.length || sources.length || input?.providerRationale)) {
    throw new VisibilityError("ANSWERLESS_OBSERVATION_HAS_EVIDENCE", "Failed and missing-answer observations cannot contain evidence links or provider rationale.");
  }
  const responseHash = /^[0-9a-f]{64}$/.test(String(input?.responseHash || "")) ? String(input.responseHash) : null;
  if ((state === "success" || state === "refused") && !responseHash) {
    throw new VisibilityError("INVALID_RESPONSE_HASH", "Successful and refused observations require a lowercase SHA-256 response hash.");
  }
  if ((state === "failed" || state === "missing_answer") && input?.responseHash != null) {
    throw new VisibilityError("UNEXPECTED_RESPONSE_HASH", "Failed and missing-answer observations cannot contain a response hash.");
  }
  const observation = {
    schemaVersion: 1,
    id: required(input?.id, "INVALID_OBSERVATION_ID", "Observation ID is required."),
    investigationId: required(input?.investigationId, "INVALID_INVESTIGATION_ID", "Investigation ID is required."),
    projectId,
    promptId,
    panelId,
    panelVersion,
    methodologyVersion,
    panelFingerprint: panelIdentity.fingerprint,
    runId: required(input?.runId, "INVALID_RUN_ID", "Run ID is required."),
    repeatOrdinal: input?.repeatOrdinal,
    state,
    surfaceId,
    surfaceLabel: required(input?.surfaceLabel, "INVALID_SURFACE_LABEL", "Surface label is required."),
    collectionClass,
    synthetic,
    scheduledAt,
    observationStartedAt,
    observationCompletedAt,
    latencyMs: completedMs - startedMs,
    adapterVersion,
    supplierVersion,
    extractorVersion,
    reviewStatus,
    retryCount: Number.isInteger(input?.retryCount) && input.retryCount >= 0 ? input.retryCount : 0,
    cost: normalizeCost(input?.cost),
    requestId: input?.requestId == null ? null : String(input.requestId),
    responseId: input?.responseId == null ? null : String(input.responseId),
    responseHash,
    requestConfig: {
      promptText,
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
    citations,
    sources,
    providerRationale: input?.providerRationale ? {
      kind: required(input.providerRationale.kind, "RATIONALE_KIND_REQUIRED", "Provider rationale kind is required."),
      text: required(input.providerRationale.text, "RATIONALE_TEXT_REQUIRED", "Provider rationale text is required."),
      retentionStatus: required(input.providerRationale.retentionStatus, "RATIONALE_RETENTION_REQUIRED", "Provider rationale retention status is required."),
      provenance: "provider_supplied",
    } : null,
    featureFlags: clone(input?.featureFlags || {}),
    failure: state === "failed" ? {
      code: required(input.failure.code, "FAILURE_CODE_REQUIRED", "Failure code is required."),
      message: required(input.failure.message, "FAILURE_MESSAGE_REQUIRED", "Failure message is required."),
      retryable: input.failure.retryable === true,
    } : null,
  };
  if (!Number.isInteger(observation.repeatOrdinal) || observation.repeatOrdinal < 1) throw new VisibilityError("INVALID_REPEAT_ORDINAL", "Repeat ordinal must be positive.");
  return freeze(observation);
}
