import assert from "node:assert/strict";
import test from "node:test";

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
    observationStartedAt: "2026-07-22T09:00:00.250Z",
    observationCompletedAt: "2026-07-22T09:00:02.250Z",
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
  assert.equal(observation.projectId, "kamran-aghayev");
  assert.equal(observation.panelId, V1_PROMPT_PANEL.id);
  assert.equal(observation.panelFingerprint, V1_PROMPT_PANEL.fingerprint);
  assert.equal(observation.latencyMs, 2000);
  assert.equal(observation.supplierVersion, null);
  assert.equal(observation.reviewStatus, "reviewed");
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

test("does not collapse missing answer, refusal, provider failure, and brand absence", () => {
  const refused = normalizeObservation(validObservation({ state: "refused", rawAnswer: "I cannot answer that.", citations: [], sources: [] }));
  const missing = normalizeObservation(validObservation({ state: "missing_answer", rawAnswer: null, responseHash: null, citations: [], sources: [] }));
  const failed = normalizeObservation(validObservation({ state: "failed", rawAnswer: null, responseHash: null, citations: [], sources: [], failure: { code: "TRANSPORT", message: "Collection failed.", retryable: true } }));
  const absence = normalizeObservation(validObservation({ rawAnswer: "Other surgeons were listed.", citations: [], sources: [] }));
  assert.equal(refused.state, "refused");
  assert.equal(missing.state, "missing_answer");
  assert.equal(missing.failure, null);
  assert.equal(failed.state, "failed");
  assert.deepEqual(failed.failure, { code: "TRANSPORT", message: "Collection failed.", retryable: true });
  assert.equal(absence.state, "success");
  assert.throws(() => normalizeObservation(validObservation({ state: "failed", rawAnswer: "should not exist" })), /failed observation/i);
  assert.throws(() => normalizeObservation(validObservation({ state: "missing_answer", rawAnswer: "should not exist" })), /missing-answer observation/i);
  assert.throws(() => normalizeObservation(validObservation({
    state: "failed",
    rawAnswer: null,
    responseHash: null,
    citations: [{ id: "c", url: "https://example.org" }],
    failure: { code: "TRANSPORT", message: "Collection failed.", retryable: true },
  })), /cannot contain evidence links/i);
});

test("rejects whitespace-only success and refusal answers", () => {
  for (const state of ["success", "refused"]) {
    assert.throws(
      () => normalizeObservation(validObservation({ state, rawAnswer: " \n\t " })),
      (error) => error.code === "ANSWER_REQUIRED",
      state,
    );
  }
});

for (const [label, rawAnswer] of [
  ["U+200B ZERO WIDTH SPACE", "\u200B"],
  ["U+2060 WORD JOINER", "\u2060"],
  ["NUL", "\u0000"],
  ["mixed whitespace, control, and format characters", " \t\u0000\u200B\u200C\u200D\u2060\n"],
]) {
  test(`rejects ${label}-only success and refusal answers`, () => {
    for (const state of ["success", "refused"]) {
      assert.throws(
        () => normalizeObservation(validObservation({ state, rawAnswer })),
        (error) => error.code === "ANSWER_REQUIRED",
        state,
      );
    }
  });
}

test("accepts answers containing a visible letter, number, punctuation mark, or symbol", () => {
  for (const rawAnswer of ["Normal English answer.", "2026", "...", "🤖✨"]) {
    for (const state of ["success", "refused"]) {
      assert.equal(normalizeObservation(validObservation({ state, rawAnswer })).rawAnswer, rawAnswer);
    }
  }
});

test("enforces immutable identity, version, review, and timestamp invariants", () => {
  for (const [field, value, code] of [
    ["projectId", "", "INVALID_PROJECT_ID"],
    ["panelId", "", "INVALID_PANEL_ID"],
    ["methodologyVersion", "", "INVALID_METHODOLOGY_VERSION"],
    ["panelFingerprint", "", "INVALID_PANEL_FINGERPRINT"],
    ["adapterVersion", "", "INVALID_ADAPTER_VERSION"],
    ["extractorVersion", "", "INVALID_EXTRACTOR_VERSION"],
    ["reviewStatus", "approved", "INVALID_REVIEW_STATUS"],
  ]) {
    assert.throws(
      () => normalizeObservation(validObservation({ [field]: value })),
      (error) => error.code === code,
      field,
    );
  }

  assert.throws(
    () => normalizeObservation(validObservation({ observationStartedAt: "2026-07-22T08:59:59.000Z" })),
    (error) => error.code === "INVALID_OBSERVATION_TIME_ORDER",
  );
  assert.throws(
    () => normalizeObservation(validObservation({ observationCompletedAt: "2026-07-22T09:00:00.000Z" })),
    (error) => error.code === "INVALID_OBSERVATION_TIME_ORDER",
  );
});

test("requires a supplier version only for supplier-collected observations", () => {
  const supplier = {
    surfaceId: "rush_alice_supplier",
    surfaceLabel: "Alice data via licensed supplier",
    collectionClass: "supplier",
  };
  assert.throws(
    () => normalizeObservation(validObservation({ ...supplier, supplierVersion: null })),
    (error) => error.code === "SUPPLIER_VERSION_REQUIRED",
  );
  const observation = normalizeObservation(validObservation({ ...supplier, supplierVersion: "rush-adapter-contract-1" }));
  assert.equal(observation.supplierVersion, "rush-adapter-contract-1");
});
