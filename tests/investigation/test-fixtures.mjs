import { normalizeObservation } from "../../functions/lib/investigation/observation-model.mjs";
import { V1_PROMPT_PANEL } from "../../functions/lib/investigation/v1-scope.mjs";

export const SYNTHETIC_SURFACES = Object.freeze([
  Object.freeze({
    id: "synthetic_chatgpt_web_logged_out_us",
    label: "Synthetic ChatGPT web · logged-out US fixture",
  }),
  Object.freeze({
    id: "synthetic_openai_responses_web_search_auto",
    label: "Synthetic fixture shaped like OpenAI Responses API · web search auto",
  }),
  Object.freeze({
    id: "synthetic_openai_responses_web_search_required",
    label: "Synthetic fixture shaped like OpenAI Responses API · web search required",
  }),
]);

export const SYNTHETIC_SURFACE = SYNTHETIC_SURFACES[1];

export function makeObservation(overrides = {}) {
  const day = overrides.day || "2026-07-22";
  const windowName = overrides.windowName || "baseline";
  const prompt = overrides.prompt || V1_PROMPT_PANEL.prompts[0];
  const surface = overrides.surface || SYNTHETIC_SURFACE;
  const rawAnswer = overrides.rawAnswer ?? "Synthetic fixture answer without the investigated brand.";
  return normalizeObservation({
    id: overrides.id || `${windowName}-${day}-${surface.id}-${prompt.id}`,
    investigationId: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    promptId: prompt.id,
    panelId: V1_PROMPT_PANEL.id,
    panelVersion: V1_PROMPT_PANEL.version,
    methodologyVersion: V1_PROMPT_PANEL.methodologyVersion,
    panelFingerprint: V1_PROMPT_PANEL.fingerprint,
    runId: `${windowName}-${day}`,
    repeatOrdinal: overrides.repeatOrdinal || 1,
    state: "success",
    surfaceId: surface.id,
    surfaceLabel: surface.label,
    collectionClass: "synthetic_fixture",
    synthetic: true,
    scheduledAt: `${day}T09:00:00.000Z`,
    observationStartedAt: `${day}T09:00:00.000Z`,
    observationCompletedAt: `${day}T09:00:02.000Z`,
    adapterVersion: "synthetic-adapter-1",
    supplierVersion: null,
    extractorVersion: "answer-evidence-1",
    reviewStatus: "reviewed",
    retryCount: 0,
    cost: { currency: "USD", microAmount: 0 },
    requestId: null,
    responseId: null,
    responseHash: "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6",
    requestConfig: {
      promptText: prompt.text,
      wrapper: "Synthetic US-English investigation fixture.",
      instructions: "Use public information only. This fixture sends no request.",
      language: "en",
      country: "US",
      toolChoice: "auto",
      searchMode: "auto",
      liveAccess: false,
      requestedSourceInclusion: true,
      deviceClass: "synthetic_fixture",
      authState: "synthetic_fixture",
      conversationState: "fresh",
      modelLabel: "synthetic-fixture",
      ...(overrides.requestConfig || {}),
    },
    rawAnswer,
    citations: [],
    sources: [],
    providerRationale: null,
    featureFlags: { fabricated: true },
  });
}

export function reviewedEvidence(overrides = {}) {
  return {
    id: "evidence-1",
    type: "page_fact",
    provenance: "synthetic owned-page review",
    label: "Synthetic owned-page fact",
    excerpt: "A reviewed synthetic page fact.",
    url: "https://example.org/page?private=drop#fragment",
    surfaceId: "owned_page_review",
    surfaceLabel: "Owned-page review",
    observationId: null,
    collectedAt: "2026-07-28T10:00:00.000Z",
    reviewState: "reviewed",
    ...overrides,
  };
}

export function hypothesisReview() {
  return {
    hypothesis: { id: "hypothesis-1", reviewState: "approved" },
    alternatives: [{
      id: "alternative-1",
      wording: "Normal surface variation.",
      disposition: "still plausible",
      reviewState: "reviewed",
    }],
    evidence: {
      claims: [{ id: "claim-1", observationId: "baseline-observation", text: "Synthetic claim." }],
      evidenceItems: [reviewedEvidence()],
      relations: [{ claimId: "claim-1", evidenceItemId: "evidence-1", relation: "supports" }],
    },
  };
}
