# BLURSOR Homepage Hero Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's checker-led closing thought with an evidence-bounded research-and-tools message while preserving the approved split-hero layout.

**Architecture:** Extend the existing homepage hero regression contract to assert the complete visible headline and supporting line before editing the HTML. Change only the animated word spans and supporting paragraph, then rerun compiler, repository, responsive, and above-fold checks. Append the observed copy-verification evidence to the existing hero verification record.

**Tech Stack:** Static HTML5, existing focus-word CSS animation, Node.js built-in test runner, CommonJS Research compiler, bundled Playwright visual verification.

## Global Constraints

- Use the exact headline: `AI decides who gets recommended. We study why and give you tools to improve AI visibility.`
- Use the exact supporting line: `Research-based insights into how AI systems retrieve, cite, and recommend information.`
- Emphasize `recommended.`, `why`, and `tools` with the existing `<em class="focus-word">` treatment. Keep `AI visibility.` in the standard headline style.
- Preserve sequential focus-word animation indices beginning at `0`.
- Preserve the split hero, process copy, trust line, CTA labels, CTA destinations, accessibility semantics, and responsive structure.
- Remove the retired headline and supporting sentence from the homepage.
- Keep the complete process above the fold at 1440 × 900 and 1280 × 800.
- Preserve zero horizontal overflow at 1440 × 900, 1280 × 800, and 390 × 844.
- Preserve all Research articles, archive/compiler behavior, sitemap/feed inventory, checker implementation, and generated metadata.
- Work only on `codex/research-method-explainer`; do not merge or deploy to production.

---

### Task 1: Revise and Verify the Homepage Hero Message

**Files:**
- Modify: `tests/research-method-explainer.test.js`
- Modify: `index.html`
- Modify: `docs/superpowers/verification/2026-07-25-research-hero-integration.md`

**Interfaces:**
- Consumes: `extractHero(html, 'home-title', 'homepage')` and the existing homepage hero contract in `tests/research-method-explainer.test.js`.
- Produces: one exact visible H1 sentence, one exact supporting sentence, sequential `focus-word` indices `0` through `14`, and refreshed responsive evidence.

- [ ] **Step 1: Add the failing visible-copy and emphasis contract**

Inside the existing homepage hero test, immediately after `const process = extractProcess(hero, 'homepage');`, add:

```js
  const visibleHeroText = hero
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
```

Add these assertions before the CTA assertions:

```js
  assert.match(
    visibleHeroText,
    /AI decides who gets recommended\. We study why and give you tools to improve AI visibility\./,
  );
  assert.match(
    visibleHeroText,
    /Research-based insights into how AI systems retrieve, cite, and recommend information\./,
  );
  assert.match(hero, /<em class="focus-word" style="--i:11">tools<\/em>/);
  assert.match(hero, /<span class="focus-word" style="--i:14">AI visibility\.<\/span>/);
  assert.doesNotMatch(visibleHeroText, /show you what it sees on your site/);
  assert.doesNotMatch(
    visibleHeroText,
    /Research-based insights and practical tools to improve your AI visibility\./,
  );
```

- [ ] **Step 2: Run the focused test and verify the RED state**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: one homepage failure because the visible hero text still contains the
previous `build tools to help you improve your AI visibility` wording and does
not contain the approved replacement.

- [ ] **Step 3: Replace the animated closing thought**

Keep focus-word indices `0` through `8` unchanged. Replace the spans beginning at index `9` with:

```html
            <span class="focus-word" style="--i:9">give</span>
            <span class="focus-word" style="--i:10">you</span>
            <em class="focus-word" style="--i:11">tools</em>
            <span class="focus-word" style="--i:12">to</span>
            <span class="focus-word" style="--i:13">improve</span>
            <span class="focus-word" style="--i:14">AI visibility.</span>
```

Replace the supporting paragraph with:

```html
          <p class="hero__sub">Research-based insights into how AI systems retrieve, cite, and recommend information.</p>
```

Do not alter the process column, CTA block, or hero structure.

- [ ] **Step 4: Run focused, full, compiler, and branch checks**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
node scripts/build-research-index.js
node --test tests/research-method-explainer.test.js
git diff --check
```

Expected:

- focused suite: 4 passed, 0 failed;
- complete suite: 49 passed, 0 failed;
- compiler: `Compiled and verified 30 research article(s)`;
- focused suite after compilation: 4 passed, 0 failed; and
- whitespace check: exit 0 with no output.

- [ ] **Step 5: Capture and inspect the revised homepage**

Serve the worktree locally and use the available browser runtime without installing dependencies. Capture:

```text
/Users/alex/.codex/tmp/blursor-homepage-message-2026-07-25/home-1440x900.png
/Users/alex/.codex/tmp/blursor-homepage-message-2026-07-25/home-1280x800.png
/Users/alex/.codex/tmp/blursor-homepage-message-2026-07-25/home-390x844.png
```

At each viewport, record:

```js
const processBottom = await page.locator('[data-research-process="homepage"]').evaluate(
  (element) => element.getBoundingClientRect().bottom,
);
const viewportHeight = page.viewportSize().height;
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
```

Expected:

- `processBottom <= viewportHeight` at 1440 × 900 and 1280 × 800;
- `overflow` is `false` at all three sizes;
- the headline and supporting line wrap without overlap or clipping;
- both CTAs remain visible and distinct on desktop;
- mobile keeps the editorial copy, actions, and process in the approved order; and
- the page-at-rest console and page-error collections are empty.

- [ ] **Step 6: Append observed evidence to the verification record**

Append a `## Homepage message amendment` section to `docs/superpowers/verification/2026-07-25-research-hero-integration.md`. Record:

- the exact headline and supporting line;
- the focused, complete, compiler, and post-compiler focused results;
- the three screenshot paths;
- the measured process bottoms, viewport heights, and overflow values;
- the visual wrapping and CTA result;
- the absence of console and page errors; and
- confirmation that the evidence belongs to the headline-amendment commit
  which contains the verification update.

Do not record intended values or placeholders. The containing git commit is
the amendment's commit evidence, so the appended section does not need to
predict its own hash.

- [ ] **Step 7: Commit the complete change**

```bash
git add tests/research-method-explainer.test.js index.html docs/superpowers/verification/2026-07-25-research-hero-integration.md
git commit -m "feat: sharpen homepage research and tools message"
```

- [ ] **Step 8: Run the final branch-range audit**

Run:

```bash
node --test tests/*.test.js
git diff --check origin/main..HEAD
git status --short --branch
```

Expected: 49 tests passed, branch-range whitespace check exits 0, and the worktree is clean.
