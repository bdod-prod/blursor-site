import assert from "node:assert/strict";
import test from "node:test";

import { extractAnswerEvidence } from "../../functions/lib/investigation/answer-extractor.mjs";
import { normalizeObservation } from "../../functions/lib/investigation/observation-model.mjs";
import { V1_PROMPT_PANEL } from "../../functions/lib/investigation/v1-scope.mjs";

function validObservation(overrides = {}) {
  return {
    id: "obs-001",
    investigationId: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    promptId: "prompt-01",
    panelId: V1_PROMPT_PANEL.id,
    panelVersion: 1,
    methodologyVersion: V1_PROMPT_PANEL.methodologyVersion,
    panelFingerprint: V1_PROMPT_PANEL.fingerprint,
    runId: "baseline-2026-07-22",
    repeatOrdinal: 1,
    state: "success",
    surfaceId: "openai_responses_web_search_auto",
    surfaceLabel: "OpenAI Responses API · web search auto",
    collectionClass: "official_api",
    synthetic: false,
    scheduledAt: "2026-07-22T09:00:00.000Z",
    observationStartedAt: "2026-07-22T09:00:00.000Z",
    observationCompletedAt: "2026-07-22T09:00:02.000Z",
    adapterVersion: "openai-responses-adapter-1",
    supplierVersion: null,
    extractorVersion: "answer-evidence-1",
    reviewStatus: "reviewed",
    retryCount: 0,
    cost: { currency: "USD", microAmount: 0 },
    requestId: "req_demo",
    responseId: "resp_demo",
    responseHash: "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6",
    requestConfig: {
      promptText: V1_PROMPT_PANEL.prompts[0].text,
      wrapper: "Answer for a US audience.",
      instructions: "Use public information only.",
      language: "en",
      country: "US",
      toolChoice: "auto",
      searchMode: "auto",
      liveAccess: true,
      requestedSourceInclusion: true,
      deviceClass: "server",
      authState: "api_account",
      conversationState: "fresh",
      modelLabel: "fixture-model",
    },
    rawAnswer: "Dr. Kamran Aghayev is a leading surgeon. Dr. Competitor is another option.",
    citations: [{ id: "citation-1", url: "https://example.org/profile", title: "Profile", start: 40, end: 43 }],
    sources: [{ id: "source-1", url: "https://example.org/directory", title: "Directory" }],
    providerRationale: null,
    featureFlags: { searchUsed: true },
    ...overrides,
  };
}

const config = {
  extractorVersion: "answer-evidence-1",
  brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
  competitors: [{ id: "competitor-example", aliases: ["Dr. Competitor"] }],
};

test("extracts deterministic claims, entity mentions, citations, and returned sources", () => {
  const observation = normalizeObservation(validObservation());

  const extracted = extractAnswerEvidence(observation, config);

  assert.equal(extracted.claims.length, 2);
  assert.deepEqual(extracted.mentions.map(({ entityId }) => entityId), ["brand", "competitor-example"]);
  assert.equal(extracted.citations[0].evidenceType, "inline_citation");
  assert.equal(extracted.sources[0].evidenceType, "returned_source");
  assert.equal(extracted.extractorVersion, "answer-evidence-1");
  assert.equal(extracted.hypothesis, undefined);
  assert.equal(extracted.claims[0].claimType, "recommendation_or_comparison");
  assert.equal(extracted.claims[1].claimType, "statement");
});

test("does not extract evidence from a failed observation", () => {
  const observation = normalizeObservation(validObservation({
    state: "failed",
    rawAnswer: null,
    responseHash: null,
    citations: [],
    sources: [],
    failure: { code: "TRANSPORT", message: "Collection failed.", retryable: true },
  }));

  const extracted = extractAnswerEvidence(observation, config);

  assert.equal(extracted.extractionState, "not_applicable");
  assert.deepEqual(extracted.claims, []);
  assert.deepEqual(extracted.mentions, []);
  assert.deepEqual(extracted.citations, []);
  assert.deepEqual(extracted.sources, []);
});

test("does not treat a completed missing answer as extractable or as a provider failure", () => {
  const observation = normalizeObservation(validObservation({
    state: "missing_answer",
    rawAnswer: null,
    responseHash: null,
    citations: [],
    sources: [],
  }));

  const extracted = extractAnswerEvidence(observation, config);

  assert.equal(observation.failure, null);
  assert.equal(extracted.extractionState, "not_applicable");
  assert.deepEqual(extracted.claims, []);
});

test("treats aliases containing regular-expression metacharacters literally", () => {
  const observation = normalizeObservation(validObservation({
    rawAnswer: "A+B is listed. AAB is not the same entity.",
    citations: [],
    sources: [],
  }));

  const extracted = extractAnswerEvidence(observation, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["A+B"],
  });

  assert.deepEqual(extracted.mentions, [{ claimId: "obs-001-claim-1", entityId: "brand", alias: "A+B" }]);
});

test("trims and ignores blank competitor aliases", () => {
  const observation = normalizeObservation(validObservation({
    rawAnswer: "A routine statement. Competitor Name is listed.",
    citations: [],
    sources: [],
  }));

  const extracted = extractAnswerEvidence(observation, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["Kamran Aghayev"],
    competitors: [{ id: "competitor-example", aliases: ["", "  ", "  Competitor Name  "] }],
  });

  assert.deepEqual(extracted.mentions, [{ claimId: "obs-001-claim-2", entityId: "competitor-example", alias: "Competitor Name" }]);
});

test("matches punctuation-ending aliases literally without matching inside a larger word", () => {
  const observation = normalizeObservation(validObservation({
    rawAnswer: "C++ is listed. XC++ is a different token.",
    citations: [],
    sources: [],
  }));

  const extracted = extractAnswerEvidence(observation, {
    extractorVersion: "answer-evidence-1",
    brandAliases: ["C++"],
  });

  assert.deepEqual(extracted.mentions, [{ claimId: "obs-001-claim-1", entityId: "brand", alias: "C++" }]);
});

test("requires at least one non-empty brand alias", () => {
  const observation = normalizeObservation(validObservation());

  assert.throws(
    () => extractAnswerEvidence(observation, { extractorVersion: "answer-evidence-1", brandAliases: [] }),
    (error) => error.code === "INVALID_ALIAS_CONFIG",
  );
});
