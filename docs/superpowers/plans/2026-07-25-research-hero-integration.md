# BLURSOR Research Hero Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate BLURSOR's paper-to-distill process into the homepage and Research archive heroes, make Research the primary homepage action, and remove the crawler form from the research story.

**Architecture:** Reuse one shared `research-hero` and `research-process` CSS component across both static pages. Migrate the homepage first while retaining the old archive styles, then migrate the archive and delete the retired standalone component. Protect hierarchy, approved copy, list semantics, CTA destinations, compiler survival, and removal of the mixed crawler promotion with Node regression tests.

**Tech Stack:** Static HTML5, shared CSS, Node.js built-in test runner, existing CommonJS Research compiler, local HTTP server, browser or bundled Playwright visual verification.

## Global Constraints

- Use the exact positioning sentence: `Research-based insights and practical tools to improve your AI visibility.`
- Use first-person process paragraphs with visible `01`, `02`, and `03` ordinals and no step mini-headings.
- Keep the trust line exact: `The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.`
- Keep `Browse the research` as the primary homepage action and `Try the crawler checker` as the secondary action.
- Remove the homepage URL form, `Develop` button, crawler list, and crawler-checker cards inside the research findings ticker.
- The process copy contains no `every`, `always`, `never`, `not X but Y`, `less X more Y`, `rather than`, or `instead of`.
- Do not restore the unsupported `2,800`, `70,000`, or `March 2026` research-volume claims.
- Preserve explicit ordered-list semantics with `role="list"` for Safari and VoiceOver.
- Preserve research article bodies, metadata, source links, archive cards, feed entries, sitemap entries, and compiler behavior.
- Do not modify the crawler checker route or implementation.
- Work only on `codex/research-method-explainer`; do not push, merge, deploy, or mutate n8n.

## File Map

- Modify `index.html`: convert the homepage hero to a split layout, add the approved positioning and CTAs, embed the process, remove the crawler form and mixed ticker CTA, and remove obsolete inline slot styles.
- Modify `research/index.html`: convert the Research hero to the same split structure and remove the standalone explainer.
- Modify `assets/research-method.css`: replace the standalone explainer presentation with shared split-hero, process-list, and CTA styles.
- Modify `tests/research-method-explainer.test.js`: enforce hero placement, approved copy, CTA hierarchy, removed crawler UI, list semantics, compiler survival, copy discipline, and contrast.
- Create `docs/superpowers/verification/2026-07-25-research-hero-integration.md`: record automated, compiler, responsive, accessibility, interaction, and branch evidence.

---

### Task 1: Integrate the Process and CTA Hierarchy into the Homepage Hero

**Files:**
- Modify: `tests/research-method-explainer.test.js`
- Modify: `index.html`
- Modify: `assets/research-method.css`

**Interfaces:**
- Consumes: existing homepage `hero`, `findings-band`, and primary-navigation HTML; existing `--max-width`, `--space-md`, color, serif, and mono CSS variables.
- Produces: `research-hero__inner`, `research-hero__editorial`, `research-hero__actions`, and `research-process` component classes; one `data-research-process="homepage"` contract.

- [ ] **Step 1: Add the approved process constants and extraction helpers**

In `tests/research-method-explainer.test.js`, add:

```js
const POSITIONING_LINE = 'Research-based insights and practical tools to improve your AI visibility.';
const PROCESS_COPY = [
  'We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.',
  'We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.',
  'We publish the findings, the evidence behind them, and what they could mean for your work.',
];

function extractHero(html, headingId, surface) {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*class="[^"]*\\bhero\\b[^"]*")(?=[^>]*aria-labelledby="${headingId}")[^>]*>[\\s\\S]*?<\\/section>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one labelled hero`);
  return matches[0][0];
}

function extractProcess(hero, surface) {
  const pattern = new RegExp(
    `<div\\b[^>]*data-research-process="${surface}"[^>]*>[\\s\\S]*?<\\/div>`,
    'g',
  );
  const matches = [...hero.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} hero must contain one research process`);
  return matches[0][0];
}

function assertProcessCopyInOrder(process, surface) {
  let cursor = -1;
  for (const paragraph of PROCESS_COPY) {
    const next = process.indexOf(paragraph);
    assert.ok(next > cursor, `${surface} must place the approved process copy in order`);
    cursor = next;
  }
  assert.equal(
    (process.match(/class="research-process__step"/g) || []).length,
    3,
    `${surface} must contain three process steps`,
  );
}

function assertResearchProcessListSemantics(process, surface) {
  assert.match(
    process,
    /<ol\b(?=[^>]*class="research-process__steps")(?=[^>]*role="list")[^>]*>/,
    `${surface} process list must explicitly retain list semantics`,
  );
}
```

Retain the existing archive-only helpers and `STEP_LABELS` temporarily. They are removed in Task 2 after the archive migrates.

- [ ] **Step 2: Replace the homepage regression test with the new hero contract**

Replace the existing homepage test with:

```js
test('homepage hero leads with Research and explains the paper-to-distill process', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const hero = extractHero(html, 'home-title', 'homepage');
  const process = extractProcess(hero, 'homepage');

  assertProcessCopyInOrder(process, 'homepage');
  assertResearchProcessListSemantics(process, 'homepage');
  assertCopyDiscipline(process, 'homepage');
  assert.match(hero, new RegExp(POSITIONING_LINE.replace(/[.]/g, '\\.')));
  assert.match(
    hero,
    /<a\b(?=[^>]*href="\/research")(?=[^>]*research-hero__action--primary)[^>]*>\s*Browse the research\s*<\/a>/,
  );
  assert.match(
    hero,
    /<a\b(?=[^>]*href="\/ai-crawler-checker")(?=[^>]*research-hero__action--secondary)[^>]*>\s*Try the crawler checker\s*<\/a>/,
  );
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.doesNotMatch(process, /Follow the field|Interrogate the paper|Make it usable/);
  assert.doesNotMatch(hero, /<form\b|slot__|>\s*Develop\s*</);
  assert.doesNotMatch(html, /data-research-method="homepage"|finding-card--cta|Fetches as/);
});
```

- [ ] **Step 3: Run the focused test and verify the RED state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: the homepage test fails because the hero has no `data-research-process="homepage"`, still contains the crawler form, and lacks the approved CTA hierarchy.

- [ ] **Step 4: Add the shared split-hero, process, and action styles**

Prepend the new shared component styles to `assets/research-method.css`. Keep the existing `.research-method` rules below them until Task 2:

```css
.research-hero__inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-md);
  display: grid;
  grid-template-columns: minmax(0, 1.38fr) minmax(300px, .92fr);
  gap: clamp(2.5rem, 5vw, 4.5rem);
  align-items: start;
}

.research-hero__editorial {
  min-width: 0;
}

.research-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  margin-top: 1.6rem;
}

.research-hero__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: .75rem 1rem;
  border: 1px solid var(--color-text);
  font-family: var(--font-mono);
  font-size: .7rem;
  font-weight: 600;
  letter-spacing: .06em;
  line-height: 1.2;
  text-decoration: none;
  text-transform: uppercase;
}

.research-hero__action--primary {
  background: var(--color-text);
  color: var(--color-surface);
}

.research-hero__action--secondary {
  background: transparent;
  color: var(--color-text);
}

.research-hero__action:hover {
  border-color: var(--color-accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.research-hero__action:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

.research-process {
  --research-process-muted: #665f55;
  min-width: 0;
}

.research-process__kicker {
  margin: 0 0 .65rem;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: .68rem;
  font-weight: 500;
  letter-spacing: .14em;
  line-height: 1.5;
  text-transform: uppercase;
}

.research-process__steps {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--color-border);
  list-style: none;
}

.research-process__step {
  display: grid;
  grid-template-columns: 2.35rem minmax(0, 1fr);
  gap: .75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
}

.research-process__ordinal {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: .7rem;
  font-weight: 600;
  letter-spacing: .1em;
  line-height: 1.7;
}

.research-process__copy {
  color: var(--research-process-muted);
  font-size: .9rem;
  line-height: 1.62;
}

.research-process__trust {
  margin-top: .85rem;
  color: var(--research-process-muted);
  font-family: var(--font-mono);
  font-size: .62rem;
  line-height: 1.7;
}

@media (max-width: 820px) {
  .research-hero__inner {
    grid-template-columns: 1fr;
    gap: 2.4rem;
  }
}
```

- [ ] **Step 5: Convert the homepage hero markup**

Replace the homepage hero and following `.slot` block with:

```html
    <section class="hero research-hero" aria-labelledby="home-title">
      <div class="research-hero__inner">
        <div class="research-hero__editorial">
          <div class="hero__kicker">AI-visibility research · Practical tools</div>
          <h1 class="hero__title" id="home-title">
            <!-- Preserve the existing focus-word spans and animation indices verbatim. -->
          </h1>
          <p class="hero__sub">Research-based insights and practical tools to improve your AI visibility.</p>
          <div class="research-hero__actions" aria-label="Explore BLURSOR">
            <a class="research-hero__action research-hero__action--primary" href="/research">Browse the research</a>
            <a class="research-hero__action research-hero__action--secondary" href="/ai-crawler-checker">Try the crawler checker</a>
          </div>
        </div>
        <div class="research-process" data-research-process="homepage" aria-labelledby="home-research-process-title">
          <h2 class="research-process__kicker" id="home-research-process-title">How the research gets useful</h2>
          <ol class="research-process__steps" role="list">
            <li class="research-process__step">
              <span class="research-process__ordinal" aria-hidden="true">01</span>
              <p class="research-process__copy">We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.</p>
            </li>
            <li class="research-process__step">
              <span class="research-process__ordinal" aria-hidden="true">02</span>
              <p class="research-process__copy">We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.</p>
            </li>
            <li class="research-process__step">
              <span class="research-process__ordinal" aria-hidden="true">03</span>
              <p class="research-process__copy">We publish the findings, the evidence behind them, and what they could mean for your work.</p>
            </li>
          </ol>
          <p class="research-process__trust">The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.</p>
        </div>
      </div>
    </section>
```

Preserve the existing headline spans exactly where indicated; do not replace them with the HTML comment.

Update the inline homepage `.hero` rules:

```css
.hero {
  padding: 4.6rem 0 4rem;
}

.hero__title {
  max-width: 680px;
  font-size: clamp(2.65rem, 4.6vw, 3.35rem);
}

.hero__sub {
  max-width: 560px;
}
```

Delete all `.slot`, `.slot__row`, `.slot__prompt`, `.slot__input`, `.slot__btn`, `.slot__hint`, and `.slot__bots` rules, including their mobile overrides.

- [ ] **Step 6: Remove the mixed crawler promotion from the findings band**

Delete both anchors whose class contains `finding-card--cta`. Confirm that the normal and `is-duplicate` versions are gone:

```bash
rg -n "finding-card--cta|Fetches as|slot__" index.html
```

Expected: no output.

- [ ] **Step 7: Remove the standalone homepage explainer**

Delete the entire section keyed by:

```html
data-research-method="homepage"
```

Confirm only the integrated process remains:

```bash
rg -n "data-research-method|data-research-process" index.html
```

Expected: one `data-research-process="homepage"` result and no `data-research-method` result.

- [ ] **Step 8: Run focused and complete tests**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
git diff --check
```

Expected: the focused homepage and retained archive contracts pass; the complete suite has zero failures; `git diff --check` exits 0.

- [ ] **Step 9: Commit the independently working homepage change**

```bash
git add index.html assets/research-method.css tests/research-method-explainer.test.js
git commit -m "feat: integrate research process into homepage hero"
```

---

### Task 2: Integrate the Process into the Research Hero and Remove Legacy Styles

**Files:**
- Modify: `tests/research-method-explainer.test.js`
- Modify: `research/index.html`
- Modify: `assets/research-method.css`

**Interfaces:**
- Consumes: the `research-hero` and `research-process` classes created in Task 1; `discoverArticles({ rootDir })` and `generateArchiveHtml(indexHtml, articles)` from `scripts/lib/research-publication.js`.
- Produces: one `data-research-process="archive"` inside the Research hero; no remaining `data-research-method` markup or `.research-method` styles.

- [ ] **Step 1: Replace the archive and compiler tests with the integrated-hero contract**

Remove `STEP_LABELS`, `extractMethodSection`, the old `assertStepsInOrder` helper, and the old `assertProcessListSemantics` helper. Replace the archive test with:

```js
test('Research hero explains the paper-to-distill process before the inventory', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const hero = extractHero(html, 'research-title', 'archive');
  const process = extractProcess(hero, 'archive');
  const heroPosition = html.indexOf(hero);
  const articlesPosition = html.indexOf('<section class="articles">');

  assertProcessCopyInOrder(process, 'archive');
  assertResearchProcessListSemantics(process, 'archive');
  assertCopyDiscipline(process, 'archive');
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.doesNotMatch(process, /Follow the field|Interrogate the paper|Make it usable/);
  assert.doesNotMatch(html, /data-research-method="archive"/);
  assert.ok(heroPosition < articlesPosition, 'Research hero must precede the article inventory');
});
```

Replace the compiler test with:

```js
test('research compiler preserves the integrated Research hero', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  const rebuilt = generateArchiveHtml(html, articles);
  const hero = extractHero(rebuilt, 'research-title', 'archive');
  const process = extractProcess(hero, 'archive');

  assertProcessCopyInOrder(process, 'archive');
  assertResearchProcessListSemantics(process, 'archive');
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.ok(
    rebuilt.indexOf(hero) < rebuilt.indexOf('<section class="articles">'),
    'rebuilt Research hero must precede the article inventory',
  );
});
```

Change the contrast test selectors from:

```js
[
  '.research-method__lead',
  '.research-method__step-copy',
  '.research-method__trust p',
]
```

to:

```js
[
  '.research-process__copy',
  '.research-process__trust',
]
```

Read `--research-process-muted` instead of `--research-method-muted`.

- [ ] **Step 2: Run the focused test and verify the RED state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: archive and compiler tests fail because `research/index.html` still has a standalone `data-research-method="archive"` section and its hero has no integrated process.

- [ ] **Step 3: Convert the Research hero markup**

Give the existing archive heading the stable ID `research-title` and replace the hero plus standalone explainer with:

```html
  <section class="hero research-hero has-grid" aria-labelledby="research-title">
    <div class="research-hero__inner">
      <div class="research-hero__editorial">
        <h1 class="hero__title" id="research-title">How AI decides what&nbsp;to&nbsp;cite, rank, and&nbsp;surface</h1>
        <p class="hero__description">Catch up with the papers shaping AI visibility. Each distill explains the findings, supporting evidence, and practical implications in plain English.</p>
      </div>
      <div class="research-process" data-research-process="archive" aria-labelledby="archive-research-process-title">
        <h2 class="research-process__kicker" id="archive-research-process-title">How a distill is made</h2>
        <ol class="research-process__steps" role="list">
          <li class="research-process__step">
            <span class="research-process__ordinal" aria-hidden="true">01</span>
            <p class="research-process__copy">We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.</p>
          </li>
          <li class="research-process__step">
            <span class="research-process__ordinal" aria-hidden="true">02</span>
            <p class="research-process__copy">We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.</p>
          </li>
          <li class="research-process__step">
            <span class="research-process__ordinal" aria-hidden="true">03</span>
            <p class="research-process__copy">We publish the findings, the evidence behind them, and what they could mean for your work.</p>
          </li>
        </ol>
        <p class="research-process__trust">The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.</p>
      </div>
    </div>
  </section>
```

- [ ] **Step 4: Align the Research hero and mobile spacing**

Keep the existing `.hero` padding and typography. Delete the now-unused `.hero__inner` rule from `research/index.html`. At the existing `max-width: 640px` media query, use:

```css
.hero {
  padding-top: var(--space-xl);
  padding-bottom: var(--space-lg);
}
```

If the 1280 × 800 verification in Task 3 places the bottom of `.research-process` below the viewport, reduce only desktop hero vertical padding before changing type size or process copy.

- [ ] **Step 5: Remove the retired standalone component styles**

Delete all `.research-method`, `.research-method__inner`, `.research-method__intro`, `.research-method__kicker`, `.research-method__title`, `.research-method__lead`, `.research-method__steps`, `.research-method__step`, `.research-method__ordinal`, `.research-method__step-title`, `.research-method__step-copy`, `.research-method__trust`, and `.research-method__link` rules from `assets/research-method.css`.

Confirm the repository has no retired markup or class references:

```bash
rg -n "data-research-method|research-method__|Follow the field|Interrogate the paper|Make it usable" index.html research/index.html assets/research-method.css tests/research-method-explainer.test.js
```

Expected: no output.

- [ ] **Step 6: Run focused and complete tests**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
git diff --check
```

Expected: all focused tests and the complete suite pass; `git diff --check` exits 0.

- [ ] **Step 7: Verify compiler survival and idempotence**

Run:

```bash
node scripts/build-research-index.js
node --test tests/research-method-explainer.test.js
git diff --exit-code
node scripts/build-research-index.js
git diff --exit-code
```

Expected: the compiler reports the complete current article count, the focused test passes after compilation, and both `git diff --exit-code` checks return 0.

- [ ] **Step 8: Commit the independently working archive migration**

```bash
git add research/index.html assets/research-method.css tests/research-method-explainer.test.js
git commit -m "feat: integrate research process into archive hero"
```

---

### Task 3: Verify the Complete Story and Record Evidence

**Files:**
- Create: `docs/superpowers/verification/2026-07-25-research-hero-integration.md`
- Verify: `index.html`
- Verify: `research/index.html`
- Verify: `assets/research-method.css`
- Verify: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: completed homepage and Research hero implementations from Tasks 1 and 2.
- Produces: reproducible automated, compiler, responsive, accessibility, interaction, and branch evidence with a clear review-readiness verdict.

- [ ] **Step 1: Run the complete automated and repository checks**

Run:

```bash
node --test tests/*.test.js
node scripts/build-research-index.js
node --test tests/research-method-explainer.test.js
git diff --exit-code
git diff --check
```

Record exact pass counts, compiler article count, and exit results. If the compiler changes a file, inspect and resolve the mismatch before continuing.

- [ ] **Step 2: Start a local static server**

Run from the worktree:

```bash
python3 -m http.server 4173
```

Verify:

```bash
curl -fsS http://127.0.0.1:4173/ >/dev/null
curl -fsS http://127.0.0.1:4173/research/ >/dev/null
curl -fsS http://127.0.0.1:4173/assets/research-method.css >/dev/null
```

Expected: all three requests return successfully.

- [ ] **Step 3: Capture desktop and mobile screenshots**

Use the in-app browser when available. If no browser can acquire the local route, use the bundled Playwright runtime already available in the workspace; do not install a package or change dependency files.

Save:

```text
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-1440x900.png
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-1280x800.png
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-390x844.png
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-1440x900.png
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-1280x800.png
/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-390x844.png
```

For each desktop viewport, record:

```js
const processBottom = await page.locator('[data-research-process]').evaluate(
  (element) => element.getBoundingClientRect().bottom,
);
const viewportHeight = page.viewportSize().height;
const aboveFold = processBottom <= viewportHeight;
```

Expected: `aboveFold` is `true` at 1440 × 900 and 1280 × 800 on both pages.

- [ ] **Step 4: Verify responsive layout and accessibility behavior**

At each viewport, record:

```js
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
const stepCount = await page.locator('.research-process__step').count();
const listRole = await page.locator('.research-process__steps').getAttribute('role');
```

Expected:

- `overflow` is `false`;
- `stepCount` is `3`;
- `listRole` is `list`;
- no text overlaps, clips, or disappears;
- desktop uses two columns;
- mobile stacks editorial content before the process;
- both homepage actions remain visible and distinct; and
- browser console and page-error collections are empty.

Tab to each homepage action and verify a visible focus outline. Activate `Browse the research` and confirm the destination is `/research/`. Return to the homepage, activate `Try the crawler checker`, and confirm the destination is `/ai-crawler-checker`.

- [ ] **Step 5: Inspect all six screenshots**

Open each screenshot and check:

- the homepage headline remains readable after moving to the wider split hero;
- the process is visible immediately on both desktop pages;
- the right column does not look like a dashboard card;
- the primary Research action is visually stronger than the checker action;
- the crawler form and bot list are absent;
- the Research archive starts its article inventory immediately after the hero;
- mobile spacing does not recreate the former long standalone section; and
- muted text remains readable on the cream background.

- [ ] **Step 6: Write the verification record**

Create `docs/superpowers/verification/2026-07-25-research-hero-integration.md` with the following sections and fill each one only with observed results from Steps 1–5:

```markdown
# BLURSOR Research Hero Integration Verification

**Date:** 2026-07-25
**Branch:** `codex/research-method-explainer`
**Verified implementation HEAD:** Record the implementation commit returned by `git rev-parse HEAD`.

## Automated checks

Record the complete Node suite count, focused suite count, compiler article
count, both idempotence results, and `git diff --check` result in a table.

## Contract evidence

Record the homepage positioning and CTA result, crawler-form and ticker-CTA
removal result, shared process and trust-line result, and archive
compiler-preservation result.

## Responsive and accessibility evidence

Record one row for each required route and viewport. Include process-above-fold
results on desktop, overflow results at all sizes, list semantics, focus
treatment, CTA destinations, and console/page-error results.

## Screenshot evidence

List all six absolute screenshot paths and the inspection result for each.

## Branch boundaries

Record `git status --short --branch`, the local commit list relative to
`origin/main`, and confirmation that no push, merge, or deployment occurred.

## Verdict

Use `READY FOR REVIEW` only if every acceptance criterion is proven. Otherwise
use `NOT READY` and state the unmet criterion.
```

Do not record intended, inferred, or placeholder results.

- [ ] **Step 7: Commit the verification evidence**

```bash
git add docs/superpowers/verification/2026-07-25-research-hero-integration.md
git commit -m "docs: verify integrated research heroes"
```

- [ ] **Step 8: Run the final branch audit**

Run:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
node --test tests/*.test.js
git diff --check
```

Expected: clean branch, only intended local commits ahead of `origin/main`, full suite passing, no whitespace errors, no push, no merge, and no deployment.
