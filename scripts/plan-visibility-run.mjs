import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { VisibilityError } from "../functions/lib/visibility/visibility-error.mjs";
import { planVisibilityRun } from "../functions/lib/visibility/run-planner.mjs";

function fail(code, message) {
  process.stderr.write(`${JSON.stringify({ ok: false, code, error: message })}\n`);
  process.exitCode = 1;
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail("INPUT_PATH_REQUIRED", "Pass one visibility plan JSON file.");
} else {
  try {
    let input;
    try {
      input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
    } catch {
      throw new VisibilityError("INVALID_INPUT_JSON", "Visibility plan input must be valid JSON.");
    }
    const plan = await planVisibilityRun(input);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } catch (error) {
    if (error instanceof VisibilityError) fail(error.code, error.message);
    else fail("INTERNAL_PLANNING_ERROR", "Visibility planning failed.");
  }
}
