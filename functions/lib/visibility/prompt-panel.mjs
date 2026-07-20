import { VisibilityError } from "./visibility-error.mjs";

export const PROMPT_INTENTS = Object.freeze(["discovery", "comparison", "validation", "action"]);
export const PROMPT_LANGUAGES = Object.freeze(["ru", "en"]);

const freezePrompt = (prompt) => Object.freeze({ ...prompt });

export function validatePromptPanel(input) {
  if (!input || typeof input !== "object") {
    throw new VisibilityError("INVALID_PANEL", "Prompt panel must be an object.");
  }
  const id = String(input.id || "").trim();
  const methodologyVersion = String(input.methodologyVersion || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id)) {
    throw new VisibilityError("INVALID_PANEL_ID", "Prompt panel ID is invalid.");
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new VisibilityError("INVALID_PANEL_VERSION", "Prompt panel version must be a positive integer.");
  }
  if (!/^\d+\.\d+$/.test(methodologyVersion)) {
    throw new VisibilityError("INVALID_METHODOLOGY_VERSION", "Methodology version must use major.minor format.");
  }
  if (!Array.isArray(input.prompts) || input.prompts.length < 1 || input.prompts.length > 120) {
    throw new VisibilityError("INVALID_PROMPT_COUNT", "Prompt panel must contain between 1 and 120 prompts.");
  }

  const seen = new Set();
  const prompts = input.prompts.map((source, index) => {
    const prompt = {
      id: String(source?.id || "").trim(),
      text: String(source?.text || "").replace(/\s+/g, " ").trim(),
      language: String(source?.language || "").trim(),
      intent: String(source?.intent || "").trim(),
    };
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(prompt.id)) {
      throw new VisibilityError("INVALID_PROMPT_ID", "Prompt ID is invalid.", { index });
    }
    if (seen.has(prompt.id)) {
      throw new VisibilityError("DUPLICATE_PROMPT_ID", "Prompt IDs must be unique.", { promptId: prompt.id });
    }
    seen.add(prompt.id);
    if (!prompt.text || prompt.text.length > 600) {
      throw new VisibilityError("INVALID_PROMPT_TEXT", "Prompt text must contain 1 to 600 characters.", { promptId: prompt.id });
    }
    if (!PROMPT_LANGUAGES.includes(prompt.language)) {
      throw new VisibilityError("INVALID_PROMPT_LANGUAGE", "Prompt language is not supported.", { promptId: prompt.id });
    }
    if (!PROMPT_INTENTS.includes(prompt.intent)) {
      throw new VisibilityError("INVALID_PROMPT_INTENT", "Prompt intent is not supported.", { promptId: prompt.id });
    }
    return freezePrompt(prompt);
  });

  return Object.freeze({
    id,
    version: input.version,
    methodologyVersion,
    prompts: Object.freeze(prompts),
  });
}
