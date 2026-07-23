import { VisibilityError } from "../visibility/visibility-error.mjs";
import { normalizeObservation } from "./observation-model.mjs";
import { validatePanelFingerprint } from "./panel-identity.mjs";

const SCHEMA_VERSION = 1;

const freeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
};

const identityKey = ({ promptId, surfaceId, repeatOrdinal }) => JSON.stringify({
  promptId,
  surfaceId,
  repeatOrdinal,
});

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function createExpectedCohortReceipt({
  panelId,
  panelVersion,
  methodologyVersion,
  panelFingerprint,
  surfaces,
  cycleCount,
} = {}) {
  const { panel } = validatePanelFingerprint(panelFingerprint, { panelId, panelVersion, methodologyVersion });
  if (!Array.isArray(surfaces) || surfaces.length === 0 || new Set(surfaces).size !== surfaces.length) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT", "Expected cohort surfaces must be distinct.");
  }
  if (!Number.isInteger(cycleCount) || cycleCount < 1) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT", "Expected cohort cycle count must be positive.");
  }
  const promptIds = panel.prompts.map(({ id }) => id);
  const surfaceIds = [...surfaces];
  const repeatOrdinals = Array.from({ length: cycleCount }, (_, index) => index + 1);
  const expectedIdentities = repeatOrdinals.flatMap((repeatOrdinal) => surfaceIds.flatMap((surfaceId) => (
    promptIds.map((promptId) => identityKey({ promptId, surfaceId, repeatOrdinal }))
  )));
  const shapeFingerprint = JSON.stringify({
    schema: "expected-observation-cohort-v1",
    panelFingerprint,
    promptIds,
    surfaceIds,
    repeatOrdinals,
    expectedIdentities,
  });
  return freeze({
    schemaVersion: SCHEMA_VERSION,
    panelFingerprint,
    promptIds,
    surfaceIds,
    repeatOrdinals,
    expectedIdentities,
    expectedCount: expectedIdentities.length,
    shapeFingerprint,
  });
}

export function validateExpectedCohortReceipt(receipt, identity) {
  if (!receipt || typeof receipt !== "object" || receipt.schemaVersion !== SCHEMA_VERSION) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT_RECEIPT", "Expected cohort receipt is invalid.");
  }
  if (receipt.panelFingerprint !== identity?.panelFingerprint) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT_RECEIPT", "Expected cohort receipt does not match the case panel fingerprint.");
  }
  const derived = createExpectedCohortReceipt({
    ...identity,
    panelFingerprint: receipt.panelFingerprint,
    surfaces: receipt.surfaceIds,
    cycleCount: receipt.repeatOrdinals?.length,
  });
  for (const field of [
    "panelFingerprint", "promptIds", "surfaceIds", "repeatOrdinals", "expectedIdentities",
    "expectedCount", "shapeFingerprint",
  ]) {
    if (!same(receipt[field], derived[field])) {
      throw new VisibilityError("INVALID_EXPECTED_COHORT_RECEIPT", "Expected cohort receipt does not match the frozen case scope.");
    }
  }
  if (!same(receipt.surfaceIds, identity.surfaces) || receipt.repeatOrdinals.length !== identity.cycleCount) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT_RECEIPT", "Expected cohort receipt does not match the frozen case scope.");
  }
  return derived;
}

export function evaluateCohortAgainstExpectation(observations, receipt, { field = "observations", requireComplete = false } = {}) {
  if (!Array.isArray(observations)) {
    throw new VisibilityError("INVALID_EXPECTED_COHORT", `${field} must be an observation array.`);
  }
  const expected = new Set(receipt.expectedIdentities);
  const present = new Set();
  for (const source of observations) {
    const observation = normalizeObservation(source);
    if (observation.panelFingerprint !== receipt.panelFingerprint) {
      throw new VisibilityError("PANEL_IDENTITY_MISMATCH", `${field} contains a mismatched prompt-panel fingerprint.`);
    }
    const key = identityKey(observation);
    if (!expected.has(key)) {
      throw new VisibilityError("UNEXPECTED_COHORT_OBSERVATION", `${field} contains an observation outside the expected cohort.`);
    }
    if (present.has(key)) {
      throw new VisibilityError("DUPLICATE_COHORT_IDENTITY", `${field} contains a duplicate expected observation identity.`);
    }
    present.add(key);
  }
  const omittedIdentities = receipt.expectedIdentities.filter((key) => !present.has(key));
  if (requireComplete && omittedIdentities.length > 0) {
    throw new VisibilityError("INCOMPLETE_EXPECTED_COHORT", `${field} omits expected observation identities.`, {
      expected: receipt.expectedCount,
      observed: present.size,
      omitted: omittedIdentities.length,
    });
  }
  return freeze({
    expected: receipt.expectedCount,
    observed: present.size,
    omitted: omittedIdentities.length,
    omittedIdentities,
    complete: omittedIdentities.length === 0,
  });
}
