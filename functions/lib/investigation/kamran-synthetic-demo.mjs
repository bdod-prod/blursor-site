import { extractAnswerEvidence } from "./answer-extractor.mjs";
import { createInvestigationCase, transitionInvestigationCase } from "./case-model.mjs";
import { buildInvestigationDossier } from "./dossier-model.mjs";
import { buildEvidenceTrace, validateEvidenceAssessment } from "./evidence-trace.mjs";
import { normalizeObservation } from "./observation-model.mjs";
import { validateV1InvestigationScope } from "./v1-scope.mjs";

const PROMPT_TEXTS = Object.freeze([
  "Which public sources help evaluate minimally invasive spine surgeons in the United States?",
  "What information should someone compare when researching a spine surgeon in the United States?",
  "Which websites commonly document a surgeon's professional background?",
  "How can someone verify a spine surgeon's areas of practice from public information?",
  "What makes a surgeon's website understandable to AI search systems?",
  "Which public evidence is useful when comparing spine surgery specialists?",
  "Compare the types of evidence found on hospital, directory, and surgeon websites.",
  "What public sources are commonly cited when AI systems describe medical specialists?",
  "How should professional credentials be represented consistently across the web?",
  "What can make two public profiles of the same surgeon appear inconsistent?",
  "What does the public web say about Dr. Kamran Aghayev's professional focus?",
  "Which public pages describe Dr. Kamran Aghayev's services?",
  "Are Dr. Kamran Aghayev's public professional profiles consistent with his website?",
  "What public page should be improved first when a surgeon is missing from an AI answer?",
  "How should a website change be evaluated after an AI visibility intervention?",
]);

const DEMO_SURFACES = Object.freeze([
  Object.freeze({
    id: "synthetic_chatgpt_web_logged_out_us",
    label: "Synthetic ChatGPT web · logged-out US fixture",
    collectionClass: "synthetic_fixture",
  }),
  Object.freeze({
    id: "synthetic_openai_responses_web_search_auto",
    label: "Synthetic fixture shaped like OpenAI Responses API · web search auto",
    collectionClass: "synthetic_fixture",
  }),
  Object.freeze({
    id: "synthetic_openai_responses_web_search_required",
    label: "Synthetic fixture shaped like OpenAI Responses API · web search required",
    collectionClass: "synthetic_fixture",
  }),
]);

const WINDOWS = Object.freeze([
  Object.freeze({
    name: "baseline",
    dates: Object.freeze(["2026-07-22", "2026-07-25", "2026-07-28"]),
  }),
  Object.freeze({
    name: "followup",
    dates: Object.freeze(["2026-08-05", "2026-08-08", "2026-08-11"]),
  }),
]);

const prompts = Object.freeze(PROMPT_TEXTS.map((text, index) => Object.freeze({
  id: `prompt-${String(index + 1).padStart(2, "0")}`,
  text,
  language: "en",
  intent: index < 6 ? "discovery" : index < 10 ? "comparison" : index < 13 ? "validation" : "action",
})));

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

function answerFor(windowName, promptIndex) {
  if (promptIndex !== 0) {
    return "Synthetic fixture: this fabricated answer contains no evaluated recommendation and is not a real provider result.";
  }
  if (windowName === "baseline") {
    return "Synthetic fixture: this fabricated answer omits the investigated brand. A public directory is shown as an example source; this is not a real provider result.";
  }
  return "Synthetic fixture: this fabricated answer mentions Dr. Kamran Aghayev after a test intervention. This is not a real provider result or a claim about actual performance.";
}

function hashFor(windowName, promptIndex) {
  if (promptIndex !== 0) return "466ad4e25816d310306754a66c44804ddc768d49143f2f780f28ca1d922a8b3d";
  return windowName === "baseline"
    ? "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6"
    : "f6a5ef502fc5d5d1890ba2a4d32130338093d146b69a1fd1db062fd6777906e0";
}

function buildObservations() {
  const observations = [];
  for (const window of WINDOWS) {
    for (const [cycleIndex, day] of window.dates.entries()) {
      for (const surface of DEMO_SURFACES) {
        for (const [promptIndex, prompt] of prompts.entries()) {
          const hasLinks = promptIndex === 0
            && surface.id === "synthetic_openai_responses_web_search_required";
          const hasRationale = promptIndex === 0
            && window.name === "baseline"
            && surface.id === "synthetic_openai_responses_web_search_auto";

          observations.push(normalizeObservation({
            id: `${window.name}-${day}-${surface.id}-${prompt.id}`,
            investigationId: "kamran-investigation-01",
            promptId: prompt.id,
            panelVersion: 1,
            runId: `${window.name}-${day}`,
            repeatOrdinal: cycleIndex + 1,
            state: "success",
            surfaceId: surface.id,
            surfaceLabel: surface.label,
            collectionClass: surface.collectionClass,
            synthetic: true,
            scheduledAt: `${day}T09:00:00.000Z`,
            collectedAt: `${day}T09:00:02.000Z`,
            latencyMs: 2000,
            retryCount: 0,
            cost: { currency: "USD", microAmount: 0 },
            requestId: null,
            responseId: null,
            responseHash: hashFor(window.name, promptIndex),
            requestConfig: {
              promptText: prompt.text,
              wrapper: "Synthetic US-English investigation fixture.",
              instructions: "Use public information only. This fixture sends no request.",
              language: "en",
              country: "US",
              toolChoice: surface.id.endsWith("required") ? "required" : surface.id.endsWith("auto") ? "auto" : null,
              searchMode: surface.id.endsWith("required") ? "required" : surface.id.endsWith("auto") ? "auto" : null,
              liveAccess: false,
              requestedSourceInclusion: hasLinks,
              deviceClass: "synthetic_fixture",
              authState: "synthetic_fixture",
              conversationState: "fresh",
              modelLabel: "synthetic-fixture",
            },
            rawAnswer: answerFor(window.name, promptIndex),
            citations: hasLinks ? [{
              id: `${day}-citation`,
              url: "https://example.org/synthetic-directory",
              title: "Synthetic directory",
              start: null,
              end: null,
            }] : [],
            sources: hasLinks ? [{
              id: `${day}-source`,
              url: "https://example.org/synthetic-source-list",
              title: "Synthetic returned source",
            }] : [],
            providerRationale: hasRationale ? {
              kind: "reasoning_summary",
              text: "Synthetic provider rationale: directory-style sources were emphasized.",
              retentionStatus: "fixture_only",
            } : null,
            featureFlags: { searchUsed: hasLinks, fabricated: true },
          }));
        }
      }
    }
  }
  return Object.freeze(observations);
}

function closeSyntheticCase() {
  let record = createInvestigationCase({
    id: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    question: "Why is the brand absent from this US prompt cohort?",
    methodVersion: "0.2",
    panelId: "kamran-us-en-v1",
    panelVersion: 1,
    language: "en",
    location: "US",
    surfaces: DEMO_SURFACES.map(({ id }) => id),
    createdAt: "2026-07-22T08:00:00.000Z",
  });
  const steps = [
    { to: "baseline_collecting", at: "2026-07-22T08:05:00.000Z", note: "Synthetic baseline opened." },
    { to: "evidence_review", at: "2026-07-28T10:00:00.000Z", note: "Three synthetic cycles complete." },
    { to: "hypothesis_ready", at: "2026-07-28T12:00:00.000Z", note: "Synthetic hypothesis approved.", evidenceLinks: 5, alternativesCount: 2 },
    { to: "intervention_in_progress", at: "2026-07-29T09:00:00.000Z", note: "Synthetic intervention recorded." },
    { to: "followup_collecting", at: "2026-08-05T09:00:00.000Z", note: "Synthetic follow-up opened." },
    { to: "followup_review", at: "2026-08-11T10:00:00.000Z", note: "Three synthetic follow-up cycles complete." },
    { to: "closed_supported", at: "2026-08-11T12:00:00.000Z", note: "Synthetic follow-up supports the test hypothesis without proving cause.", comparability: true },
  ];
  for (const step of steps) {
    record = transitionInvestigationCase(record, { reviewer: "alex", ...step });
  }
  return record;
}

export function buildKamranSyntheticDemo() {
  const scope = validateV1InvestigationScope({
    projectId: "kamran-aghayev",
    location: "US",
    cadenceDays: 3,
    panel: {
      id: "kamran-us-en-v1",
      version: 1,
      methodologyVersion: "0.2",
      prompts,
    },
  });
  const observations = buildObservations();
  const target = observations.find(({ runId, surfaceId, promptId }) => (
    runId === "baseline-2026-07-22"
    && surfaceId === "synthetic_openai_responses_web_search_required"
    && promptId === "prompt-01"
  ));
  const extracted = extractAnswerEvidence(target, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
    competitors: [],
  });
  const claim = extracted.claims[0];
  const evidenceItems = [
    { id: "e-citation", type: "inline_citation", provenance: "synthetic observation", label: "Synthetic inline citation", excerpt: "A directory is attached to the sampled claim.", url: "https://example.org/synthetic-directory", reviewState: "reviewed" },
    { id: "e-source", type: "returned_source", provenance: "synthetic observation", label: "Synthetic returned source", excerpt: "The surface lists an additional source without attaching it to a claim.", url: "https://example.org/synthetic-source-list", reviewState: "reviewed" },
    { id: "e-page", type: "page_fact", provenance: "synthetic page review", label: "Synthetic page fact", excerpt: "The fabricated example page lacks a consolidated service statement.", reviewState: "reviewed" },
    { id: "e-checker", type: "checker_fact", provenance: "synthetic BLURSOR checker report", label: "Synthetic delivery fact", excerpt: "The fabricated checker result shows readable HTML delivery.", reviewState: "reviewed" },
    { id: "e-contradiction", type: "page_fact", provenance: "synthetic conflicting page review", label: "Synthetic contradiction", excerpt: "A second fabricated profile already contains the missing statement.", reviewState: "reviewed" },
    { id: "e-rationale", type: "provider_rationale", label: "Provider-supplied rationale", excerpt: "Synthetic provider rationale: directory-style sources were emphasized.", reviewState: "reviewed" },
  ];
  const relations = [
    { claimId: claim.id, evidenceItemId: "e-citation", relation: "supports" },
    { claimId: claim.id, evidenceItemId: "e-source", relation: "contextualizes" },
    { claimId: claim.id, evidenceItemId: "e-page", relation: "supports" },
    { claimId: claim.id, evidenceItemId: "e-checker", relation: "contextualizes" },
    { claimId: claim.id, evidenceItemId: "e-contradiction", relation: "contradicts" },
    { claimId: claim.id, evidenceItemId: "e-rationale", relation: "contextualizes" },
  ];
  const trace = buildEvidenceTrace({ claims: [claim], evidenceItems, relations });
  const dossierEvidence = trace.claims[0].evidence.map(({ relation, item }) => ({
    ...item,
    relation,
  }));
  const assessment = validateEvidenceAssessment({
    level: 5,
    repeated: true,
    observableLinks: 5,
    independentLinks: 4,
    providerRationaleLinks: 1,
    alternativesReviewed: 2,
    followupComparable: true,
  });
  const caseRecord = closeSyntheticCase();
  const metrics = DEMO_SURFACES.flatMap((surface) => [
    { id: `${surface.id}-baseline`, label: "Brand mentions", numerator: 0, denominator: 45, surfaceId: surface.id, window: "baseline" },
    { id: `${surface.id}-followup`, label: "Brand mentions", numerator: 3, denominator: 45, surfaceId: surface.id, window: "follow-up" },
  ]);
  const dossier = buildInvestigationDossier({
    caseRecord,
    projectLabel: "Dr. Kamran Aghayev · synthetic example",
    surfaceLabels: DEMO_SURFACES.map(({ label }) => label),
    baselineWindow: "2026-07-22 to 2026-07-28",
    followupWindow: "2026-08-05 to 2026-08-11",
    exampleOnly: true,
    assessment,
    observedPattern: {
      summary: "Fabricated test data shows absence in three baseline cycles and presence in three comparable follow-up cycles.",
      metrics,
      coverage: { valid: 270, scheduled: 270, failed: 0 },
    },
    evidenceItems: dossierEvidence,
    hypothesis: {
      wording: "In this synthetic example, clearer consolidated public evidence is consistent with the changed answer pattern.",
      confidence: "bounded",
      basis: ["Repeated fabricated observations", "Synthetic citation and page evidence", "Comparable synthetic follow-up"],
      contradictions: ["A second synthetic profile already contained similar wording"],
      inferenceSteps: ["The evidence pattern is associated with, but does not prove, the answer change"],
      falsifier: "Comparable follow-up returns to the earlier pattern while the intervention remains available.",
      reviewState: "approved",
    },
    alternatives: [
      { wording: "Normal surface variation produced the difference.", disposition: "still plausible" },
      { wording: "The fabricated source set changed independently of the intervention.", disposition: "not ruled out" },
    ],
    nextTest: "Repeat the same frozen panel for three more cycles without changing the synthetic intervention.",
    intervention: {
      label: "Synthetic intervention",
      detail: "Add one consolidated public service statement to the fabricated example page.",
      deployedAt: "2026-07-29T09:00:00.000Z",
    },
    followup: {
      comparable: true,
      outcome: "supported_after_followup",
      summary: "The fabricated pattern changed, but causality remains unproven.",
    },
    review: {
      analyst: "Alex Rostovtsev",
      reviewedAt: "2026-08-11T12:00:00.000Z",
      extractorVersion: "answer-evidence-1",
    },
    limitations: [
      "Every observation and evidence item is fabricated test data.",
      "The example demonstrates method and interface behavior, not a real finding about Dr. Kamran Aghayev.",
    ],
  });

  return deepFreeze({ scope, observations, dossier });
}
