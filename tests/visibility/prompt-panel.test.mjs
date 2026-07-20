import test from "node:test";
import assert from "node:assert/strict";

import { validatePromptPanel } from "../../functions/lib/visibility/prompt-panel.mjs";

const VALID_PANEL = {
  id: "ru-saas-pilot",
  version: 1,
  methodologyVersion: "0.1",
  prompts: [
    { id: "discovery-01", text: "Какие сервисы помогают проверить видимость бренда в ответах ИИ?", language: "ru", intent: "discovery" },
    { id: "comparison-01", text: "Compare AI visibility tracking tools for a Russian company.", language: "en", intent: "comparison" },
  ],
};

test("normalizes and deeply freezes a valid panel", () => {
  const input = structuredClone(VALID_PANEL);
  input.prompts[0].text = "  Какие  сервисы помогают проверить видимость бренда в ответах ИИ?  ";
  const panel = validatePromptPanel(input);

  assert.equal(panel.prompts[0].text, "Какие сервисы помогают проверить видимость бренда в ответах ИИ?");
  assert.equal(Object.isFrozen(panel), true);
  assert.equal(Object.isFrozen(panel.prompts), true);
  assert.equal(Object.isFrozen(panel.prompts[0]), true);
  assert.throws(() => {
    panel.prompts[0].text = "changed";
  }, TypeError);
  input.prompts[0].text = "caller mutation";
  assert.notEqual(panel.prompts[0].text, input.prompts[0].text);
});

test("rejects an invalid panel identity and version", () => {
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, id: "" }),
    (error) => error.code === "INVALID_PANEL_ID",
  );
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, version: 1.5 }),
    (error) => error.code === "INVALID_PANEL_VERSION",
  );
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, methodologyVersion: "v1" }),
    (error) => error.code === "INVALID_METHODOLOGY_VERSION",
  );
});

test("rejects duplicate prompt IDs", () => {
  const prompts = [VALID_PANEL.prompts[0], { ...VALID_PANEL.prompts[1], id: "discovery-01" }];
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts }),
    (error) => error.code === "DUPLICATE_PROMPT_ID",
  );
});

test("rejects unsupported prompt fields", () => {
  const invalidCases = [
    [{ ...VALID_PANEL.prompts[0], id: "?" }, "INVALID_PROMPT_ID"],
    [{ ...VALID_PANEL.prompts[0], text: "  " }, "INVALID_PROMPT_TEXT"],
    [{ ...VALID_PANEL.prompts[0], text: "x".repeat(601) }, "INVALID_PROMPT_TEXT"],
    [{ ...VALID_PANEL.prompts[0], language: "de" }, "INVALID_PROMPT_LANGUAGE"],
    [{ ...VALID_PANEL.prompts[0], intent: "awareness" }, "INVALID_PROMPT_INTENT"],
  ];
  for (const [prompt, code] of invalidCases) {
    assert.throws(
      () => validatePromptPanel({ ...VALID_PANEL, prompts: [prompt] }),
      (error) => error.code === code,
    );
  }
});

test("enforces the prompt count boundary", () => {
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts: [] }),
    (error) => error.code === "INVALID_PROMPT_COUNT",
  );
  const prompts = Array.from({ length: 121 }, (_, index) => ({
    id: `prompt-${String(index + 1).padStart(3, "0")}`,
    text: `Prompt ${index + 1}`,
    language: "en",
    intent: "discovery",
  }));
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts }),
    (error) => error.code === "INVALID_PROMPT_COUNT",
  );
});
