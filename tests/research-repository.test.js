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
