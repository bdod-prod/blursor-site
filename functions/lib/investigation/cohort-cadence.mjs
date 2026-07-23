import { VisibilityError } from "../visibility/visibility-error.mjs";
import { normalizeObservation } from "./observation-model.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateCohortCadence(
  observations,
  { cadenceDays, repeatOrdinals, field = "observations" } = {},
) {
  if (!Number.isInteger(cadenceDays) || cadenceDays < 1) {
    throw new VisibilityError("INVALID_COHORT_CADENCE", "Cohort cadence must be a positive number of days.");
  }
  if (!Array.isArray(repeatOrdinals) || repeatOrdinals.some((ordinal) => !Number.isInteger(ordinal))) {
    throw new VisibilityError("INVALID_COHORT_CADENCE", "Expected repeat ordinals are required for cadence validation.");
  }

  const expectedOrdinals = new Set(repeatOrdinals);
  const scheduledByOrdinal = new Map();
  for (const source of observations || []) {
    const observation = normalizeObservation(source);
    if (!expectedOrdinals.has(observation.repeatOrdinal)) {
      throw new VisibilityError("INVALID_COHORT_CADENCE", `${field} contains an unexpected repeat ordinal.`);
    }
    const scheduledMs = new Date(observation.scheduledAt).getTime();
    const prior = scheduledByOrdinal.get(observation.repeatOrdinal);
    if (prior != null && prior !== scheduledMs) {
      throw new VisibilityError(
        "INVALID_COHORT_CADENCE",
        `${field} assigns more than one scheduled timestamp to the same collection cycle.`,
      );
    }
    scheduledByOrdinal.set(observation.repeatOrdinal, scheduledMs);
  }

  const present = [...scheduledByOrdinal.entries()].sort(([left], [right]) => left - right);
  for (let index = 1; index < present.length; index += 1) {
    const [priorOrdinal, priorMs] = present[index - 1];
    const [ordinal, scheduledMs] = present[index];
    const expectedGap = (ordinal - priorOrdinal) * cadenceDays * DAY_MS;
    if (scheduledMs - priorMs !== expectedGap) {
      throw new VisibilityError(
        "INVALID_COHORT_CADENCE",
        `${field} does not preserve the frozen every-${cadenceDays}-days cadence.`,
      );
    }
  }

  return Object.freeze({
    cadenceDays,
    scheduledCycles: Object.freeze(present.map(([repeatOrdinal, scheduledMs]) => Object.freeze({
      repeatOrdinal,
      scheduledAt: new Date(scheduledMs).toISOString(),
    }))),
  });
}
