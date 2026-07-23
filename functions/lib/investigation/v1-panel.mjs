import { validatePromptPanel } from "../visibility/prompt-panel.mjs";

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
