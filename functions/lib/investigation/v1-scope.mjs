import { validatePromptPanel } from "../visibility/prompt-panel.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";

const V1_PROMPT_TEXTS = Object.freeze([
  "Which public sources help evaluate minimally invasive spine surgeons in the United States?",
  "What information should someone compare when researching a spine surgeon in the United States?",
  "Which websites commonly document a surgeon's professional background?",
  "How can someone verify a spine surgeon's areas of practice from public information?",
  "What makes a surgeon's website understandable to AI search systems?",
  "Which public evidence is useful when comparing spine surgery specialists?",
  "Compare the types of evidence found on hospital, directory, and surgeon websites.",
  "What public sources are commonly cited when AI systems describe medical specialists?",
  "How should professional credentials be represented consistently across the web?",
  "What can make two public profiles of the same surgeon appear inconsistent?",
  "What does the public web say about Dr. Kamran Aghayev's professional focus?",
  "Which public pages describe Dr. Kamran Aghayev's services?",
  "Are Dr. Kamran Aghayev's public professional profiles consistent with his website?",
  "What public page should be improved first when a surgeon is missing from an AI answer?",
  "How should a website change be evaluated after an AI visibility intervention?",
]);

export const V1_PROMPT_PANEL = validatePromptPanel({
  id: "kamran-us-en-v1",
  version: 1,
  methodologyVersion: "0.2",
  prompts: V1_PROMPT_TEXTS.map((text, index) => ({
    id: `prompt-${String(index + 1).padStart(2, "0")}`,
    text,
    language: "en",
    intent: index < 6 ? "discovery" : index < 10 ? "comparison" : index < 13 ? "validation" : "action",
  })),
});

export const V1_PROMPT_PANEL_FINGERPRINT = V1_PROMPT_PANEL.fingerprint;

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
  return Object.freeze({ projectId, location: input.location, cadenceDays: input.cadenceDays, panel });
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
