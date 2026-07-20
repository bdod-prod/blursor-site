import { VisibilityError } from "./visibility-error.mjs";
import { assertVisibilitySurfaceAllowed } from "./surface-registry.mjs";
import { validatePromptPanel } from "./prompt-panel.mjs";
import { assertRunWithinBudgets, estimateRunCostMicrorub } from "./cost-model.mjs";

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeProjectId(value) {
  const projectId = String(value || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(projectId)) {
    throw new VisibilityError("INVALID_PROJECT_ID", "Project ID is invalid.");
  }
  return projectId;
}

function normalizeSchedule(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new VisibilityError("INVALID_SCHEDULE", "Run schedule must be a valid timestamp.");
  }
  return date.toISOString();
}

export async function planVisibilityRun(input) {
  const projectId = normalizeProjectId(input?.projectId);
  const panel = validatePromptPanel(input?.panel);
  const purpose = input?.purpose || "production";
  const surface = assertVisibilitySurfaceAllowed(input?.surfaceId, purpose);
  const repeatCount = input?.repeatCount;
  if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 5) {
    throw new VisibilityError("INVALID_REPEAT_COUNT", "Repeat count must be an integer from 1 to 5.");
  }
  const scheduledFor = normalizeSchedule(input?.scheduledFor);
  const observationCount = panel.prompts.length * repeatCount;
  const projectedMicrorub = estimateRunCostMicrorub({
    surface,
    observationCount,
    estimatedTokensPerObservation: input?.estimatedTokensPerObservation ?? null,
  });
  const cost = assertRunWithinBudgets({
    projectedMicrorub,
    projectSpentMicrorub: input.projectSpentMicrorub,
    projectBudgetMicrorub: input.projectBudgetMicrorub,
    globalSpentMicrorub: input.globalSpentMicrorub,
    globalBudgetMicrorub: input.globalBudgetMicrorub,
  });

  const observations = [];
  for (const prompt of panel.prompts) {
    for (let repeatOrdinal = 1; repeatOrdinal <= repeatCount; repeatOrdinal += 1) {
      const keySource = [
        "visibility-plan-v1",
        projectId,
        panel.id,
        panel.version,
        surface.id,
        scheduledFor,
        prompt.id,
        repeatOrdinal,
      ].join("|");
      observations.push(Object.freeze({
        sequence: observations.length + 1,
        promptId: prompt.id,
        language: prompt.language,
        intent: prompt.intent,
        repeatOrdinal,
        idempotencyKey: await sha256Hex(keySource),
      }));
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    projectId,
    panelId: panel.id,
    panelVersion: panel.version,
    methodologyVersion: panel.methodologyVersion,
    surfaceId: surface.id,
    surfaceLabel: surface.publicLabel,
    purpose,
    scheduledFor,
    repeatCount,
    observationCount,
    projectedCost: Object.freeze({ currency: "RUB", ...cost }),
    observations: Object.freeze(observations),
  });
}
