import { VisibilityError } from "./visibility-error.mjs";

export const RUB_MICRO = 1_000_000;

function assertNonNegativeSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new VisibilityError("INVALID_COST_INPUT", `${name} must be a non-negative safe integer.`, { name });
  }
}

function checkedMultiply(left, right, name) {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new VisibilityError("COST_OVERFLOW", `${name} exceeds safe integer precision.`, { name });
  }
  return result;
}

function checkedAdd(left, right, name) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new VisibilityError("COST_OVERFLOW", `${name} exceeds safe integer precision.`, { name });
  }
  return result;
}

export function estimateRunCostMicrorub({ surface, observationCount, estimatedTokensPerObservation = null }) {
  assertNonNegativeSafeInteger(observationCount, "observationCount");
  if (!surface?.pricing) {
    throw new VisibilityError("PRICING_UNAVAILABLE", "Surface pricing is unavailable.", { surfaceId: surface?.id });
  }
  if (surface.pricing.kind === "per_request") {
    return checkedMultiply(observationCount, surface.pricing.microrubPerRequest, "requestCost");
  }
  if (surface.pricing.kind === "per_1000_tokens") {
    assertNonNegativeSafeInteger(estimatedTokensPerObservation, "estimatedTokensPerObservation");
    const totalTokens = checkedMultiply(observationCount, estimatedTokensPerObservation, "totalTokens");
    const numerator = checkedMultiply(totalTokens, surface.pricing.microrubPer1000Tokens, "tokenCost");
    return Math.ceil(numerator / 1000);
  }
  throw new VisibilityError("UNSUPPORTED_PRICING", "Surface pricing kind is unsupported.", { kind: surface.pricing.kind });
}

export function assertRunWithinBudgets({
  projectedMicrorub,
  projectSpentMicrorub,
  projectBudgetMicrorub,
  globalSpentMicrorub,
  globalBudgetMicrorub,
}) {
  for (const [name, value] of Object.entries({
    projectedMicrorub,
    projectSpentMicrorub,
    projectBudgetMicrorub,
    globalSpentMicrorub,
    globalBudgetMicrorub,
  })) {
    assertNonNegativeSafeInteger(value, name);
  }
  const projectTotalMicrorub = checkedAdd(projectSpentMicrorub, projectedMicrorub, "projectTotalMicrorub");
  const globalTotalMicrorub = checkedAdd(globalSpentMicrorub, projectedMicrorub, "globalTotalMicrorub");
  if (projectTotalMicrorub > projectBudgetMicrorub) {
    throw new VisibilityError("PROJECT_BUDGET_EXCEEDED", "Planned run exceeds the project budget.");
  }
  if (globalTotalMicrorub > globalBudgetMicrorub) {
    throw new VisibilityError("GLOBAL_BUDGET_EXCEEDED", "Planned run exceeds the global budget.");
  }
  return Object.freeze({
    projectedMicrorub,
    projectRemainingMicrorub: projectBudgetMicrorub - projectTotalMicrorub,
    globalRemainingMicrorub: globalBudgetMicrorub - globalTotalMicrorub,
  });
}

export function formatRub(microrub) {
  assertNonNegativeSafeInteger(microrub, "microrub");
  return `${(microrub / RUB_MICRO).toFixed(2)} ₽`;
}
