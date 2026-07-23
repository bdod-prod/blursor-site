import { validatePromptPanel } from "../visibility/prompt-panel.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";
import { V1_PROMPT_PANEL, V1_PROMPT_PANEL_FINGERPRINT } from "./v1-panel.mjs";

export function validatePanelFingerprint(value, identity = {}) {
  const fingerprint = String(value ?? "").trim();
  if (!fingerprint) {
    throw new VisibilityError("INVALID_PANEL_FINGERPRINT", "Prompt-panel fingerprint is required.");
  }
  let parsed;
  try {
    parsed = JSON.parse(fingerprint);
  } catch {
    throw new VisibilityError("INVALID_PANEL_FINGERPRINT", "Prompt-panel fingerprint must use the canonical identity serialization.");
  }
  let panel;
  try {
    panel = validatePromptPanel(parsed);
  } catch (error) {
    if (error instanceof VisibilityError) throw error;
    throw new VisibilityError("INVALID_PANEL_FINGERPRINT", "Prompt-panel fingerprint is invalid.");
  }
  if (
    parsed?.schema !== "prompt-panel-identity-v1"
    || panel.fingerprint !== fingerprint
    || panel.id !== identity.panelId
    || panel.version !== identity.panelVersion
    || panel.methodologyVersion !== identity.methodologyVersion
  ) {
    throw new VisibilityError("PANEL_IDENTITY_MISMATCH", "Prompt-panel identity does not match its canonical fingerprint.");
  }
  if (panel.id === V1_PROMPT_PANEL.id && fingerprint !== V1_PROMPT_PANEL_FINGERPRINT) {
    throw new VisibilityError("V1_PANEL_FINGERPRINT_MISMATCH", "The v1 prompt content and order are frozen.");
  }
  return Object.freeze({ fingerprint, panel });
}
