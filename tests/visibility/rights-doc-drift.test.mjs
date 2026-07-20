import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { VISIBILITY_SURFACES } from "../../functions/lib/visibility/surface-registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const registerPath = resolve(here, "../../docs/ops/provider-rights-register.md");

function assertRegistryAligned(markdown) {
  const lines = markdown.split("\n");
  for (const surface of Object.values(VISIBILITY_SURFACES)) {
    const row = lines.find((line) => line.includes(`| \`${surface.id}\` |`));
    assert.ok(row, `missing rights row for ${surface.id}`);
    assert.ok(row.includes(`| \`${surface.rightsState}\``), `wrong rights state for ${surface.id}`);
  }
  const normalized = markdown.replaceAll("`", "").replace(/\s+/g, " ");
  assert.ok(normalized.includes("Only production_authorized surfaces may be scheduled or included in paid reports"));
}

test("executable surface states match the rights register", async () => {
  assertRegistryAligned(await readFile(registerPath, "utf8"));
});

test("drift checker fails when a registered surface disappears", async () => {
  const markdown = await readFile(registerPath, "utf8");
  const damaged = markdown.replace("`yandex_gen_search_api_ru`", "`yandex_gen_search_api_ru_drifted`");
  assert.throws(() => assertRegistryAligned(damaged), /missing rights row/);
});
