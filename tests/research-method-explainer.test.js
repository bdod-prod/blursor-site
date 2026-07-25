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
const RESEARCH_METHOD_CSS_PATH = path.join(ROOT_DIR, 'assets/research-method.css');
const POSITIONING_LINE = 'Research-based insights into how AI systems retrieve, cite, and recommend information.';
const PROCESS_COPY = [
  'We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.',
  'We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.',
  'We publish the findings, the evidence behind them, and what they could mean for your work.',
];
const TRUST_LINE = [
  'The pipeline helps with discovery and drafting.',
  'Publication requires editorial review.',
  'The original paper stays one click away.',
].join(' ');
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

function extractHero(html, headingId, surface) {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*class="[^"]*\\bhero\\b[^"]*")(?=[^>]*aria-labelledby="${headingId}")[^>]*>[\\s\\S]*?<\\/section>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one labelled hero`);
  return matches[0][0];
}

function extractElement(html, tagName, selector, surface) {
  const selectorRequirement = selector.startsWith('#')
    ? `(?=[^>]*id="${selector.slice(1)}")`
    : `(?=[^>]*class="[^"]*\\b${selector.slice(1)}\\b[^"]*")`;
  const pattern = new RegExp(
    `<${tagName}\\b${selectorRequirement}[^>]*>[\\s\\S]*?<\\/${tagName}>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one ${selector} element`);
  return matches[0][0];
}

function normalizeVisibleText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function extractFindingCards(html) {
  const track = extractElement(html, 'div', '.findings-track', 'homepage');
  const cards = [
    ...track.matchAll(/<a\b(?=[^>]*class="[^"]*\bfinding-card\b[^"]*")[^>]*>[\s\S]*?<\/a>/g),
  ];

  return cards.map(([card]) => {
    const openingTag = card.match(/^<a\b[^>]*>/)?.[0] || '';
    const textFor = (className) => {
      const trailingMarkup = className === 'finding-card__src'
        ? '\\s*<\\/a>'
        : '\\s*<span\\b[^>]*class="finding-card__';
      const match = card.match(new RegExp(
        `<span\\b[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/span>${trailingMarkup}`,
      ));
      assert.ok(match, `finding card must contain .${className}`);
      return normalizeVisibleText(match[1]);
    };
    const attribute = (name) => openingTag.match(
      new RegExp(`\\b${name}="([^"]*)"`),
    )?.[1] || null;

    return {
      href: attribute('href'),
      number: textFor('finding-card__num'),
      line: textFor('finding-card__line'),
      source: textFor('finding-card__src'),
      tool: /\bfinding-card--cta\b/.test(openingTag),
      duplicate: /\bis-duplicate\b/.test(openingTag),
      ariaHidden: attribute('aria-hidden'),
      tabindex: attribute('tabindex'),
    };
  });
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
    /<div\b(?=[^>]*class="[^"]*\bresearch-process\b[^"]*")(?=[^>]*role="region")(?=[^>]*aria-labelledby="[^"]+")[^>]*>/,
    `${surface} research process must expose its label through region semantics`,
  );
  assert.match(
    process,
    /<ol\b(?=[^>]*class="research-process__steps")(?=[^>]*role="list")[^>]*>/,
    `${surface} process list must explicitly retain list semantics`,
  );
}

function assertCopyDiscipline(section, surface) {
  const forbidden = [
    [/\bevery\b/i, 'every'],
    [/\balways\b/i, 'always'],
    [/\bnever\b/i, 'never'],
    [/\bnot\b[^.]{0,80}\bbut\b/i, 'not X but Y'],
    [/\bless\b[^.]{0,80}\bmore\b/i, 'less X more Y'],
    [/\brather\s+than\b/i, 'rather than'],
    [/\binstead\s+of\b/i, 'instead of'],
    [/2,800/, 'retired 2,800 volume claim'],
    [/70,000/, 'retired 70,000 volume claim'],
    [/March 2026/, 'retired March 2026 volume claim'],
  ];
  for (const [pattern, label] of forbidden) {
    assert.doesNotMatch(section, pattern, `${surface} must avoid ${label}`);
  }
}

test('homepage hero leads with Research and explains the paper-to-distill process', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const hero = extractHero(html, 'home-title', 'homepage');
  const process = extractProcess(hero, 'homepage');
  const heading = extractElement(hero, 'h1', '#home-title', 'homepage');
  const subheading = extractElement(hero, 'p', '.hero__sub', 'homepage');
  const actions = extractElement(hero, 'div', '.research-hero__actions', 'homepage');
  const focusIndices = [...heading.matchAll(/class="focus-word" style="--i:(\d+)"/g)]
    .map((match) => Number(match[1]));

  assertProcessCopyInOrder(process, 'homepage');
  assertResearchProcessListSemantics(process, 'homepage');
  assertCopyDiscipline(process, 'homepage');
  assert.match(hero, new RegExp(POSITIONING_LINE.replace(/[.]/g, '\\.')));
  assert.equal(
    normalizeVisibleText(heading),
    'AI decides who gets recommended. We study why and give you tools to improve AI visibility.',
    'homepage heading must retain the approved focus message',
  );
  assert.equal(
    normalizeVisibleText(subheading),
    POSITIONING_LINE,
    'homepage subheading must retain the approved positioning line',
  );
  for (const [phrase, index] of [
    ['recommended.', 4],
    ['why', 7],
    ['tools', 11],
  ]) {
    assert.match(
      heading,
      new RegExp(`<em class="focus-word" style="--i:${index}">${phrase.replace(/[.]/g, '\\.')}<\\/em>`),
      `homepage heading must emphasize ${phrase} at focus index ${index}`,
    );
  }
  assert.deepEqual(
    focusIndices,
    Array.from({ length: 15 }, (_, index) => index),
    'homepage focus indices must run sequentially from 0 through 14',
  );
  assert.match(
    heading,
    /<span class="focus-word" style="--i:14">AI visibility\.<\/span>/,
    'homepage heading must render AI visibility without the italic emphasis treatment',
  );
  assert.match(
    actions,
    /<div\b(?=[^>]*role="group")(?=[^>]*aria-label="Explore BLURSOR")[^>]*>/,
    'homepage actions must expose their existing label through group semantics',
  );
  assert.doesNotMatch(normalizeVisibleText(hero), /show you what it sees on your site/);
  assert.doesNotMatch(
    normalizeVisibleText(subheading),
    /Research-based insights and practical tools to improve your AI visibility\./,
  );
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

test('research process muted text meets contrast requirements on the archive surface', () => {
  const css = fs.readFileSync(RESEARCH_METHOD_CSS_PATH, 'utf8');
  const color = css.match(/--research-process-muted:\s*(#[0-9a-f]{6})/i)?.[1];

  assert.ok(color, 'research process must define a shared muted color');
  for (const selector of [
    '.research-process__copy',
    '.research-process__trust',
  ]) {
    assert.match(
      css,
      new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\{[^}]*color:\\s*var\\(--research-process-muted\\)`, 's'),
      `${selector} must use the shared muted color`,
    );
  }

  const relativeLuminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const contrast = (lighter, darker) => (lighter + 0.05) / (darker + 0.05);
  const foreground = relativeLuminance(color);
  const background = relativeLuminance('#f5f1ea');
  const ratio = contrast(Math.max(foreground, background), Math.min(foreground, background));

  assert.ok(ratio >= 4.5, `muted text contrast must be at least 4.5:1; received ${ratio.toFixed(2)}:1`);
});

test('homepage carousel keeps five actionable cards with the crawler checker centered', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const cards = extractFindingCards(html);
  const primaryCards = cards.filter((card) => !card.duplicate);
  const duplicateCards = cards.filter((card) => card.duplicate);
  const comparableCard = ({ href, number, line, source, tool }) => ({
    href,
    number,
    line,
    source,
    tool,
  });

  assert.deepEqual(
    primaryCards.map(comparableCard),
    EXPECTED_FINDING_CARDS,
    'homepage must retain the approved five-card order and visible copy',
  );
  assert.deepEqual(
    duplicateCards.map(comparableCard),
    EXPECTED_FINDING_CARDS,
    'the seamless loop must repeat the approved five-card order exactly once',
  );
  assert.equal(
    primaryCards.findIndex((card) => card.tool),
    2,
    'the crawler checker must remain the third primary card',
  );
  for (const card of duplicateCards) {
    assert.equal(card.ariaHidden, 'true', 'duplicate cards must be hidden from assistive technology');
    assert.equal(card.tabindex, '-1', 'duplicate cards must stay out of keyboard order');
  }

  for (const card of EXPECTED_FINDING_CARDS) {
    const routePath = card.href === '/ai-crawler-checker'
      ? path.join(ROOT_DIR, 'ai-crawler-checker.html')
      : path.join(ROOT_DIR, `${card.href.slice(1)}.html`);
    assert.ok(fs.existsSync(routePath), `${card.href} must resolve to a local page`);
  }

  assert.match(
    html,
    /\.findings-track\s*\{[^}]*animation:\s*slideFindings 42s linear infinite;/s,
    'the shorter card sequence must keep approximately the established travel speed',
  );
  assert.match(
    html,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.finding-card\.is-duplicate\s*\{\s*display:\s*none;/,
    'reduced motion must hide the duplicate loop',
  );

  for (const retiredRoute of [
    '/research/cultural-reasoning-gap-llms',
    '/research/self-evolving-agent-health-community-notes',
    '/research/generative-search-ai-cited-sources',
    '/research/llm-citation-hallucination-agentic-retrieval',
    '/research/rag-brand-visibility-tier-failures',
    '/research/semantic-metadata-agent-retrieval-tradeoff',
    '/research/rank-zero-honeypot-agent-collapse',
  ]) {
    assert.equal(
      cards.some((card) => card.href === retiredRoute),
      false,
      `${retiredRoute} must not remain in the focused carousel`,
    );
  }
});
