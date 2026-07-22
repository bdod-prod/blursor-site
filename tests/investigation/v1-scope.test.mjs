import assert from "node:assert/strict";
import test from "node:test";

import {
  V1_INVESTIGATION_SCOPE,
  calculateV1ObservationVolume,
  validateV1InvestigationScope,
} from "../../functions/lib/investigation/v1-scope.mjs";

const prompts = Array.from({ length: 15 }, (_, index) => ({
  id: `prompt-${String(index + 1).padStart(2, "0")}`,
  text: `English public-brand question ${index + 1}?`,
  language: "en",
  intent: index < 6 ? "discovery" : index < 10 ? "comparison" : index < 13 ? "validation" : "action",
}));

function validInput() {
  return {
    projectId: "kamran-aghayev",
    location: "US",
    cadenceDays: 3,
    panel: { id: "kamran-us-en-v1", version: 1, methodologyVersion: "0.2", prompts },
  };
}

test("validates and freezes the exact Kamran v1 scope", () => {
  const scope = validateV1InvestigationScope(validInput());
  assert.equal(scope.projectId, "kamran-aghayev");
  assert.equal(scope.location, "US");
  assert.equal(scope.cadenceDays, 3);
  assert.equal(scope.panel.prompts.length, 15);
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

test("calculates the approved collection volume", () => {
  assert.deepEqual(V1_INVESTIGATION_SCOPE.apiSurfaceIds, [
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
  ]);
  assert.equal(V1_INVESTIGATION_SCOPE.consumerSurfaceStatus, "supplier_pending");
  assert.equal(V1_INVESTIGATION_SCOPE.plannedSurfaceCount, 3);
  assert.equal(calculateV1ObservationVolume({ cycles: 1, surfaceCount: 3 }), 45);
  assert.equal(calculateV1ObservationVolume({ cycles: 10, surfaceCount: 3 }), 450);
  assert.throws(() => calculateV1ObservationVolume({ cycles: 0, surfaceCount: 3 }), /positive integers/i);
});
