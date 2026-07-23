import { VisibilityError } from "../visibility/visibility-error.mjs";
import { validatePromptPanel } from "../visibility/prompt-panel.mjs";
import { V1_PROMPT_PANEL, V1_PROMPT_PANEL_FINGERPRINT } from "./v1-panel.mjs";

export { V1_PROMPT_PANEL, V1_PROMPT_PANEL_FINGERPRINT } from "./v1-panel.mjs";

const plannedSurfaces = Object.freeze([
  Object.freeze({
    surfaceId: "openai_responses_web_search_auto",
    publicLabel: "OpenAI Responses API · web search auto",
    status: "disabled",
    executable: false,
  }),
  Object.freeze({
    surfaceId: "openai_responses_web_search_required",
    publicLabel: "OpenAI Responses API · web search required",
    status: "disabled",
    executable: false,
  }),
  Object.freeze({
    surfaceId: null,
    publicLabel: "Consumer web surface · supplier pending",
    status: "supplier_pending",
    executable: false,
  }),
]);

export const V1_INVESTIGATION_SCOPE = Object.freeze({
  projectId: "kamran-aghayev",
  promptCount: 15,
  language: "en",
  location: "US",
  cadenceDays: 3,
  plannedSurfaces,
  plannedSurfaceCount: plannedSurfaces.length,
  apiSurfaceIds: Object.freeze([
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
  ]),
  consumerSurfaceStatus: "supplier_pending",
  panelId: V1_PROMPT_PANEL.id,
  panelVersion: V1_PROMPT_PANEL.version,
  methodologyVersion: V1_PROMPT_PANEL.methodologyVersion,
  panelFingerprint: V1_PROMPT_PANEL_FINGERPRINT,
});

export function validateV1InvestigationScope(input) {
  const projectId = String(input?.projectId || "").trim();
  if (projectId !== V1_INVESTIGATION_SCOPE.projectId) {
    throw new VisibilityError("V1_PROJECT_MISMATCH", "The v1 project must be kamran-aghayev.");
  }
  if (input?.location !== V1_INVESTIGATION_SCOPE.location) {
    throw new VisibilityError("V1_LOCATION_MISMATCH", "The v1 location must be US.");
  }
  if (input?.cadenceDays !== V1_INVESTIGATION_SCOPE.cadenceDays) {
    throw new VisibilityError("V1_CADENCE_MISMATCH", "The v1 cadence must be every three days.");
  }
  const panel = validatePromptPanel(input?.panel);
  if (panel.prompts.length !== V1_INVESTIGATION_SCOPE.promptCount) {
    throw new VisibilityError("V1_PROMPT_COUNT_MISMATCH", "The v1 panel must contain exactly 15 prompts.");
  }
  if (panel.prompts.some(({ language }) => language !== V1_INVESTIGATION_SCOPE.language)) {
    throw new VisibilityError("V1_LANGUAGE_MISMATCH", "Every v1 prompt must be English.");
  }
  if (panel.id !== V1_PROMPT_PANEL.id) {
    throw new VisibilityError("V1_PANEL_ID_MISMATCH", "The v1 prompt-panel ID is frozen.");
  }
  if (panel.version !== V1_PROMPT_PANEL.version) {
    throw new VisibilityError("V1_PANEL_VERSION_MISMATCH", "The v1 prompt-panel version is frozen.");
  }
  if (panel.methodologyVersion !== V1_PROMPT_PANEL.methodologyVersion) {
    throw new VisibilityError("V1_METHODOLOGY_MISMATCH", "The v1 methodology version is frozen.");
  }
  if (panel.fingerprint !== V1_PROMPT_PANEL_FINGERPRINT) {
    throw new VisibilityError("V1_PANEL_FINGERPRINT_MISMATCH", "The v1 prompt content and order are frozen.");
  }
  return Object.freeze({
    projectId,
    location: input.location,
    cadenceDays: input.cadenceDays,
    panel: V1_PROMPT_PANEL,
  });
}

export function calculateV1ObservationVolume({ cycles, surfaceCount }) {
  if (!Number.isInteger(cycles) || cycles < 1 || !Number.isInteger(surfaceCount) || surfaceCount < 1) {
    throw new VisibilityError("INVALID_V1_VOLUME", "Cycles and surface count must be positive integers.");
  }
  if (surfaceCount !== V1_INVESTIGATION_SCOPE.plannedSurfaceCount) {
    throw new VisibilityError(
      "V1_SURFACE_COUNT_MISMATCH",
      "The v1 surface count must match the frozen planned surfaces.",
    );
  }
  return V1_INVESTIGATION_SCOPE.promptCount * cycles * surfaceCount;
}
