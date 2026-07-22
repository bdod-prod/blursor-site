import assert from "node:assert/strict";
import test from "node:test";

import { normalizeObservation } from "../../functions/lib/investigation/observation-model.mjs";

function validObservation(overrides = {}) {
  return {
    id: "obs-001",
    investigationId: "kamran-investigation-01",
    promptId: "prompt-01",
    panelVersion: 1,
    runId: "baseline-2026-07-22",
    repeatOrdinal: 1,
    state: "success",
    surfaceId: "openai_responses_web_search_auto",
    surfaceLabel: "OpenAI Responses API · web search auto",
    collectionClass: "official_api",
    synthetic: false,
    scheduledAt: "2026-07-22T09:00:00.000Z",
    collectedAt: "2026-07-22T09:00:02.000Z",
    latencyMs: 2000,
    retryCount: 0,
    cost: { currency: "USD", microAmount: 0 },
    requestId: "req_demo",
    responseId: "resp_demo",
    responseHash: "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6",
    requestConfig: {
      promptText: "Who are leading minimally invasive spine surgeons in the United States?",
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
    rawAnswer: "Dr. Example is frequently mentioned.[1]",
    citations: [{ id: "citation-1", url: "https://example.org/profile?utm=drop#bio", title: "Profile", start: 35, end: 38 }],
    sources: [{ id: "source-1", url: "https://example.org/directory", title: "Directory" }],
    providerRationale: null,
    featureFlags: { searchUsed: true },
    ...overrides,
  };
}

test("normalizes and deeply freezes a complete observation", () => {
  const observation = normalizeObservation(validObservation());
  assert.equal(observation.citations[0].url, "https://example.org/profile");
  assert.equal(observation.sources[0].url, "https://example.org/directory");
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(Object.isFrozen(observation.requestConfig), true);
  assert.equal(Object.isFrozen(observation.citations), true);
  assert.equal(observation.providerRationale, null);
  assert.equal(observation.responseHash.length, 64);
});

test("keeps provider rationale optional and separately labelled", () => {
  const observation = normalizeObservation(validObservation({
    providerRationale: { kind: "reasoning_summary", text: "Search results emphasized directories.", retentionStatus: "fixture_only" },
  }));
  assert.deepEqual(observation.providerRationale, {
    kind: "reasoning_summary",
    text: "Search results emphasized directories.",
    retentionStatus: "fixture_only",
    provenance: "provider_supplied",
  });
});

test("permits synthetic consumer evidence only under an explicit fixture identity", () => {
  const observation = normalizeObservation(validObservation({
    surfaceId: "synthetic_chatgpt_web_logged_out_us",
    surfaceLabel: "Synthetic ChatGPT web · logged-out US fixture",
    collectionClass: "synthetic_fixture",
    synthetic: true,
    requestId: null,
    responseId: null,
  }));
  assert.equal(observation.synthetic, true);
  assert.throws(() => normalizeObservation({ ...validObservation(), surfaceId: "synthetic_fake", synthetic: false }), /unknown visibility surface/i);
});

test("accepts the registered native dashboard identity without checking execution rights", () => {
  const observation = normalizeObservation(validObservation({
    surfaceId: "yandex_webmaster_alice_native",
    surfaceLabel: "Alice AI visibility · Yandex Webmaster",
    collectionClass: "native_dashboard",
  }));

  assert.equal(observation.surfaceId, "yandex_webmaster_alice_native");
  assert.equal(observation.surfaceLabel, "Alice AI visibility · Yandex Webmaster");
  assert.equal(observation.collectionClass, "native_dashboard");
});

test("clones and deeply freezes nested configuration and flags from pre-frozen containers", () => {
  const requestConfig = validObservation().requestConfig;
  const requestToolChoice = { mode: "auto" };
  requestConfig.toolChoice = requestToolChoice;
  Object.freeze(requestConfig);

  const featureCollection = { searchUsed: true };
  const featureFlags = Object.freeze({ collection: featureCollection });

  const observation = normalizeObservation(validObservation({ requestConfig, featureFlags }));

  assert.notStrictEqual(observation.requestConfig.toolChoice, requestToolChoice);
  assert.notStrictEqual(observation.featureFlags.collection, featureCollection);
  assert.equal(Object.isFrozen(observation.requestConfig.toolChoice), true);
  assert.equal(Object.isFrozen(observation.featureFlags.collection), true);
  assert.equal(Object.isFrozen(requestToolChoice), false);
  assert.equal(Object.isFrozen(featureCollection), false);
});

test("does not collapse refusal, failure, and brand absence", () => {
  const refused = normalizeObservation(validObservation({ state: "refused", rawAnswer: "I cannot answer that.", citations: [], sources: [] }));
  const failed = normalizeObservation(validObservation({ state: "failed", rawAnswer: null, citations: [], sources: [], failure: { code: "TRANSPORT", message: "Collection failed." } }));
  const absence = normalizeObservation(validObservation({ rawAnswer: "Other surgeons were listed.", citations: [], sources: [] }));
  assert.equal(refused.state, "refused");
  assert.equal(failed.state, "failed");
  assert.equal(absence.state, "success");
  assert.throws(() => normalizeObservation(validObservation({ state: "failed", rawAnswer: "should not exist" })), /failed observation/i);
});
