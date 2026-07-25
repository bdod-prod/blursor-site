# BLURSOR Research Method Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore BLURSOR's research catch-up proposition and explain its paper-to-distill process on the homepage and Research archive.

**Architecture:** Add one small shared stylesheet and two semantic ordered-list sections placed outside compiler-managed HTML. Protect their copy, structure, link, and archive-build survival with a focused Node test. Keep article generation and the external publishing pipeline unchanged.

**Tech Stack:** Static HTML5, shared CSS, Node.js built-in test runner, existing CommonJS research compiler.

## Global Constraints

- Use light transparency: the pipeline helps with discovery and drafting; publication requires editorial review.
- The new explainer copy contains no `every`, `always`, or `never`.
- Avoid `not X but Y`, `less X, more Y`, and similar contrast formulas.
- Do not restore the unsupported monthly paper-volume statistic.
- Keep scientific-paper provenance and access to the original paper central.
- Preserve all research article bodies, metadata, archive cards, feed entries, sitemap entries, and compiler behavior.
- Work only on `codex/research-method-explainer`; do not push, merge, deploy, or mutate n8n.

## File Map

- Create `assets/research-method.css`: responsive presentation shared by both explainer sections.
- Create `tests/research-method-explainer.test.js`: semantic, copy, link, and archive-compiler regression contract.
- Modify `index.html`: load the stylesheet, tighten two existing `Every` constructions, and add the complete homepage explainer.
- Modify `research/index.html`: load the stylesheet and add the compact archive explainer outside the compiler-managed article grid.
- Create `docs/superpowers/verification/2026-07-24-research-method-explainer.md`: verification commands, results, and screenshot paths.

---

### Task 1: Lock the Research-Method Contract

**Files:**
- Create: `tests/research-method-explainer.test.js`
- Test: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: `generateArchiveHtml(indexHtml, articles)` and `discoverArticles({ rootDir })` from `scripts/lib/research-publication.js`.
- Produces: a DOM-independent contract keyed by one `data-research-method` section per page.

- [ ] **Step 1: Write the failing semantic and copy test**

Create `tests/research-method-explainer.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  discoverArticles,
  generateArchiveHtml,
} = require('../scripts/lib/research-publication');

const ROOT_DIR = path.resolve(__dirname, '..');
const HOME_PATH = path.join(ROOT_DIR, 'index.html');
const ARCHIVE_PATH = path.join(ROOT_DIR, 'research/index.html');
const STEP_LABELS = [
  'Follow the field',
  'Interrogate the paper',
  'Make it usable',
];
const TRUST_LINE = [
  'The pipeline helps with discovery and drafting.',
  'Publication requires editorial review.',
  'The original paper stays one click away.',
].join(' ');

function extractMethodSection(html, surface) {
  const pattern = new RegExp(
    `<section\\b[^>]*data-research-method="${surface}"[^>]*>[\\s\\S]*?<\\/section>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one research-method section`);
  return matches[0][0];
}

function assertStepsInOrder(section, surface) {
  let cursor = -1;
  for (const label of STEP_LABELS) {
    const next = section.indexOf(label);
    assert.ok(next > cursor, `${surface} must place "${label}" in order`);
    cursor = next;
  }
  assert.equal(
    (section.match(/class="research-method__step"/g) || []).length,
    3,
    `${surface} must contain three process steps`,
  );
}

function assertCopyDiscipline(section, surface) {
  const forbidden = [
    [/\bevery\b/i, 'every'],
    [/\balways\b/i, 'always'],
    [/\bnever\b/i, 'never'],
    [/\bnot\b[^.]{0,80}\bbut\b/i, 'not X but Y'],
    [/\bless\b[^.]{0,80}\bmore\b/i, 'less X more Y'],
  ];
  for (const [pattern, label] of forbidden) {
    assert.doesNotMatch(section, pattern, `${surface} must avoid ${label}`);
  }
}

test('homepage explains the paper-to-distill method and links to Research', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const section = extractMethodSection(html, 'homepage');

  assertStepsInOrder(section, 'homepage');
  assertCopyDiscipline(section, 'homepage');
  assert.match(section, /Catch up with the papers shaping AI visibility/);
  assert.match(section, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.match(section, /href="\/research"[^>]*>Browse the research/);
  assert.doesNotMatch(html, /Every number links to its paper/);
  assert.doesNotMatch(html, /Every digest links the paper it came from/);
});

test('Research archive explains the same method before the article inventory', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const section = extractMethodSection(html, 'archive');
  const sectionPosition = html.indexOf(section);
  const articlesPosition = html.indexOf('<section class="articles">');

  assertStepsInOrder(section, 'archive');
  assertCopyDiscipline(section, 'archive');
  assert.match(section, /From paper to practical briefing/);
  assert.match(section, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.ok(sectionPosition < articlesPosition, 'archive method must precede the article inventory');
});

test('research compiler preserves the archive method explainer', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  const rebuilt = generateArchiveHtml(html, articles);

  assert.match(rebuilt, /data-research-method="archive"/);
  assert.match(rebuilt, /From paper to practical briefing/);
});
```

- [ ] **Step 2: Run the focused test and verify the RED state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: three failures stating that the homepage or archive has no research-method section.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/research-method-explainer.test.js
git commit -m "test: define research method explainer contract"
```

---

### Task 2: Add the Shared Explainer and Approved Copy

**Files:**
- Create: `assets/research-method.css`
- Modify: `index.html`
- Modify: `research/index.html`
- Test: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: the `data-research-method`, `research-method__step`, heading, trust-line, and link contract from Task 1.
- Produces: two responsive, accessible explainer sections with a single shared visual system.

- [ ] **Step 1: Create the shared stylesheet**

Create `assets/research-method.css`:

```css
.research-method {
  padding: 4.6rem 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.research-method__inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-md);
}

.research-method__intro {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(320px, 1.1fr);
  gap: 2.5rem;
  align-items: end;
}

.research-method__kicker {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: .68rem;
  font-weight: 500;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.research-method__title {
  max-width: 620px;
  margin-top: .45rem;
  font-family: var(--font-serif);
  font-size: clamp(1.85rem, 4vw, 2.65rem);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -.02em;
}

.research-method__lead {
  max-width: 620px;
  color: var(--color-text-secondary);
  font-size: 1.02rem;
  line-height: 1.72;
}

.research-method__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 2.8rem;
  padding: 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}

.research-method__step {
  min-width: 0;
  padding: 1.55rem 1.5rem 1.7rem 0;
}

.research-method__step + .research-method__step {
  padding-left: 1.5rem;
  border-left: 1px solid var(--color-border);
}

.research-method__ordinal {
  display: block;
  margin-bottom: 1.1rem;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: .72rem;
  font-weight: 600;
  letter-spacing: .12em;
}

.research-method__step-title {
  font-family: var(--font-serif);
  font-size: 1.18rem;
  font-weight: 600;
  line-height: 1.3;
}

.research-method__step-copy {
  margin-top: .65rem;
  color: var(--color-text-secondary);
  font-size: .94rem;
  line-height: 1.68;
}

.research-method__trust {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 2rem;
  margin-top: 1.45rem;
}

.research-method__trust p {
  max-width: 760px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: .67rem;
  line-height: 1.75;
}

.research-method__link {
  flex: none;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: .7rem;
  font-weight: 500;
  letter-spacing: .04em;
  text-decoration: none;
  text-transform: uppercase;
}

.research-method__link:hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.research-method__link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

@media (max-width: 760px) {
  .research-method {
    padding: 3.5rem 0;
  }

  .research-method__intro,
  .research-method__steps {
    grid-template-columns: 1fr;
  }

  .research-method__intro {
    gap: 1.2rem;
    align-items: start;
  }

  .research-method__steps {
    margin-top: 2.2rem;
  }

  .research-method__step {
    padding: 1.35rem 0;
  }

  .research-method__step + .research-method__step {
    padding-left: 0;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

  .research-method__ordinal {
    margin-bottom: .65rem;
  }

  .research-method__trust {
    align-items: flex-start;
    flex-direction: column;
    gap: .9rem;
  }
}
```

- [ ] **Step 2: Load the stylesheet on both pages**

Add the same link before each page's closing `</head>`:

```html
  <link rel="stylesheet" href="/assets/research-method.css">
```

- [ ] **Step 3: Tighten the two existing homepage constructions**

Replace:

```html
<span class="findings-band__note">Every number links to its paper · updated as we publish</span>
```

with:

```html
<span class="findings-band__note">Numbers link to their papers · updated as we publish</span>
```

Replace the “Show the work” paragraph with:

```html
<p>Digests link the papers they came from, and checker results cite their sources. If we cannot source a claim, we leave it out.</p>
```

- [ ] **Step 4: Add the homepage explainer after the findings band**

Insert immediately after the closing `</section>` for `.findings-band`:

```html
    <section class="research-method" data-research-method="homepage" aria-labelledby="home-research-method-title">
      <div class="research-method__inner">
        <div class="research-method__intro">
          <div>
            <div class="research-method__kicker">How the research gets useful</div>
            <h2 class="research-method__title" id="home-research-method-title">Catch up with the papers shaping AI visibility</h2>
          </div>
          <p class="research-method__lead">AI research moves faster than most practitioners can follow. BLURSOR follows the work on retrieval, citations, recommendations and generative search, then turns the useful papers into briefings people can act on.</p>
        </div>
        <ol class="research-method__steps">
          <li class="research-method__step">
            <span class="research-method__ordinal" aria-hidden="true">01</span>
            <h3 class="research-method__step-title">Follow the field</h3>
            <p class="research-method__step-copy">A research pipeline watches arXiv for new work on how AI systems find, trust and surface information.</p>
          </li>
          <li class="research-method__step">
            <span class="research-method__ordinal" aria-hidden="true">02</span>
            <h3 class="research-method__step-title">Interrogate the paper</h3>
            <p class="research-method__step-copy">Promising studies are checked for their method, evidence, useful findings and limits. The headline opens the investigation.</p>
          </li>
          <li class="research-method__step">
            <span class="research-method__ordinal" aria-hidden="true">03</span>
            <h3 class="research-method__step-title">Make it usable</h3>
            <p class="research-method__step-copy">We publish a plain-English distill: what the study found, where the finding applies and what it could change in your work.</p>
          </li>
        </ol>
        <div class="research-method__trust">
          <p>The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.</p>
          <a class="research-method__link" href="/research">Browse the research →</a>
        </div>
      </div>
    </section>
```

- [ ] **Step 5: Add the Research archive explainer before the articles**

Insert between the hero and the `<section class="articles">` block:

```html
  <section class="research-method" data-research-method="archive" aria-labelledby="archive-research-method-title">
    <div class="research-method__inner">
      <div class="research-method__intro">
        <div>
          <div class="research-method__kicker">How a distill is made</div>
          <h2 class="research-method__title" id="archive-research-method-title">From paper to practical briefing</h2>
        </div>
        <p class="research-method__lead">The archive is built for catching up. It follows research on AI visibility and turns the useful papers into readable briefings.</p>
      </div>
      <ol class="research-method__steps">
        <li class="research-method__step">
          <span class="research-method__ordinal" aria-hidden="true">01</span>
          <h3 class="research-method__step-title">Follow the field</h3>
          <p class="research-method__step-copy">A research pipeline watches arXiv for new work on how AI systems find, trust and surface information.</p>
        </li>
        <li class="research-method__step">
          <span class="research-method__ordinal" aria-hidden="true">02</span>
          <h3 class="research-method__step-title">Interrogate the paper</h3>
          <p class="research-method__step-copy">Promising studies are checked for their method, evidence, useful findings and limits. The headline opens the investigation.</p>
        </li>
        <li class="research-method__step">
          <span class="research-method__ordinal" aria-hidden="true">03</span>
          <h3 class="research-method__step-title">Make it usable</h3>
          <p class="research-method__step-copy">We publish a plain-English distill: what the study found, where the finding applies and what it could change in your work.</p>
        </li>
      </ol>
      <div class="research-method__trust">
        <p>The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.</p>
      </div>
    </div>
  </section>
```

- [ ] **Step 6: Run the focused test and verify the GREEN state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 7: Run a direct copy scan**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of ['index.html', 'research/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const section = html.match(/<section\b[^>]*data-research-method[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  if (/\b(every|always|never)\b/i.test(section)) process.exitCode = 1;
  if (/\bnot\b[^.]{0,80}\bbut\b/i.test(section)) process.exitCode = 1;
  if (/\bless\b[^.]{0,80}\bmore\b/i.test(section)) process.exitCode = 1;
}
NODE
```

Expected: exit 0 with no output.

- [ ] **Step 8: Commit the implementation**

```bash
git add assets/research-method.css index.html research/index.html
git commit -m "feat: explain the BLURSOR research method"
```

---

### Task 3: Prove Compiler Safety and Responsive Presentation

**Files:**
- Create: `docs/superpowers/verification/2026-07-24-research-method-explainer.md`
- Verify: `index.html`
- Verify: `research/index.html`
- Verify: `assets/research-method.css`
- Verify: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: both explainers and the existing compiler/test suite.
- Produces: a review receipt with automated, idempotence, desktop, and mobile evidence.

- [ ] **Step 1: Run the complete automated suite**

```bash
node --test tests/*.test.js
```

Expected: 48 tests pass, 0 fail.

- [ ] **Step 2: Run the real research compiler**

```bash
node scripts/build-research-index.js
```

Expected:

```text
Compiled and verified 30 research article(s)
```

- [ ] **Step 3: Confirm the compiler preserved the archive explainer**

```bash
node --test tests/research-method-explainer.test.js
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 4: Confirm compiler idempotence**

```bash
git diff --exit-code
```

Expected: no compiler-generated diff beyond the committed feature files.

- [ ] **Step 5: Validate HTML parseability and local routes**

Start a local server:

```bash
python3 -m http.server 4173
```

Verify:

```bash
curl -fsS http://127.0.0.1:4173/ >/dev/null
curl -fsS http://127.0.0.1:4173/research/ >/dev/null
curl -fsS http://127.0.0.1:4173/assets/research-method.css >/dev/null
```

Expected: all three requests exit 0.

- [ ] **Step 6: Inspect the homepage and Research archive visually**

Capture and inspect:

- homepage at 1440 × 1100;
- homepage at 390 × 844;
- Research archive at 1440 × 1100; and
- Research archive at 390 × 844.

Check that:

- the process reads left-to-right on desktop and top-to-bottom on mobile;
- step boundaries and ordinals remain visible;
- body copy has sufficient contrast;
- headings and paragraphs wrap without clipping or horizontal overflow;
- the homepage Research link has visible hover and focus treatment;
- the archive explainer appears before the article inventory; and
- neither section feels like an unrelated pasted component.

- [ ] **Step 7: Write the verification receipt**

Create `docs/superpowers/verification/2026-07-24-research-method-explainer.md`.
Use the title `BLURSOR Research Method Explainer Verification`, date
`2026-07-24`, branch `codex/research-method-explainer`, and base
`origin/main`.

Record the observed focused-test count, complete-suite count, compiler article
count, idempotence result, and three local route checks under `Automated
checks`. Under `Copy checks`, state the observed results for the forbidden-word
scan, contrast-formula scan, unsupported-statistic check, and transparency
copy. Under `Visual checks`, name all four screenshot paths and record the
layout result at each viewport. Under `Boundaries`, state whether article
content, n8n, remote branches, merge state, or production changed. End with
`READY FOR REVIEW` only if all checks passed; otherwise write `HOLD` followed
by the observed blocker. The receipt must contain only observed results.

- [ ] **Step 8: Commit the verification receipt**

```bash
git add docs/superpowers/verification/2026-07-24-research-method-explainer.md
git commit -m "docs: verify research method explainer"
```

- [ ] **Step 9: Run final branch checks**

```bash
node --test tests/*.test.js
git diff --check
git status --short --branch
git log --oneline origin/main..HEAD
```

Expected: all tests pass, diff check exits 0, working tree is clean, and the branch contains the design, test, implementation, and verification commits.
