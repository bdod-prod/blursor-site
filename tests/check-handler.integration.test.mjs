import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIXTURE = fileURLToPath(new URL("./fixtures/run-check-handler.mjs", import.meta.url));

test("the real check handler persists a sanitized successful snapshot", () => {
  const run = spawnSync(process.execPath, ["--experimental-default-type=module", FIXTURE], {
    cwd: ROOT,
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const receipt = JSON.parse(run.stdout);
  assert.deepEqual(receipt, {
    ok: true,
    status: 200,
    cacheControl: "no-store",
    httpStatus: 200,
    renderDelta: { available: false, rawTextChars: 146, renderedTextChars: null, missingPercent: null },
    capture: { status: "stored" },
    report: {
      id: "7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a",
      url: "https://blursor.ai/r/7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a",
    },
    fetchCalls: 10,
    storedRows: 1,
    storedTarget: "https://example.com/page",
    storedFinal: "https://example.com/page",
    storedScreenshot: false,
    storedBotCount: 16,
  });
});
