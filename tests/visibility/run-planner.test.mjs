import test from "node:test";
import assert from "node:assert/strict";

import { planVisibilityRun } from "../../functions/lib/visibility/run-planner.mjs";
import { validatePromptPanel } from "../../functions/lib/visibility/prompt-panel.mjs";

const PANEL = {
  id: "ru-ai-visibility-pilot",
  version: 1,
  methodologyVersion: "0.1",
  prompts: [
    { id: "discovery-01", text: "Какие сервисы отслеживают AI visibility?", language: "ru", intent: "discovery" },
    { id: "comparison-01", text: "Какие AI visibility сервисы лучше?", language: "ru", intent: "comparison" },
  ],
};

const BASE_INPUT = {
  projectId: "blursor-pilot",
  panel: PANEL,
  surfaceId: "yandex_gen_search_api_ru",
  purpose: "forecast",
  repeatCount: 2,
  scheduledFor: "2026-07-21T09:00:00+03:00",
  projectSpentMicrorub: 0,
  projectBudgetMicrorub: 20_000_000_000,
  globalSpentMicrorub: 0,
  globalBudgetMicrorub: 20_000_000_000,
};

test("plans ordered, costed, deterministic Yandex forecast observations", async () => {
  const first = await planVisibilityRun(BASE_INPUT);
  const second = await planVisibilityRun(structuredClone(BASE_INPUT));

  assert.equal(first.observationCount, 4);
  assert.equal(first.panelFingerprint, validatePromptPanel(PANEL).fingerprint);
  assert.equal(first.methodologyVersion, PANEL.methodologyVersion);
  assert.equal(first.scheduledFor, "2026-07-21T06:00:00.000Z");
  assert.equal(first.projectedCost.projectedMicrorub, 20_320_000);
  assert.deepEqual(first.observations.map(({ promptId, repeatOrdinal }) => [promptId, repeatOrdinal]), [
    ["discovery-01", 1],
    ["discovery-01", 2],
    ["comparison-01", 1],
    ["comparison-01", 2],
  ]);
  assert.deepEqual(
    first.observations.map(({ idempotencyKey }) => idempotencyKey),
    second.observations.map(({ idempotencyKey }) => idempotencyKey),
  );
  assert.equal(first.observations.every(({ idempotencyKey }) => /^[a-f0-9]{64}$/.test(idempotencyKey)), true);
  assert.equal(JSON.stringify(first).includes("providerSecret"), false);
  assert.equal(first.surfaceLabel.includes("Alice"), false);
});

test("changes idempotency keys when an identity component changes", async () => {
  const base = await planVisibilityRun(BASE_INPUT);
  const variants = [
    { ...BASE_INPUT, panel: { ...PANEL, version: 2 } },
    { ...BASE_INPUT, panel: { ...PANEL, methodologyVersion: "0.2" } },
    { ...BASE_INPUT, panel: { ...PANEL, prompts: [{ ...PANEL.prompts[0], text: `${PANEL.prompts[0].text} Changed.` }, PANEL.prompts[1]] } },
    { ...BASE_INPUT, scheduledFor: "2026-07-22T09:00:00+03:00" },
    { ...BASE_INPUT, panel: { ...PANEL, prompts: [{ ...PANEL.prompts[0], id: "discovery-02" }] } },
  ];
  for (const input of variants) {
    const changed = await planVisibilityRun(input);
    assert.notEqual(changed.observations[0].idempotencyKey, base.observations[0].idempotencyKey);
  }

  const gigachat = await planVisibilityRun({
    ...BASE_INPUT,
    surfaceId: "gigachat_api",
    estimatedTokensPerObservation: 1_500,
  });
  assert.notEqual(gigachat.observations[0].idempotencyKey, base.observations[0].idempotencyKey);
  assert.notEqual(base.observations[0].idempotencyKey, base.observations[1].idempotencyKey);
});

test("rejects invalid run identity and schedule", async () => {
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, projectId: "" }),
    (error) => error.code === "INVALID_PROJECT_ID",
  );
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, scheduledFor: "not-a-date" }),
    (error) => error.code === "INVALID_SCHEDULE",
  );
});

test("rejects invalid repeats, unauthorized surface, and budget breach", async () => {
  for (const repeatCount of [0, 6, 1.5]) {
    await assert.rejects(
      planVisibilityRun({ ...BASE_INPUT, repeatCount }),
      (error) => error.code === "INVALID_REPEAT_COUNT",
    );
  }
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, surfaceId: "alice_pro_ui" }),
    (error) => error.code === "SURFACE_NOT_AUTHORIZED",
  );
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, projectBudgetMicrorub: 20_319_999 }),
    (error) => error.code === "PROJECT_BUDGET_EXCEEDED",
  );
});
