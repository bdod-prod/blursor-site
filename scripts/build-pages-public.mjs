import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PUBLIC_TOP_LEVEL_ALLOWLIST = Object.freeze([
  "index.html",
  "ai-crawler-checker.html",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "assets",
  "images",
  "author",
  "research",
]);

export const PUBLIC_ENTRYPOINTS = Object.freeze([
  "index.html",
  "ai-crawler-checker.html",
  "author/alex-rostovtsev.html",
  "research/index.html",
  "research/feed.xml",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
]);

const FORBIDDEN_TOP_LEVEL = Object.freeze(new Set([
  ".git",
  ".github",
  ".superpowers",
  "config",
  "content_md",
  "docs",
  "functions",
  "references",
  "screencaps",
  "scripts",
  "site",
  "supabase",
  "tests",
]));

const FORBIDDEN_BASENAMES = Object.freeze(new Set([
  ".env",
  ".env.example",
  "package.json",
  "investigation-dossier.html",
]));

const FORBIDDEN_EXTENSIONS = Object.freeze(new Set([
  ".md",
  ".mjs",
  ".js",
  ".json",
  ".sql",
  ".yml",
  ".yaml",
]));

const exists = async (target) => stat(target).then(() => true, () => false);

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await listFiles(path.join(directory, entry.name), relative));
    } else if (entry.isFile()) {
      paths.push(relative);
    } else {
      throw new Error(`Unsupported public-bundle entry: ${relative}`);
    }
  }
  return paths;
}

export async function assertPublicBundle(outputDirectory) {
  const topLevel = await readdir(outputDirectory);
  for (const name of topLevel) {
    if (!PUBLIC_TOP_LEVEL_ALLOWLIST.includes(name) || FORBIDDEN_TOP_LEVEL.has(name)) {
      throw new Error(`Forbidden public-bundle path: ${name}`);
    }
  }

  for (const entrypoint of PUBLIC_ENTRYPOINTS) {
    if (!await exists(path.join(outputDirectory, entrypoint))) {
      throw new Error(`Missing public entrypoint: ${entrypoint}`);
    }
  }

  for (const relative of await listFiles(outputDirectory)) {
    const basename = path.posix.basename(relative);
    const extension = path.posix.extname(relative).toLowerCase();
    if (
      FORBIDDEN_BASENAMES.has(basename)
      || basename.startsWith(".env")
      || FORBIDDEN_EXTENSIONS.has(extension)
    ) {
      throw new Error(`Forbidden public-bundle path: ${relative}`);
    }
  }

  return Object.freeze({
    topLevel: Object.freeze([...topLevel].sort()),
    entrypoints: PUBLIC_ENTRYPOINTS,
  });
}

export async function buildPublicBundle({ repositoryRoot, outputDirectory }) {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedOutput = path.resolve(outputDirectory);
  if (resolvedOutput === resolvedRoot || !resolvedOutput.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Public output must be a generated directory inside the repository.");
  }

  await rm(resolvedOutput, { recursive: true, force: true });
  await mkdir(resolvedOutput, { recursive: true });
  for (const entry of PUBLIC_TOP_LEVEL_ALLOWLIST) {
    const source = path.join(resolvedRoot, entry);
    if (!await exists(source)) throw new Error(`Missing allowlisted public source: ${entry}`);
    await cp(source, path.join(resolvedOutput, entry), { recursive: true, errorOnExist: true });
  }
  return assertPublicBundle(resolvedOutput);
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === modulePath) {
  const repositoryRoot = path.resolve(path.dirname(modulePath), "..");
  const outputDirectory = path.join(repositoryRoot, ".pages-public");
  await buildPublicBundle({ repositoryRoot, outputDirectory });
  process.stdout.write(`Built validated public bundle at ${pathToFileURL(outputDirectory).pathname}\n`);
}
