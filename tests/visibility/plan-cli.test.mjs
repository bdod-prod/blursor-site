import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const scriptPath = join(repoRoot, "scripts/plan-visibility-run.mjs");
const fixturePath = join(repoRoot, "tests/fixtures/visibility-plan-input.json");

const run = (args) => spawnSync(process.execPath, [scriptPath, ...args], {
  cwd: repoRoot,
  encoding: "utf8",
});

test("prints one valid JSON plan", () => {
  const result = run([fixturePath]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.observationCount, 4);
  assert.equal(plan.projectedCost.projectedMicrorub, 20_320_000);
  assert.equal(plan.observations.length, 4);
});

test("requires one input path", () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).code, "INPUT_PATH_REQUIRED");
  assert.equal(result.stdout, "");
});

test("returns a safe malformed-JSON error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blursor-plan-"));
  const path = join(dir, "bad.json");
  await writeFile(path, "{bad", "utf8");
  const result = run([path]);
  const error = JSON.parse(result.stderr);
  assert.equal(result.status, 1);
  assert.equal(error.code, "INVALID_INPUT_JSON");
  assert.equal(result.stderr.includes("stack"), false);
  assert.equal(result.stdout, "");
});

test("does not leak input secrets when a surface is unauthorized", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blursor-plan-"));
  const input = JSON.parse(await readFile(fixturePath, "utf8"));
  input.surfaceId = "alice_pro_ui";
  input.providerSecret = "must-not-appear";
  const path = join(dir, "unauthorized.json");
  await writeFile(path, JSON.stringify(input), "utf8");
  const result = run([path]);
  const error = JSON.parse(result.stderr);
  assert.equal(result.status, 1);
  assert.equal(error.code, "SURFACE_NOT_AUTHORIZED");
  assert.equal(result.stderr.includes("must-not-appear"), false);
  assert.equal(result.stderr.includes("providerSecret"), false);
  assert.equal(result.stderr.includes("stack"), false);
});
