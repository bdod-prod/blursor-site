import test from "node:test";
import assert from "node:assert/strict";

import { VISIBILITY_SURFACES } from "../../functions/lib/visibility/surface-registry.mjs";
import {
  assertRunWithinBudgets,
  estimateRunCostMicrorub,
  formatRub,
} from "../../functions/lib/visibility/cost-model.mjs";

test("estimates fixed-request Yandex cost in microrubles", () => {
  assert.equal(estimateRunCostMicrorub({
    surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
    observationCount: 60,
  }), 304_800_000);
  assert.equal(formatRub(304_800_000), "304.80 ₽");
});

test("estimates token-priced GigaChat cost in microrubles", () => {
  assert.equal(estimateRunCostMicrorub({
    surface: VISIBILITY_SURFACES.gigachat_api,
    observationCount: 60,
    estimatedTokensPerObservation: 1_500,
  }), 5_850_000);
});

test("rejects invalid cost inputs and unavailable pricing", () => {
  for (const observationCount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => estimateRunCostMicrorub({
        surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
        observationCount,
      }),
      (error) => error.code === "INVALID_COST_INPUT",
    );
  }
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
      observationCount: Number.MAX_SAFE_INTEGER,
    }),
    (error) => error.code === "COST_OVERFLOW",
  );
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.gigachat_api,
      observationCount: 10,
    }),
    (error) => error.code === "INVALID_COST_INPUT",
  );
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.alice_pro_ui,
      observationCount: 10,
    }),
    (error) => error.code === "PRICING_UNAVAILABLE",
  );
});

test("accepts a run that exactly consumes both budgets", () => {
  assert.deepEqual(assertRunWithinBudgets({
    projectedMicrorub: 200,
    projectSpentMicrorub: 800,
    projectBudgetMicrorub: 1_000,
    globalSpentMicrorub: 800,
    globalBudgetMicrorub: 1_000,
  }), {
    projectedMicrorub: 200,
    projectRemainingMicrorub: 0,
    globalRemainingMicrorub: 0,
  });
});

test("rejects project and global budget overruns separately", () => {
  assert.throws(
    () => assertRunWithinBudgets({
      projectedMicrorub: 201,
      projectSpentMicrorub: 800,
      projectBudgetMicrorub: 1_000,
      globalSpentMicrorub: 0,
      globalBudgetMicrorub: 10_000,
    }),
    (error) => error.code === "PROJECT_BUDGET_EXCEEDED",
  );
  assert.throws(
    () => assertRunWithinBudgets({
      projectedMicrorub: 201,
      projectSpentMicrorub: 0,
      projectBudgetMicrorub: 10_000,
      globalSpentMicrorub: 800,
      globalBudgetMicrorub: 1_000,
    }),
    (error) => error.code === "GLOBAL_BUDGET_EXCEEDED",
  );
});
