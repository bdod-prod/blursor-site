import assert from "node:assert/strict";
import test from "node:test";

import {
  createFollowupComparisonReceipt,
  validateFollowupComparisonReceipt,
} from "../../functions/lib/investigation/followup-comparison.mjs";
import { makeObservation } from "./test-fixtures.mjs";

const baseline = () => [makeObservation({ day: "2026-07-22", windowName: "baseline" })];
const followup = () => [makeObservation({ day: "2026-08-05", windowName: "followup" })];

test("derives a comparable receipt from matching frozen observation cohorts", () => {
  const inputs = { baselineObservations: baseline(), followupObservations: followup() };
  const receipt = createFollowupComparisonReceipt(inputs);

  assert.equal(receipt.comparable, true);
  assert.equal(receipt.baselineFingerprint, receipt.followupFingerprint);
  assert.equal(Object.isFrozen(receipt), true);
  assert.deepEqual(validateFollowupComparisonReceipt(receipt, inputs), receipt);
});

test("configuration or cohort drift produces a non-comparable receipt", () => {
  const drifted = followup().map((observation) => ({
    ...observation,
    requestConfig: { ...observation.requestConfig, searchMode: "required" },
  }));
  const receipt = createFollowupComparisonReceipt({
    baselineObservations: baseline(),
    followupObservations: drifted,
  });

  assert.equal(receipt.comparable, false);
  assert.notEqual(receipt.baselineFingerprint, receipt.followupFingerprint);
});

test("a decorative or fabricated receipt cannot pass revalidation", () => {
  const inputs = { baselineObservations: baseline(), followupObservations: followup() };
  for (const receipt of [
    { comparable: true },
    {
      schemaVersion: 1,
      baselineFingerprint: "fabricated",
      followupFingerprint: "fabricated",
      comparable: true,
    },
  ]) {
    assert.throws(
      () => validateFollowupComparisonReceipt(receipt, inputs),
      (error) => error.code === "INVALID_COMPARISON_RECEIPT",
    );
  }
});
