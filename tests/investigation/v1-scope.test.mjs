import assert from "node:assert/strict";
import test from "node:test";

import {
  V1_INVESTIGATION_SCOPE,
  V1_PROMPT_PANEL,
  V1_PROMPT_PANEL_FINGERPRINT,
  calculateV1ObservationVolume,
  validateV1InvestigationScope,
} from "../../functions/lib/investigation/v1-scope.mjs";

function validInput() {
  return {
    projectId: "kamran-aghayev",
    location: "US",
    cadenceDays: 3,
    panel: structuredClone(V1_PROMPT_PANEL),
  };
}

test("validates and freezes the exact Kamran v1 scope", () => {
  const scope = validateV1InvestigationScope(validInput());
  assert.equal(scope.projectId, "kamran-aghayev");
  assert.equal(scope.location, "US");
  assert.equal(scope.cadenceDays, 3);
  assert.equal(scope.panel.prompts.length, 15);
  assert.equal(scope.panel.fingerprint, V1_PROMPT_PANEL_FINGERPRINT);
  assert.strictEqual(V1_PROMPT_PANEL.fingerprint, V1_PROMPT_PANEL_FINGERPRINT);
  assert.equal(Object.isFrozen(scope), true);
  assert.equal(Object.isFrozen(scope.panel), true);
});

test("rejects scope drift", () => {
  assert.throws(() => validateV1InvestigationScope({ ...validInput(), location: "GB" }), (error) => error.code === "V1_LOCATION_MISMATCH");
  assert.throws(() => validateV1InvestigationScope({ ...validInput(), cadenceDays: 1 }), (error) => error.code === "V1_CADENCE_MISMATCH");
  const short = validInput();
  short.panel = { ...short.panel, prompts: short.panel.prompts.slice(0, 14) };
  assert.throws(() => validateV1InvestigationScope(short), (error) => error.code === "V1_PROMPT_COUNT_MISMATCH");
  const russian = validInput();
  russian.panel = { ...russian.panel, prompts: russian.panel.prompts.map((prompt, index) => index === 0 ? { ...prompt, language: "ru" } : prompt) };
  assert.throws(() => validateV1InvestigationScope(russian), (error) => error.code === "V1_LANGUAGE_MISMATCH");
});

test("rejects v1 panel identity, methodology, prompt content, and order drift", () => {
  const cases = [
    ["V1_PANEL_ID_MISMATCH", (panel) => ({ ...panel, id: "another-panel" })],
    ["V1_PANEL_VERSION_MISMATCH", (panel) => ({ ...panel, version: 2 })],
    ["V1_METHODOLOGY_MISMATCH", (panel) => ({ ...panel, methodologyVersion: "0.3" })],
    ["V1_PANEL_FINGERPRINT_MISMATCH", (panel) => ({
      ...panel,
      prompts: panel.prompts.map((prompt, index) => index === 0
        ? { ...prompt, text: `${prompt.text} Mutated.` }
        : prompt),
    })],
    ["V1_PANEL_FINGERPRINT_MISMATCH", (panel) => ({ ...panel, prompts: [...panel.prompts].reverse() })],
  ];

  for (const [code, mutate] of cases) {
    const input = validInput();
    input.panel = mutate(input.panel);
    assert.throws(
      () => validateV1InvestigationScope(input),
      (error) => error.code === code,
      code,
    );
  }
});

test("calculates the approved collection volume", () => {
  assert.deepEqual(V1_INVESTIGATION_SCOPE.apiSurfaceIds, [
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
  ]);
  assert.equal(V1_INVESTIGATION_SCOPE.consumerSurfaceStatus, "supplier_pending");
  assert.equal(V1_INVESTIGATION_SCOPE.plannedSurfaceCount, V1_INVESTIGATION_SCOPE.plannedSurfaces.length);
  assert.deepEqual(V1_INVESTIGATION_SCOPE.plannedSurfaces.map(({ surfaceId }) => surfaceId), [
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
    null,
  ]);
  assert.deepEqual(V1_INVESTIGATION_SCOPE.plannedSurfaces.map(({ publicLabel }) => publicLabel), [
    "OpenAI Responses API · web search auto",
    "OpenAI Responses API · web search required",
    "Consumer web surface · supplier pending",
  ]);
  for (const surface of V1_INVESTIGATION_SCOPE.plannedSurfaces) {
    assert.equal(Object.isFrozen(surface), true);
    assert.equal(surface.executable, false);
  }
  assert.equal(V1_INVESTIGATION_SCOPE.plannedSurfaces[2].status, "supplier_pending");
  assert.equal(Object.isFrozen(V1_INVESTIGATION_SCOPE.plannedSurfaces), true);
  assert.equal(calculateV1ObservationVolume({ cycles: 1, surfaceCount: 3 }), 45);
  assert.equal(calculateV1ObservationVolume({ cycles: 10, surfaceCount: 3 }), 450);
  assert.throws(() => calculateV1ObservationVolume({ cycles: 0, surfaceCount: 3 }), /positive integers/i);
  for (const surfaceCount of [1, 2, 4]) {
    assert.throws(
      () => calculateV1ObservationVolume({ cycles: 1, surfaceCount }),
      (error) => error.code === "V1_SURFACE_COUNT_MISMATCH",
    );
  }
});
