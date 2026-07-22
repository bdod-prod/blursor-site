import { VisibilityError } from "../visibility/visibility-error.mjs";
import { normalizeObservation } from "./observation-model.mjs";

const RECEIPT_SCHEMA_VERSION = 1;

const canonicalObservationIdentity = (observation) => JSON.stringify({
  projectId: observation.projectId,
  panelId: observation.panelId,
  panelVersion: observation.panelVersion,
  methodologyVersion: observation.methodologyVersion,
  panelFingerprint: observation.panelFingerprint,
  promptId: observation.promptId,
  repeatOrdinal: observation.repeatOrdinal,
  surfaceId: observation.surfaceId,
  surfaceLabel: observation.surfaceLabel,
  collectionClass: observation.collectionClass,
  synthetic: observation.synthetic,
  adapterVersion: observation.adapterVersion,
  supplierVersion: observation.supplierVersion,
  extractorVersion: observation.extractorVersion,
  requestConfig: observation.requestConfig,
});

const cohortFingerprint = (observations, field) => {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new VisibilityError("INVALID_COMPARISON_COHORT", `${field} must contain normalized observations.`);
  }
  const identities = observations.map((observation) => canonicalObservationIdentity(normalizeObservation(observation))).sort();
  if (new Set(identities).size !== identities.length) {
    throw new VisibilityError("DUPLICATE_COMPARISON_OBSERVATION", `${field} contains duplicate observation identities.`);
  }
  return JSON.stringify({ schema: "observation-cohort-identity-v1", observations: identities });
};

const freezeReceipt = (receipt) => Object.freeze({ ...receipt });

export function createFollowupComparisonReceipt({ baselineObservations, followupObservations } = {}) {
  const baselineFingerprint = cohortFingerprint(baselineObservations, "baselineObservations");
  const followupFingerprint = cohortFingerprint(followupObservations, "followupObservations");
  return freezeReceipt({
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    baselineFingerprint,
    followupFingerprint,
    comparable: baselineFingerprint === followupFingerprint,
  });
}

export function assertStoredComparisonReceipt(receipt) {
  if (
    !receipt
    || typeof receipt !== "object"
    || receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION
    || typeof receipt.baselineFingerprint !== "string"
    || !receipt.baselineFingerprint
    || typeof receipt.followupFingerprint !== "string"
    || !receipt.followupFingerprint
    || typeof receipt.comparable !== "boolean"
    || receipt.comparable !== (receipt.baselineFingerprint === receipt.followupFingerprint)
  ) {
    throw new VisibilityError("INVALID_COMPARISON_RECEIPT", "Follow-up comparison receipt is invalid.");
  }
  return freezeReceipt(receipt);
}

export function validateFollowupComparisonReceipt(receipt, inputs) {
  const supplied = assertStoredComparisonReceipt(receipt);
  const derived = createFollowupComparisonReceipt(inputs);
  if (
    supplied.baselineFingerprint !== derived.baselineFingerprint
    || supplied.followupFingerprint !== derived.followupFingerprint
    || supplied.comparable !== derived.comparable
  ) {
    throw new VisibilityError("INVALID_COMPARISON_RECEIPT", "Follow-up comparison receipt does not match the observation cohorts.");
  }
  return derived;
}
