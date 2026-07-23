'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  discoverArticles,
  verifyPublishedState,
} = require('../scripts/lib/research-publication');

const ROOT_DIR = path.resolve(__dirname, '..');

test('repository publishes one consistent 30-article research inventory', () => {
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  assert.equal(articles.length, 30);
  const result = verifyPublishedState({ rootDir: ROOT_DIR, expectedArticles: articles });
  assert.equal(result.articleCount, 30);
  assert.equal(result.relatedLinkCount, 60);
});
