# Canonical BLURSOR Site Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 34 public BLURSOR pages one compiler-managed header and footer, keep the homepage and Research archive synchronized, and replace the Research page’s repeated four-step model with a three-step distillation explainer.

**Architecture:** `/assets/site-shell.css` owns shell geometry and loads after page-local styles. `scripts/lib/research-publication.js` owns canonical header/footer markup, normalizes all static and generated HTML outputs, and rejects divergent shells during publication verification. The existing ordered `BLURSOR-META` collection continues to generate the complete Research archive and the homepage’s newest three digest rows.

**Tech Stack:** Static HTML/CSS, Node.js CommonJS, Node’s built-in test runner, Cloudflare Pages build workflow, in-app browser QA.

## Global Constraints

- The homepage is the canonical header and footer source.
- Shared desktop shell width is exactly `1060px`.
- Header navigation is exactly `Tools` → `/ai-crawler-checker` and `Research` → `/research`.
- `What AI Sees` remains the crawler checker’s product name outside primary navigation.
- Mobile navigation remains visible and follows the homepage’s stacked layout.
- The footer uses the homepage’s four-column content and removes obsolete `/digest` links.
- The homepage keeps the four-step `How BLURSOR works` model.
- The Research archive uses the approved three-step `How a distill is made` copy.
- `BLURSOR-META` remains the only published-article inventory.
- The homepage shows the first three articles from the same sorted collection used by `/research`.
- No JavaScript-rendered navigation or new framework.
- Do not change checker metadata, schema, report receipts, or share copy.
- Do not alter n8n, merge, or deploy production.

---

### Task 1: Canonical shell renderer and shared stylesheet

**Files:**
- Create: `assets/site-shell.css`
- Create: `tests/site-shell.test.js`
- Modify: `scripts/lib/research-publication.js`

**Interfaces:**
- Produces: `normalizeSiteShellHtml(html: string, options: { fileName: string, currentPath: string }): string`
- Produces: `CANONICAL_SITE_SHELL_STYLESHEET: string`
- Consumes later: Tasks 2 and 4 call the normalizer and verify the same stylesheet contract.

- [ ] **Step 1: Write the failing normalizer tests**

Create `tests/site-shell.test.js` with a controlled stale shell:

```js
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
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
node --test tests/site-shell.test.js
```

Expected: FAIL because the two exported shell interfaces do not exist.

- [ ] **Step 3: Implement canonical markup and idempotent replacement**

In `scripts/lib/research-publication.js`, add:

```js
const CANONICAL_SITE_SHELL_STYLESHEET = '<link rel="stylesheet" href="/assets/site-shell.css?v=20260725-canonical-shell">';

function renderCanonicalHeader(currentPath) {
  const toolsCurrent = currentPath === '/ai-crawler-checker' ? ' aria-current="page"' : '';
  const researchCurrent = currentPath === '/research' || currentPath.startsWith('/research/')
    ? ' aria-current="page"'
    : '';
  return `  <header class="site-header">
    <div class="site-header__inner">
      <div class="site-header__left">
        <a href="/" class="site-header__logo" aria-label="BLURSOR home">
          <svg width="15" height="20" viewBox="0 0 15 18" fill="#b73524" aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="7" height="18" rx="1"/>
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="13" r="2"/>
          </svg>
          BLURSOR
        </a>
        <span class="site-header__tagline">Science-backed data on why AI says what it says</span>
      </div>
      <nav class="site-header__nav" aria-label="Primary navigation">
        <a href="/ai-crawler-checker"${toolsCurrent}>Tools</a>
        <a href="/research"${researchCurrent}>Research</a>
      </nav>
    </div>
  </header>`;
}
```

Add the following canonical footer renderer and single-element replacement helper:

```js
function renderCanonicalFooter() {
  return `  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <a href="/" class="site-footer__logo" aria-label="BLURSOR home">
          <svg width="13" height="17" viewBox="0 0 15 18" fill="currentColor" aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="7" height="18" rx="1"/>
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="13" r="2"/>
          </svg>
          BLURSOR
        </a>
        <p class="site-footer__desc">Research on why AI says what it says, distilled for people who act on it.</p>
        <span class="site-footer__tagline">Now you have no excuses not to act on it.</span>
      </div>

      <div class="site-footer__col">
        <div class="site-footer__col-heading">Instruments</div>
        <ul>
          <li><a href="/ai-crawler-checker">What AI Sees</a></li>
        </ul>
      </div>

      <div class="site-footer__col">
        <div class="site-footer__col-heading">Research</div>
        <ul>
          <li><a href="/research">All articles</a></li>
          <li><a href="/author/alex-rostovtsev">Author</a></li>
        </ul>
      </div>

      <div class="site-footer__col">
        <div class="site-footer__col-heading">Connect</div>
        <ul>
          <li><a href="https://twitter.com/blursor_ai" target="_blank" rel="noopener">@blursor_ai</a></li>
          <li><a href="mailto:contact@blursor.ai">contact@blursor.ai</a></li>
        </ul>
      </div>
    </div>

    <div class="site-footer__bottom">
      <span class="site-footer__copy">&copy; 2026 BLURSOR.ai</span>
      <span class="site-footer__copy">Built by <a href="https://3am.energy" target="_blank" rel="noopener">3AM Energy</a></span>
    </div>
  </footer>`;
}

function replaceSingleShellElement(html, { className, replacement, fileName }) {
  const pattern = new RegExp(
    `<(?:header|footer)\\b[^>]*class=(["'])[^"']*\\b${className}\\b[^"']*\\1[^>]*>[\\s\\S]*?<\\/(?:header|footer)>`,
    'g',
  );
  const matches = html.match(pattern) || [];
  if (matches.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: expected exactly one ${className}, found ${matches.length}`,
    ]);
  }
  return html.replace(pattern, replacement);
}
```

`normalizeSiteShellHtml()` must:

1. remove existing `/assets/site-shell.css` links;
2. require one `</head>` and insert `CANONICAL_SITE_SHELL_STYLESHEET` immediately before it;
3. replace the header and footer;
4. preserve all content outside those elements;
5. return byte-identical output on a second call.

Export `CANONICAL_SITE_SHELL_STYLESHEET` and `normalizeSiteShellHtml`.

- [ ] **Step 4: Create the authoritative shell stylesheet**

Create `assets/site-shell.css` with the homepage geometry:

```css
.site-header {
  padding: 1.4rem 0;
  border-bottom: 1px solid #d4d0c8;
}

.site-header .site-header__inner {
  width: 100%;
  max-width: 1060px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.site-header .site-header__left {
  display: flex;
  align-items: center;
  gap: .75rem;
  min-width: 0;
}

.site-header .site-header__logo,
.site-footer .site-footer__logo {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .9rem;
  font-weight: 500;
  letter-spacing: .08em;
  text-decoration: none;
}

.site-header .site-header__logo {
  color: #1a1a18;
}

.site-header .site-header__tagline {
  color: #665f55;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .7rem;
  font-weight: 500;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.site-header .site-header__nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.site-header .site-header__nav a {
  color: #665f55;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .75rem;
  letter-spacing: .03em;
  text-decoration: none;
  text-transform: uppercase;
}

.site-header .site-header__nav a:hover,
.site-header .site-header__nav a[aria-current="page"] {
  color: #1a1a18;
}

.site-header .site-header__nav a:focus-visible,
.site-footer a:focus-visible {
  outline: 2px solid #b73524;
  outline-offset: 3px;
}

.site-footer {
  padding: 2.6rem 0 0;
  background: #1a1a18;
}

.site-footer .site-footer__inner,
.site-footer .site-footer__bottom {
  width: 100%;
  max-width: 1060px;
  margin-right: auto;
  margin-left: auto;
  padding-right: 1.5rem;
  padding-left: 1.5rem;
}

.site-footer .site-footer__inner {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2rem;
  align-items: start;
  padding-bottom: 2rem;
}

.site-footer .site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  border-top: 1px solid rgba(255, 255, 255, .08);
  flex-wrap: wrap;
}

.site-footer .site-footer__logo {
  color: #f0ece4;
  text-transform: uppercase;
}

.site-footer .site-footer__desc,
.site-footer .site-footer__tagline {
  margin-top: .6rem;
  color: #a09d95;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .66rem;
  line-height: 1.7;
}

.site-footer .site-footer__tagline {
  display: block;
  color: #8d8779;
  font-style: italic;
}

.site-footer .site-footer__col-heading {
  margin-bottom: .8rem;
  color: #f0ece4;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .62rem;
  font-weight: 500;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.site-footer .site-footer__col ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-footer .site-footer__col li + li {
  margin-top: .5rem;
}

.site-footer .site-footer__col a {
  color: #a09d95;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .68rem;
  text-decoration: none;
}

.site-footer .site-footer__col a:hover {
  color: #f0ece4;
}

.site-footer .site-footer__copy {
  color: #8d8779;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: .62rem;
}

.site-footer .site-footer__copy a {
  color: inherit;
  text-decoration: none;
}

.site-footer .site-footer__copy a:hover {
  color: #f0ece4;
}

@media (max-width: 820px) {
  .site-header .site-header__tagline {
    display: none;
  }

  .site-footer .site-footer__inner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .site-header .site-header__inner,
  .site-header .site-header__nav {
    align-items: flex-start;
  }

  .site-header .site-header__inner {
    flex-direction: column;
  }
}
```

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test tests/site-shell.test.js
git diff --check
```

Expected: 2 passed, 0 failed; diff check clean.

Commit:

```bash
git add assets/site-shell.css scripts/lib/research-publication.js tests/site-shell.test.js
git commit -m "feat: define canonical BLURSOR site shell"
```

---

### Task 2: Apply and verify the shell across the complete publication inventory

**Files:**
- Modify: `scripts/lib/research-publication.js`
- Modify: `tests/research-publication.test.js`
- Modify: `tests/research-repository.test.js`
- Modify through compiler output: `index.html`
- Modify through compiler output: `ai-crawler-checker.html`
- Modify through compiler output: `author/alex-rostovtsev.html`
- Modify through compiler output: `research/index.html`
- Modify through compiler output: `research/*.html`

**Interfaces:**
- Consumes: `normalizeSiteShellHtml(html, { fileName, currentPath })` from Task 1.
- Produces: `verifyCanonicalSiteShell(html, { fileName, currentPath, issues }): void`.
- Preserves: `compileResearch({ rootDir })` return shape and the existing homepage/latest-digest generation.

- [ ] **Step 1: Upgrade fixtures to contain real shell boundaries**

In `tests/research-publication.test.js`, add:

```js
function withFixtureShell(contents = '') {
  return `<!doctype html>
<html>
<head></head>
<body>
  <header class="site-header"><span>Fixture header</span></header>
  ${contents}
  <footer class="site-footer"><span>Fixture footer</span></footer>
</body>
</html>`;
}
```

Use it in `makeFixture()` for homepage, checker, author, and archive. Add the same minimal header/footer boundaries to `validArticleHtml()` without changing article metadata, canonical, byline, arXiv, or related-grid fixtures.

- [ ] **Step 2: Write failing compiler-integration tests**

Add:

```js
test('compiler normalizes the site shell on every public output', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-21' });

  compileResearch({ rootDir });

  const pages = [
    ['index.html', '/'],
    ['ai-crawler-checker.html', '/ai-crawler-checker'],
    ['author/alex-rostovtsev.html', '/author/alex-rostovtsev'],
    ['research/index.html', '/research'],
    ['research/new-a.html', '/research/new-a'],
    ['research/new-b.html', '/research/new-b'],
    ['research/old.html', '/research/old'],
  ];
  for (const [file, currentPath] of pages) {
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert.equal(
      normalizeSiteShellHtml(html, { fileName: file, currentPath }),
      html,
      `${file} must already contain the canonical shell`,
    );
  }
});
```

Extend the existing atomic-write test so a missing footer on one in-scope output causes compilation to fail before any article or static page is written.

- [ ] **Step 3: Run the integration test and verify the red state**

Run:

```bash
node --test --test-name-pattern="compiler normalizes the site shell" tests/research-publication.test.js
```

Expected: FAIL because only article/archive publication surfaces are currently generated.

- [ ] **Step 4: Integrate shell normalization into `compileResearch()`**

Add page descriptors:

```js
const CANONICAL_STATIC_PAGES = [
  { file: 'index.html', currentPath: '/' },
  { file: 'ai-crawler-checker.html', currentPath: '/ai-crawler-checker' },
  { file: 'research/index.html', currentPath: '/research' },
  { file: 'author/alex-rostovtsev.html', currentPath: '/author/alex-rostovtsev' },
];
```

Normalize outputs in memory before computing `changedOutputs`:

- articles: normalize after byline, related-card, RSS, and mobile-meta normalization;
- homepage: run `generateHomepageHtml()` first, then normalize the shell;
- Research archive: run `generateArchiveHtml()` first, then normalize the shell;
- checker and author: normalize their current HTML directly.

Use each article’s `/research/${article.meta.slug}` path when rendering active state.

Build `fileMtimes` for every changed `STATIC_ROUTES` page before generating `sitemap.xml`, so shell-only changes receive truthful sitemap dates without making second-run output unstable.

- [ ] **Step 5: Add verification for exact shell state**

Add:

```js
function verifyCanonicalSiteShell(html, { fileName, currentPath, issues }) {
  try {
    const normalized = normalizeSiteShellHtml(html, { fileName, currentPath });
    if (normalized !== html) issues.push(`${fileName}: site shell is not canonical`);
  } catch (error) {
    if (error instanceof PublicationValidationError) issues.push(...error.issues);
    else throw error;
  }
}
```

Call it for the four static pages and every canonical article in `verifyPublishedState()`. Continue to verify homepage digest targets against `expectedArticles.slice(0, 3)`.

In `tests/research-repository.test.js`, assert:

```js
const fs = require('node:fs');

function extractClassLinkTargets(html, className) {
  return [...html.matchAll(
    new RegExp(`<a\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${className}\\b[^"']*\\1)[^>]*\\bhref=(["'])([^"']+)\\2[^>]*>`, 'g'),
  )].map(match => match[3]);
}

const home = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
assert.equal(articles.length, 30);
assert.deepEqual(
  extractClassLinkTargets(home, 'digest-row'),
  articles.slice(0, 3).map(article => `/research/${article.meta.slug}`),
);
```

Use a local test helper for extracting homepage targets rather than exporting production internals.

- [ ] **Step 6: Run publication and repository suites**

Run:

```bash
node --test tests/research-publication.test.js tests/research-repository.test.js tests/site-shell.test.js
```

Expected: all tests pass with no failures.

- [ ] **Step 7: Regenerate the repository and commit**

Run:

```bash
node scripts/build-research-index.js
git diff --check
```

Expected: `Compiled and verified 30 research article(s)`.

Confirm all 34 pages contain one canonical stylesheet, header, and footer. Commit all compiler-generated HTML because the deployed repository is static:

```bash
git add assets/site-shell.css scripts/lib/research-publication.js tests/site-shell.test.js tests/research-publication.test.js tests/research-repository.test.js index.html ai-crawler-checker.html author/alex-rostovtsev.html research
git commit -m "feat: synchronize BLURSOR site shell"
```

---

### Task 3: Distinguish the Research explainer from the homepage model

**Files:**
- Modify: `research/index.html`
- Modify: `tests/research-method-explainer.test.js`

**Interfaces:**
- Preserves: homepage `How BLURSOR works` heading, four steps, `/research` link, and `/ai-crawler-checker` link.
- Produces: Research `How a distill is made` heading with three non-interactive steps.

- [ ] **Step 1: Split homepage and archive copy contracts in the test**

Replace the shared `PROCESS_COPY` constant with:

```js
const HOME_PROCESS_COPY = [
  'We monitor new research papers on AI visibility, LLM ranking factors, and how AI finds and cites sources.',
  'We filter for findings with practical implications and distill the useful parts into readable articles.',
  'We publish the findings, supporting evidence, and what they could mean for your work.',
  'We turn useful findings into tools that help you investigate problems and improve AI visibility.',
];

const ARCHIVE_PROCESS_COPY = [
  'We find papers that address AI visibility, ranking, retrieval, and citation behavior.',
  'We examine the methods, results, and limitations, then isolate findings with practical implications.',
  'We publish the distill in plain English, with the supporting evidence and a direct link to the paper.',
];
```

Change `assertProcessCopyInOrder(process, surface)` to choose the appropriate array and require four homepage steps or three archive steps. Change `assertProcessLinks()` so:

- homepage keeps `publish the findings` and `tools` links;
- archive heading equals `How a distill is made`;
- archive contains no process links and no fourth step.

- [ ] **Step 2: Run the explainer suite and verify the red state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: FAIL because the Research archive still contains the homepage’s four-step model.

- [ ] **Step 3: Replace only the Research archive explainer**

Use:

```html
<div class="research-process" data-research-process="archive" role="region" aria-labelledby="archive-research-process-title">
  <h2 class="research-process__kicker" id="archive-research-process-title">How a distill is made</h2>
  <ol class="research-process__steps" role="list">
    <li class="research-process__step">
      <span class="research-process__ordinal" aria-hidden="true">01</span>
      <p class="research-process__copy">We find papers that address AI visibility, ranking, retrieval, and citation behavior.</p>
    </li>
    <li class="research-process__step">
      <span class="research-process__ordinal" aria-hidden="true">02</span>
      <p class="research-process__copy">We examine the methods, results, and limitations, then isolate findings with practical implications.</p>
    </li>
    <li class="research-process__step">
      <span class="research-process__ordinal" aria-hidden="true">03</span>
      <p class="research-process__copy">We publish the distill in plain English, with the supporting evidence and a direct link to the paper.</p>
    </li>
  </ol>
</div>
```

Do not change the homepage explainer.

- [ ] **Step 4: Run the focused suite and compiler**

Run:

```bash
node --test tests/research-method-explainer.test.js
node scripts/build-research-index.js
node --test tests/research-method-explainer.test.js
```

Expected: the suite passes before and after regeneration, proving the compiler preserves the distinct Research copy.

- [ ] **Step 5: Commit**

```bash
git add research/index.html tests/research-method-explainer.test.js
git commit -m "fix: focus Research on the distillation method"
```

---

### Task 4: Full regression, idempotence, and deployed-preview QA

**Files:**
- Modify if needed: `docs/superpowers/plans/2026-07-25-canonical-site-shell.md`
- Update externally: draft PR #130 body

**Interfaces:**
- Consumes: all earlier task outputs.
- Produces: evidence that the branch is ready for review without modifying production.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
node --test tests/*.test.js
```

Expected: all tests pass, including shell normalization, archive integrity, Latest digests synchronization, and distinct process copy.

- [ ] **Step 2: Prove compiler idempotence**

Run twice:

```bash
node scripts/build-research-index.js
shasum -a 256 index.html ai-crawler-checker.html author/alex-rostovtsev.html research/index.html research/feed.xml sitemap.xml research/*.html
```

Expected:

- both builds report 30 verified articles;
- hashes are identical across the two runs;
- `git diff --check` is clean.

- [ ] **Step 3: Verify repository-wide shell inventory**

Run:

```bash
node - <<'NODE'
const fs = require('node:fs');
const cp = require('node:child_process');
const files = cp.execFileSync('rg', ['--files', '-g', '*.html', '-g', '!references/**'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const marker of ['class="site-header"', 'class="site-footer"', '/assets/site-shell.css?v=20260725-canonical-shell']) {
    const count = html.split(marker).length - 1;
    if (count !== 1) throw new Error(`${file}: expected one ${marker}, found ${count}`);
  }
}
console.log(`Verified canonical shell on ${files.length} page(s)`);
NODE
```

Expected: `Verified canonical shell on 34 page(s)`.

- [ ] **Step 4: Run local visual QA**

Start the repository locally and inspect:

- `/`
- `/ai-crawler-checker`
- `/research/`
- `/research/drnoise-shows-one-false-document-can-knock-agents-off-course`
- `/author/alex-rostovtsev`

At `1280 × 800` and `390 × 844`, record:

- header `.site-header__inner` left, right, width, and height;
- footer `.site-footer__inner` left, right, width, and column count;
- visible `Tools` and `Research` navigation;
- page-aware `aria-current`;
- no horizontal overflow;
- no browser warnings/errors;
- homepage four-step model;
- Research three-step model;
- homepage digest targets equal the first three Research article targets.

Desktop header/footer coordinates must match across all five routes. Mobile wrapping may change vertical position, but internal width and padding must match.

- [ ] **Step 5: Commit any verification-only corrections**

If visual QA exposes a real defect, add a failing regression test first, implement the smallest correction, rerun Steps 1–4, then commit the correction. If no defect exists, do not create an empty commit.

- [ ] **Step 6: Push and verify the Cloudflare preview**

Push `codex/research-method-explainer`, wait for the PR deployment check, and extract the immutable `*.pages.dev` URL for the new commit.

Repeat the five-route desktop and mobile checks against the immutable preview. Confirm the preview’s commit matches local `HEAD`.

- [ ] **Step 7: Update draft PR #130**

Update the PR body with:

- canonical header/footer scope and shared CSS;
- removal of obsolete footer links;
- distinct Research explainer;
- preserved homepage/Research synchronization;
- final test count;
- idempotence evidence;
- local and deployed visual-QA receipts;
- immutable preview URL and commit;
- explicit statement that production remains unchanged.
