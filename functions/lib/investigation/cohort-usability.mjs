import { VisibilityError } from "../visibility/visibility-error.mjs";
import { normalizeObservation } from "./observation-model.mjs";

const MINIMUM_USABLE_CYCLES = 3;
const OUTCOME_STATES = new Set(["closed_supported", "closed_weakened", "closed_unresolved"]);
const CONCLUSIVE_STATES = new Set(["closed_supported", "closed_weakened"]);

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

const identityKey = ({ surfaceId, promptId }) => JSON.stringify({ surfaceId, promptId });

export const isUsableObservation = (observation) => (
  observation?.state === "success" && observation?.reviewStatus === "reviewed"
);

const normalizeRecord = (source) => {
  const wrapped = source && typeof source === "object" && Object.hasOwn(source, "observation");
  return {
    observation: normalizeObservation(wrapped ? source.observation : source),
    extraction: wrapped ? source.extraction : null,
  };
};

export function evaluateUsableCycles(
  records,
  receipt,
  { field = "observations", requireCompleteExtraction = false } = {},
) {
  if (!Array.isArray(records)) {
    throw new VisibilityError("INVALID_USABLE_COHORT", `${field} must be an observation-record array.`);
  }
  if (
    !Array.isArray(receipt?.repeatOrdinals)
    || !Array.isArray(receipt?.surfaceIds)
    || !Array.isArray(receipt?.promptIds)
  ) {
    throw new VisibilityError("INVALID_USABLE_COHORT", "A validated expected-cohort receipt is required.");
  }

  const usableByOrdinal = new Map(receipt.repeatOrdinals.map((ordinal) => [ordinal, new Set()]));
  for (const source of records) {
    const { observation, extraction } = normalizeRecord(source);
    const usable = isUsableObservation(observation)
      && (!requireCompleteExtraction || extraction?.extractionState === "complete");
    if (usable && usableByOrdinal.has(observation.repeatOrdinal)) {
      usableByOrdinal.get(observation.repeatOrdinal).add(identityKey(observation));
    }
  }

  const completeCycleOrdinals = receipt.repeatOrdinals.filter((repeatOrdinal) => {
    const identities = usableByOrdinal.get(repeatOrdinal);
    return receipt.surfaceIds.every((surfaceId) => receipt.promptIds.every((promptId) => (
      identities.has(identityKey({ surfaceId, promptId }))
    )));
  });
  return deepFreeze({
    field,
    usableCycles: completeCycleOrdinals.length,
    completeCycleOrdinals,
    minimumUsableCycles: MINIMUM_USABLE_CYCLES,
    sufficient: completeCycleOrdinals.length >= MINIMUM_USABLE_CYCLES,
  });
}

export function validateClosureUsability({
  closureState,
  baselineRecords,
  followupRecords,
  receipt,
  requireCompleteExtraction = false,
} = {}) {
  if (!OUTCOME_STATES.has(closureState)) {
    throw new VisibilityError("INVALID_CLOSURE_STATE", "Usable-cycle validation requires a closed investigation outcome.");
  }
  const baseline = evaluateUsableCycles(baselineRecords, receipt, {
    field: "baselineObservations",
    requireCompleteExtraction,
  });
  const followup = evaluateUsableCycles(followupRecords, receipt, {
    field: "followupObservations",
    requireCompleteExtraction,
  });
  const sufficient = baseline.sufficient && followup.sufficient;
  if (CONCLUSIVE_STATES.has(closureState) && !sufficient) {
    throw new VisibilityError(
      "INSUFFICIENT_USABLE_CYCLES",
      "Supported and weakened closure require at least three complete usable cycles in both windows.",
      {
        baselineUsableCycles: baseline.usableCycles,
        followupUsableCycles: followup.usableCycles,
      },
    );
  }
  return deepFreeze({ baseline, followup, sufficient });
}
