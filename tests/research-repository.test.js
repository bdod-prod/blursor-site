'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  discoverArticles,
  verifyPublishedState,
} = require('../scripts/lib/research-publication');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = new Set(['.git', '.worktrees', 'node_modules', 'references']);
const DATA_URI_PREFIX = 'data:image/svg+xml,';
const CANONICAL_FAVICON_SVG = [
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 18'>",
  "<rect width='7' height='18' rx='1' fill='#b73524'/>",
  "<circle cx='12' cy='5' r='2' fill='#b73524'/>",
  "<circle cx='12' cy='13' r='2' fill='#b73524'/>",
  '</svg>',
].join('');

function deployableHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) {
      return EXCLUDED_DIRS.has(entry.name)
        ? []
        : deployableHtmlFiles(path.join(directory, entry.name));
    }
    return entry.isFile() && entry.name.endsWith('.html')
      ? [path.join(directory, entry.name)]
      : [];
  });
}

test('every declared favicon uses the canonical all-red BLURSOR mark', () => {
  const declarations = [];

  for (const filePath of deployableHtmlFiles(ROOT_DIR)) {
    const html = fs.readFileSync(filePath, 'utf8');
    for (const linkTag of html.match(/<link\b[^>]*>/gi) || []) {
      const rel = /\brel=(["'])(.*?)\1/i.exec(linkTag)?.[2].toLowerCase().split(/\s+/);
      if (!rel?.includes('icon')) continue;
      const href = /\bhref=(["'])(.*?)\1/i.exec(linkTag)?.[2];
      declarations.push({ filePath, href });
    }
  }

  assert.ok(declarations.length > 0, 'expected at least one deployable favicon declaration');

  for (const { filePath, href } of declarations) {
    assert.ok(
      href?.startsWith(DATA_URI_PREFIX),
      `${path.relative(ROOT_DIR, filePath)}: favicon must be an inline SVG data URI`,
    );
    assert.equal(
      decodeURIComponent(href.slice(DATA_URI_PREFIX.length)),
      CANONICAL_FAVICON_SVG,
      `${path.relative(ROOT_DIR, filePath)}: favicon must preserve the canonical geometry and use #b73524 throughout`,
    );
  }
});

function extractClassLinkTargets(html, className) {
  return [...html.matchAll(
    new RegExp(`<a\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${className}\\b[^"']*\\1)[^>]*\\bhref=(["'])([^"']+)\\2[^>]*>`, 'g'),
  )].map(match => match[3]);
}

test('repository publishes one consistent 30-article research inventory', () => {
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  const home = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.equal(articles.length, 30);
  assert.deepEqual(
    extractClassLinkTargets(home, 'digest-row'),
    articles.slice(0, 3).map(article => `/research/${article.meta.slug}`),
  );
  const result = verifyPublishedState({ rootDir: ROOT_DIR, expectedArticles: articles });
  assert.equal(result.articleCount, 30);
  assert.equal(result.relatedLinkCount, 60);
});
