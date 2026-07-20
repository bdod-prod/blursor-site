import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHECKER = new URL("../functions/api/check.js", import.meta.url);

test("successful checks are captured only after the complete result is built", async () => {
  const source = await readFile(CHECKER, "utf8");

  assert.match(source, /import \{ calculateRenderDelta \} from "\.\.\/lib\/report-model\.mjs";/);
  assert.match(source, /import \{ captureReport \} from "\.\.\/lib\/report-store\.mjs";/);
  assert.match(source, /const result = \{/);
  assert.match(source, /httpStatus: baseline\.status/);
  assert.match(source, /renderDelta: calculateRenderDelta\(rawPage, renderedPage\)/);
  assert.match(source, /await captureReport\(result, env, \{ origin: reqUrl\.origin \}\)/);
  assert.match(source, /return json\(\{ \.\.\.result, \.\.\.captured \}\)/);

  const resultAt = source.indexOf("const result = {");
  const captureAt = source.indexOf("await captureReport(result");
  const responseAt = source.indexOf("return json({ ...result, ...captured })");
  assert.ok(resultAt > -1 && resultAt < captureAt && captureAt < responseAt);
});

test("error responses are not written as successful stored reports", async () => {
  const source = await readFile(CHECKER, "utf8");
  const successStart = source.indexOf("const result = {");
  const captureAt = source.indexOf("await captureReport(result");

  assert.ok(successStart > source.lastIndexOf("return json({ ok: false", successStart));
  assert.ok(captureAt > successStart);
  assert.equal((source.match(/captureReport\(/g) || []).length, 1);
});

test("check responses are not edge-cached around the capture layer", async () => {
  const source = await readFile(CHECKER, "utf8");

  assert.match(source, /const cache = "no-store";/);
  assert.doesNotMatch(source, /public, max-age=300/);
});
