import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const current = new URL("../../docs/methodology/ai-visibility-investigation-v0.2.md", import.meta.url);
const historical = new URL("../../docs/methodology/ai-visibility-tracking-v0.1.md", import.meta.url);
const licensedCore = new URL("../../docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md", import.meta.url);

test("current methodology is investigation-first and narrows the why claim", async () => {
  const markdown = await readFile(current, "utf8");
  assert.match(markdown, /^# BLURSOR AI Visibility Investigation Methodology v0\.2/m);
  assert.match(markdown, /reconstructs the observable evidence path/i);
  assert.match(markdown, /does not claim access to a model's complete hidden reasoning/i);
  assert.match(markdown, /unresolved is a valid result/i);
  assert.doesNotMatch(markdown, /universal visibility score/i);
});

test("historical tracker documents point to the approved investigation design", async () => {
  const [methodology, design] = await Promise.all([
    readFile(historical, "utf8"),
    readFile(licensedCore, "utf8"),
  ]);
  for (const markdown of [methodology, design]) {
    assert.match(markdown, /2026-07-22-investigation-first-ai-visibility-diagnostics-design\.md/);
    assert.match(markdown, /historical/i);
  }
});
