'use strict';

const fs = require('node:fs');
const path = require('node:path');
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

function readBaseShellRules() {
  const css = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'site-shell.css'),
    'utf8',
  ).split('@media')[0];
  const rules = new Map();

  for (const match of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const declarations = Object.fromEntries(
      match[2]
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => {
          const colon = declaration.indexOf(':');
          return [
            declaration.slice(0, colon).trim(),
            declaration.slice(colon + 1).trim().replace(/\s+/g, ' '),
          ];
        }),
    );
    for (const selector of match[1].split(',').map((part) => part.trim())) {
      rules.set(selector, { ...rules.get(selector), ...declarations });
    }
  }

  return rules;
}

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

test('canonical shell owns geometry independently of page root styles', () => {
  const rules = readBaseShellRules();
  const expectedDeclarations = {
    '.site-header': {
      'box-sizing': 'border-box',
      margin: '0',
      padding: '22px 0',
      'font-size': '16px',
      'line-height': '1',
    },
    '.site-header .site-header__inner': {
      margin: '0 auto',
      padding: '0 24px',
      gap: '16px',
    },
    '.site-header .site-header__left': {
      margin: '0',
      padding: '0',
      gap: '12px',
    },
    '.site-header .site-header__logo': {
      margin: '0',
      padding: '0',
      gap: '8px',
      'font-size': '14px',
      'line-height': '24px',
    },
    '.site-header .site-header__tagline': {
      margin: '0',
      padding: '0',
      'font-size': '11px',
      'line-height': '18px',
    },
    '.site-header .site-header__nav': {
      margin: '0',
      padding: '0',
      gap: '24px',
    },
    '.site-header .site-header__nav a': {
      'font-size': '12px',
      'line-height': '20px',
    },
    '.site-footer': {
      'box-sizing': 'border-box',
      margin: '0',
      padding: '42px 0 0',
      'font-size': '16px',
      'line-height': '1',
    },
    '.site-footer .site-footer__inner': {
      margin: '0 auto',
      padding: '0 24px 32px',
      gap: '32px',
    },
    '.site-footer .site-footer__brand': {
      display: 'block',
      margin: '0',
      padding: '0',
      gap: '0',
    },
    '.site-footer .site-footer__bottom': {
      margin: '0 auto',
      padding: '16px 24px',
      gap: '16px',
    },
    '.site-footer .site-footer__logo': {
      margin: '0',
      padding: '0',
      gap: '8px',
      'font-size': '14px',
      'line-height': '24px',
    },
    '.site-footer .site-footer__desc': {
      margin: '10px 0 0',
      padding: '0',
      'font-size': '11px',
      'line-height': '20px',
    },
    '.site-footer .site-footer__tagline': {
      margin: '10px 0 0',
      padding: '0',
      'font-size': '11px',
      'line-height': '20px',
    },
    '.site-footer .site-footer__col': {
      margin: '0',
      padding: '0',
    },
    '.site-footer .site-footer__col-heading': {
      margin: '0 0 13px',
      padding: '0',
      'font-size': '10px',
      'line-height': '16px',
    },
    '.site-footer .site-footer__col ul': {
      display: 'block',
      margin: '0',
      padding: '0',
      gap: '0',
    },
    '.site-footer .site-footer__col li': {
      margin: '0',
      padding: '0',
    },
    '.site-footer .site-footer__col li + li': {
      'margin-top': '8px',
    },
    '.site-footer .site-footer__col a': {
      display: 'block',
      'font-size': '11px',
      'line-height': '18px',
    },
    '.site-footer .site-footer__copy': {
      margin: '0',
      padding: '0',
      'font-size': '10px',
      'line-height': '16px',
    },
  };

  for (const [selector, declarations] of Object.entries(expectedDeclarations)) {
    for (const [property, value] of Object.entries(declarations)) {
      assert.equal(
        rules.get(selector)?.[property],
        value,
        `${selector} must own ${property}`,
      );
    }
  }

  for (const selector of [
    '.site-header *',
    '.site-header *::before',
    '.site-header *::after',
    '.site-footer *',
    '.site-footer *::before',
    '.site-footer *::after',
  ]) {
    assert.equal(
      rules.get(selector)?.['box-sizing'],
      'border-box',
      `${selector} must own box-sizing`,
    );
  }
});
