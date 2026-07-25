# Homepage Findings Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's eight generic research cards with the approved five-card research-and-tool sequence, keeping the AI Crawler Checker prominent in the centre.

**Architecture:** Keep the existing static HTML and CSS carousel. Define the exact primary sequence once in markup, repeat it once with inaccessible duplicates for the infinite loop, and protect the contract with Node tests that inspect the homepage source.

**Tech Stack:** Static HTML/CSS, Node.js built-in test runner, Playwright for browser verification

## Global Constraints

- Preserve the exact approved card order and visible copy from `docs/superpowers/specs/2026-07-25-homepage-findings-carousel-design.md`.
- Keep four research cards and one red AI Crawler Checker card.
- Keep duplicate cards `aria-hidden="true"` and `tabindex="-1"`.
- Preserve pause-on-hover, pause-on-focus, and reduced-motion behaviour.
- Use a `42s` carousel duration.
- Do not modify research article content, generated archive surfaces, deployment configuration, or production state.

---

### Task 1: Add the carousel regression contract

**Files:**
- Modify: `tests/research-method-explainer.test.js`
- Test: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: homepage HTML from `HOME_PATH` and the existing static `findings-track` markup.
- Produces: a source-level contract for the five primary cards, five inaccessible duplicates, approved order, links, copy, source labels, red tool treatment, and `42s` duration.

- [ ] **Step 1: Add the failing carousel test**

Add helpers that extract the single `.findings-track`, identify direct card anchors, normalize their visible text, and distinguish primary cards from `.is-duplicate` cards.

Add an exact expected-card array:

```js
const EXPECTED_FINDING_CARDS = [
  {
    href: '/research/llm-brand-reputation-citations-third-party',
    number: '85.7%',
    line: 'Brand-reputation citations pointed to third-party pages. Find the domains AI cites in your category.',
    source: 'Source · arXiv:2606.25787',
    tool: false,
  },
  {
    href: '/research/citation-failures-generative-engine-agentgeo',
    number: '1 in 10',
    line: 'citation failures came from technical problems. Check access, JavaScript rendering and extractability before rewriting.',
    source: 'Source · arXiv:2603.09296',
    tool: false,
  },
  {
    href: '/ai-crawler-checker',
    number: 'AI Crawler Checker',
    line: 'See what AI crawlers can reach, read and extract from your page.',
    source: 'Check your page →',
    tool: true,
  },
  {
    href: '/research/structured-data-rag-entity-pages',
    number: '+29.6%',
    line: 'In one RAG setup, entity-focused pages improved answer accuracy; appended JSON-LD had little effect.',
    source: 'Source · arXiv:2603.10700',
    tool: false,
  },
  {
    href: '/research/paraphrase-brittleness-brand-recommendation',
    number: '21–32 pts',
    line: 'Rewording the same question cut overlap between brand recommendations by 21–32 points. Test several phrasings for each intent.',
    source: 'Source · arXiv:2605.27440',
    tool: false,
  },
];
```

The test must assert:

- one `.findings-track`;
- five primary cards and five duplicate cards;
- exact order and normalized copy for both sequences;
- only the checker card has `finding-card--cta`;
- all duplicates have `aria-hidden="true"` and `tabindex="-1"`;
- obsolete research-card routes are absent from the track;
- `.findings-track` declares `animation: slideFindings 42s linear infinite`;
- reduced motion still hides `.finding-card.is-duplicate`.

- [ ] **Step 2: Run the focused test and confirm the expected failure**

Run:

```bash
node --test tests/research-method-explainer.test.js
```

Expected: the new carousel contract fails because the homepage still contains eight primary research cards, eight duplicates, no tool card, and a `70s` duration.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/research-method-explainer.test.js
git commit -m "test: define homepage findings carousel contract"
```

### Task 2: Implement the approved five-card sequence

**Files:**
- Modify: `index.html`
- Test: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: `EXPECTED_FINDING_CARDS` and the existing `.finding-card` component styles.
- Produces: the exact five-card primary sequence, one inaccessible duplicate sequence, red checker treatment, and a `42s` loop.

- [ ] **Step 1: Restore the red tool-card CSS**

Add the established `.finding-card--cta` treatment:

```css
.finding-card--cta {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.finding-card--cta .finding-card__num {
  color: #fff;
  font-family: var(--font-serif);
  font-size: 1.9rem;
  line-height: 1.15;
  letter-spacing: 0;
}

.finding-card--cta .finding-card__line {
  color: rgba(255, 255, 255, .86);
}

.finding-card--cta .finding-card__src {
  color: #fff;
  font-weight: 600;
}

.finding-card--cta:hover,
.finding-card--cta:focus-visible {
  border-color: #fff;
}
```

- [ ] **Step 2: Set the loop duration**

Change:

```css
animation: slideFindings 70s linear infinite;
```

to:

```css
animation: slideFindings 42s linear infinite;
```

- [ ] **Step 3: Replace the card markup**

Replace the eight primary research cards and eight duplicates with the exact sequence from the design specification. Apply `finding-card finding-card--cta` to the primary checker card. Apply `finding-card finding-card--cta is-duplicate`, `aria-hidden="true"`, and `tabindex="-1"` to its duplicate.

Keep the four research source labels in `Source <span>·</span> arXiv:...` markup so their visible normalized text matches the test contract.

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
```

Expected: all focused and repository tests pass.

- [ ] **Step 5: Commit the implementation**

```bash
git add index.html
git commit -m "feat: focus homepage carousel on actionable findings"
```

### Task 3: Verify the complete carousel

**Files:**
- Create: `docs/superpowers/verification/2026-07-25-homepage-findings-carousel.md`
- Verify: `index.html`
- Verify: `tests/research-method-explainer.test.js`

**Interfaces:**
- Consumes: completed five-card carousel.
- Produces: test, link, desktop, mobile, reduced-motion, hover, and keyboard-focus receipts.

- [ ] **Step 1: Verify route targets**

Confirm these local targets exist:

```text
research/llm-brand-reputation-citations-third-party.html
research/citation-failures-generative-engine-agentgeo.html
ai-crawler-checker.html
research/structured-data-rag-entity-pages.html
research/paraphrase-brittleness-brand-recommendation.html
```

- [ ] **Step 2: Run final automated verification**

Run:

```bash
node --test tests/research-method-explainer.test.js
node --test tests/*.test.js
git diff --check
```

Record exact pass counts in the verification file.

- [ ] **Step 3: Inspect desktop and mobile**

Serve the worktree:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Using Playwright, inspect and capture:

- desktop viewport `1440 × 1000`;
- mobile viewport `390 × 844`;
- the red checker card in the third position;
- readable card text without clipping;
- tool-card hover and keyboard focus;
- paused animation while the carousel contains focus;
- reduced-motion rendering with five wrapped primary cards and no visible duplicates.

- [ ] **Step 4: Write the verification receipt**

Document:

- branch and commit;
- exact five-card order;
- test commands and pass counts;
- route-target results;
- desktop, mobile, and reduced-motion observations;
- remaining limitations, if any;
- confirmation that no merge or production deployment occurred.

- [ ] **Step 5: Commit verification**

```bash
git add docs/superpowers/verification/2026-07-25-homepage-findings-carousel.md
git commit -m "docs: verify homepage findings carousel"
```

- [ ] **Step 6: Push the existing branch**

```bash
git push origin codex/research-method-explainer
```

Expected: the existing pull request updates; production remains unchanged until the pull request is merged and deployed.
