import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PUBLIC_ENTRYPOINTS,
  PUBLIC_TOP_LEVEL_ALLOWLIST,
  assertPublicBundle,
  buildPublicBundle,
} from "../scripts/build-pages-public.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const exists = async (target) => access(target).then(() => true, () => false);

test("builds only the explicit public-site allowlist", async (t) => {
  const outputDirectory = await mkdtemp(path.join(repositoryRoot, ".pages-public-test-"));
  t.after(() => rm(outputDirectory, { recursive: true, force: true }));

  await buildPublicBundle({ repositoryRoot, outputDirectory });

  assert.deepEqual(
    (await readdir(outputDirectory)).sort(),
    [...PUBLIC_TOP_LEVEL_ALLOWLIST].sort(),
  );
  for (const entrypoint of PUBLIC_ENTRYPOINTS) {
    assert.equal(await exists(path.join(outputDirectory, entrypoint)), true, entrypoint);
  }
  for (const forbidden of [
    "docs",
    "tests",
    "functions",
    "scripts",
    "config",
    "supabase",
    "references",
    "screencaps",
    "site",
    "content_md",
    ".github",
    ".superpowers",
    ".env.example",
    "package.json",
    "investigation-dossier.html",
  ]) {
    assert.equal(await exists(path.join(outputDirectory, forbidden)), false, forbidden);
  }
});

test("bundle assertion rejects forbidden internal material", async (t) => {
  const outputDirectory = await mkdtemp(path.join(repositoryRoot, ".pages-public-test-"));
  t.after(() => rm(outputDirectory, { recursive: true, force: true }));

  await buildPublicBundle({ repositoryRoot, outputDirectory });
  await mkdir(path.join(outputDirectory, "docs"));
  await writeFile(path.join(outputDirectory, "docs", "private.md"), "internal\n");

  await assert.rejects(
    assertPublicBundle(outputDirectory),
    /forbidden public-bundle path/i,
  );
});

test("deploy workflow builds and deploys the generated public directory", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /pages deploy \.pages-public\b/);
  assert.doesNotMatch(workflow, /pages deploy \. --/);
});
