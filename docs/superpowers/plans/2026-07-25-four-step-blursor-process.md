# Four-Step BLURSOR Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-step research explainer with the approved four-step BLURSOR model that connects research discovery, distillation, publication, and tools.

**Architecture:** Keep the existing ordered-list hero component on both static HTML surfaces. Extend its shared copy contract to four rows, vary only the `publish the findings` treatment to avoid a Research-page self-link, share the `tools` link and link styling, and remove the retired trust-line element and CSS.

**Tech Stack:** Static HTML and CSS, Node test runner, Research archive compiler, Codex in-app Browser.

## Global Constraints

- Use `How BLURSOR works` as the process heading on both pages.
- Preserve the exact approved four paragraphs and their order.
- Link `publish the findings` to `/research` only on the homepage.
- Emphasize `publish the findings` in red without a link on `/research/`.
- Link `tools` to `/ai-crawler-checker` on both pages.
- Underline links and retain visible hover and keyboard-focus states.
- Remove the retired trust line from both pages and remove its unused CSS.
- Preserve ordered-list semantics and decorative two-digit ordinals.
- Do not change the homepage headline, hero columns, carousel, Research inventory, article content, n8n, or production.

---

### Task 1: Implement and verify the four-step BLURSOR process

**Files:**
- Modify: `tests/research-method-explainer.test.js:13-25`
- Modify: `tests/research-method-explainer.test.js:131-166`
- Modify: `tests/research-method-explainer.test.js:186-303`
- Modify: `index.html:686-703`
- Modify: `research/index.html:529-546`
- Modify: `assets/research-method.css:65-121`

**Interfaces:**
- Consumes: `extractProcess()`, `assertProcessCopyInOrder()`, and the existing `.research-process*` component classes.
- Produces: two four-item ordered lists with shared copy, surface-specific Research-link behavior, shared Tools links, and no trust-line element.

- [ ] **Step 1: Write the failing process-contract tests**

Replace `PROCESS_COPY` with:

```js
const PROCESS_COPY = [
  'We monitor new research papers on AI visibility, LLM ranking factors, and how AI finds and cites sources.',
  'We filter for findings with practical implications and distill the useful parts into readable articles.',
  'We publish the findings, supporting evidence, and what they could mean for your work.',
  'We turn useful findings into tools that help you investigate problems and improve AI visibility.',
];
```

Delete `TRUST_LINE`. Update `assertProcessCopyInOrder()` to require four
`.research-process__step` elements.

Add a helper that verifies:

```js
function assertProcessLinks(process, surface) {
  assert.match(
    process,
    /<h2\b[^>]*>\s*How BLURSOR works\s*<\/h2>/,
    `${surface} must use the approved process heading`,
  );
  assert.match(
    process,
    /<a\b(?=[^>]*class="research-process__link")(?=[^>]*href="\/ai-crawler-checker")[^>]*>\s*tools\s*<\/a>/,
    `${surface} must link tools to the crawler checker`,
  );
  if (surface === 'homepage') {
    assert.match(
      process,
      /<a\b(?=[^>]*class="research-process__link")(?=[^>]*href="\/research")[^>]*>\s*publish the findings\s*<\/a>/,
      'homepage must link published findings to Research',
    );
  } else {
    assert.doesNotMatch(
      process,
      /<a\b[^>]*href="\/research"[^>]*>/,
      'Research process must not link to its current page',
    );
    assert.match(
      process,
      /<span\b[^>]*class="research-process__emphasis"[^>]*>\s*publish the findings\s*<\/span>/,
      'Research process must retain non-interactive red emphasis',
    );
  }
  assert.doesNotMatch(
    process,
    /pipeline helps with discovery|publication requires editorial review|original paper stays one click away/i,
    `${surface} must omit the retired trust line`,
  );
}
```

Call the helper from the homepage, Research archive, and compiler-preservation
tests. Remove every assertion that expects `TRUST_LINE`.

Update the CSS test to require contrast only for `.research-process__copy`.
Add source-contract assertions that `.research-process__link` has an underline
and `.research-process__link:focus-visible` has a visible outline.

- [ ] **Step 2: Run the focused suite and verify the expected failure**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: failures report the old three-step copy, missing fourth row, retired
headings, missing page-aware links, and the still-present trust line.

- [ ] **Step 3: Implement the homepage process**

In `index.html`, replace the process heading with:

```html
<h2 class="research-process__kicker" id="home-research-process-title">How BLURSOR works</h2>
```

Use the four approved paragraphs. In step 03, render:

```html
We <a class="research-process__link" href="/research">publish the findings</a>, supporting evidence, and what they could mean for your work.
```

In step 04, render:

```html
We turn useful findings into <a class="research-process__link" href="/ai-crawler-checker">tools</a> that help you investigate problems and improve AI visibility.
```

Remove `.research-process__trust`.

- [ ] **Step 4: Implement the Research archive process**

In `research/index.html`, use the same heading and four paragraphs. In step 03,
render:

```html
We <span class="research-process__emphasis">publish the findings</span>, supporting evidence, and what they could mean for your work.
```

Use the same `/ai-crawler-checker` link for `tools` in step 04. Remove
`.research-process__trust`.

- [ ] **Step 5: Implement shared emphasis and link styling**

In `assets/research-method.css`, delete `.research-process__trust` and add:

```css
.research-process__link,
.research-process__emphasis {
  color: var(--color-accent);
}

.research-process__link {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.research-process__link:visited {
  color: var(--color-accent);
}

.research-process__link:hover {
  text-decoration-thickness: 2px;
}

.research-process__link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
```

- [ ] **Step 6: Run focused and full regression checks**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
node scripts/build-research-index.js
node scripts/build-research-index.js
git diff --check
```

Expected: focused tests pass, all 50 repository tests pass, both compiler runs
compile and verify 30 articles, the second run is idempotent, and the diff
check is clean.

- [ ] **Step 7: Complete rendered and interaction QA**

Serve the worktree locally. Use the in-app Browser to inspect `/` and
`/research/` at `1440 × 900`, `1280 × 800`, and `390 × 844`.

For both surfaces:

- confirm `How BLURSOR works` and ordinals `01` through `04`;
- confirm the complete process is visible without desktop scrolling;
- confirm no overlap, clipping, or horizontal overflow;
- confirm no framework overlay or console errors/warnings;
- focus the `tools` link and confirm the visible focus state;
- confirm homepage `publish the findings` is a link;
- confirm Research `publish the findings` is non-interactive emphasis; and
- capture screenshots outside the repository.

- [ ] **Step 8: Commit, push, and verify the deployed preview**

Commit the implementation:

```bash
git add index.html research/index.html assets/research-method.css tests/research-method-explainer.test.js
git commit -m "feat: connect BLURSOR research to tools"
git push -u origin codex/research-method-explainer
```

Wait for the Cloudflare workflow, extract the immutable deployment URL, and
repeat the `1280 × 800` homepage and Research checks against that deployment
before reporting completion.
