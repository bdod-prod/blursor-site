'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CANONICAL_SITE_SHELL_STYLESHEET,
  normalizeSiteShellHtml,
} = require('../scripts/lib/research-publication');

const STALE_PAGE = `<!doctype html>
<html>
<head><title>Fixture</title></head>
<body>
  <header class="site-header"><a href="/">Old header</a></header>
  <main>Keep this content</main>
  <footer class="site-footer"><a href="/digest">Old footer</a></footer>
</body>
</html>`;

test('site-shell normalizer replaces stale markup and is idempotent', () => {
  const once = normalizeSiteShellHtml(STALE_PAGE, {
    fileName: 'ai-crawler-checker.html',
    currentPath: '/ai-crawler-checker',
  });
  const twice = normalizeSiteShellHtml(once, {
    fileName: 'ai-crawler-checker.html',
    currentPath: '/ai-crawler-checker',
  });

  assert.equal(twice, once);
  assert.equal(
    (once.match(new RegExp(CANONICAL_SITE_SHELL_STYLESHEET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
    1,
  );
  assert.match(once, /<nav class="site-header__nav" aria-label="Primary navigation">/);
  assert.match(once, /<a href="\/ai-crawler-checker" aria-current="page">Tools<\/a>/);
  assert.match(once, /<a href="\/research">Research<\/a>/);
  assert.match(once, /<div class="site-footer__col-heading">Instruments<\/div>/);
  assert.match(once, /<a href="\/ai-crawler-checker">What AI Sees<\/a>/);
  assert.match(once, /<a href="\/author\/alex-rostovtsev">Author<\/a>/);
  assert.doesNotMatch(once, /href="\/digest"/);
  assert.match(once, /<main>Keep this content<\/main>/);
});

test('site-shell normalizer rejects missing or duplicate shell elements', () => {
  assert.throws(
    () => normalizeSiteShellHtml(
      STALE_PAGE.replace(/<footer[\s\S]*?<\/footer>/, ''),
      { fileName: 'missing-footer.html', currentPath: '/' },
    ),
    /missing-footer\.html: expected exactly one site-footer/,
  );
  assert.throws(
    () => normalizeSiteShellHtml(
      STALE_PAGE.replace('</body>', '<header class="site-header"></header></body>'),
      { fileName: 'duplicate-header.html', currentPath: '/' },
    ),
    /duplicate-header\.html: expected exactly one site-header/,
  );
});
