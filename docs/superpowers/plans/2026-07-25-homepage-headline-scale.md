# Homepage Headline Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the homepage H1 modestly so it reads comfortably on a 13-inch Mac while preserving the approved copy, natural wrapping, emphasis, layout, and mobile scale.

**Architecture:** Keep the existing responsive typography structure and change only two values in `index.html`: the desktop clamp maximum and the existing `820px` breakpoint override. Validate computed font sizes and rendered wrapping in the in-app Browser; do not add a source-value test for an intentional visual-design constant.

**Tech Stack:** Static HTML and CSS, Node test runner, Codex in-app Browser.

## Global Constraints

- Preserve the exact homepage headline wording.
- Preserve natural text flow with only `recommended.`, `why`, and `tools` emphasized.
- Use a `3.05rem` desktop maximum.
- Use `2.35rem` below the existing `820px` breakpoint.
- Keep the existing `2.15rem` size below `560px`.
- Do not change line height, column widths, Research archive typography, carousel behavior, or mobile document order.
- Keep the work on `codex/research-method-explainer`; do not merge or deploy production.

---

### Task 1: Reduce and verify the homepage headline scale

**Files:**
- Modify: `index.html:203-209`
- Modify: `index.html:609-627`

**Interfaces:**
- Consumes: the existing `.hero__title` rule and its `820px` and `560px` responsive overrides.
- Produces: computed H1 sizes of `51.85px` at a `1440px` viewport, `39.95px` at a `712px` viewport, and the unchanged `36.55px` at a `390px` viewport with the current `17px` root size.

- [ ] **Step 1: Run the rendered behavior check before implementation**

Open the local homepage in the in-app Browser and record the computed
`font-size` for `#home-title` at `1440 × 900`, `712 × 800`, and `390 × 844`.

Expected before the change:

```text
1440px: 56.95px — FAIL against the approved 51.85px target
712px: 43.35px — FAIL against the approved 39.95px target
390px: 36.55px — PASS because mobile remains unchanged
```

- [ ] **Step 2: Implement the two approved CSS values**

In the base rule, change:

```css
font-size: clamp(2.65rem, 4.6vw, 3.35rem);
```

to:

```css
font-size: clamp(2.65rem, 4.6vw, 3.05rem);
```

At the existing `@media (max-width: 820px)` breakpoint, change:

```css
.hero__title { font-size: 2.55rem; }
```

to:

```css
.hero__title { font-size: 2.35rem; }
```

Do not modify the `2.15rem` rule at `560px`.

- [ ] **Step 3: Verify the focused rendered behavior**

Reload the local homepage at all three viewports and evaluate:

```js
(() => {
  const heading = document.querySelector('#home-title');
  return {
    fontSize: getComputedStyle(heading).fontSize,
    overflow: document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    text: heading.textContent.trim(),
    emphasis: [...heading.querySelectorAll('em')].map((node) =>
      node.textContent
    ),
  };
})()
```

Expected:

```text
1440px: 51.85px
712px: 39.95px
390px: 36.55px
overflow: 0 at all three widths
emphasis: recommended., why, tools
```

- [ ] **Step 4: Run repository regression checks**

Run:

```bash
node --test tests/*.test.js
git diff --check
```

Expected: all 50 tests pass and the diff check exits cleanly.

- [ ] **Step 5: Complete visual and interaction QA**

At `1440 × 900`, `712 × 800`, and `390 × 844`:

- confirm the page title and meaningful hero content;
- confirm no framework overlay or console errors/warnings;
- inspect wrapping, overlap, clipping, and horizontal overflow;
- capture screenshots outside the repository; and
- focus `Browse the research` and confirm its visible focus state without navigation.

- [ ] **Step 6: Commit, push, and verify the preview**

Commit the CSS change separately:

```bash
git add index.html
git commit -m "fix: calm homepage headline scale"
git push -u origin codex/research-method-explainer
```

Wait for the Cloudflare workflow, extract the immutable deployment URL, and
repeat the `712 × 800` rendered check against that deployment before reporting
completion.
