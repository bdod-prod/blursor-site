'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'https://blursor.ai';
const AUTHOR_NAME = 'Alex Rostovtsev';
const AUTHOR_PATH = '/author/alex-rostovtsev';
const AUTHOR_URL = `${BASE_URL}${AUTHOR_PATH}`;
const RSS_FEED_URL = `${BASE_URL}/research/feed.xml`;
const RSS_FEED_LINK_TAG = `<link rel="alternate" type="application/rss+xml" title="BLURSOR Research RSS" href="${RSS_FEED_URL}">`;
const STATIC_ROUTES = [
  { url: `${BASE_URL}/`, file: 'index.html' },
  { url: `${BASE_URL}/ai-crawler-checker`, file: 'ai-crawler-checker.html' },
  { url: `${BASE_URL}/research`, file: 'research/index.html' },
  { url: AUTHOR_URL, file: 'author/alex-rostovtsev.html' },
];
const LEGACY_SOFT_404_PATHS = [
  '/research/rag-ranking-signal-amplification',
  '/research/brand-mention-llm-recommendation',
];
const META_RE = /<!--\s*BLURSOR-META:\s*({[\s\S]*?})\s*-->/g;
const REQUIRED_META_FIELDS = [
  'slug', 'title', 'published_date', 'reading_time_min',
  'category_label', 'summary_for_card', 'arxiv_id',
];

class PublicationValidationError extends Error {
  constructor(issues) {
    super(`Research publication validation failed:\n${issues.map(issue => `- ${issue}`).join('\n')}`);
    this.name = 'PublicationValidationError';
    this.issues = issues;
  }
}

function getAttribute(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(tag);
  return match ? match[2] : null;
}

function findTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
}

function findBalancedDivBlock(html, openTag, fileName) {
  const openStart = html.indexOf(openTag);
  const contentStart = openStart + openTag.length;
  const tagRe = /<\/?div\b[^>]*>/gi;
  let depth = 1;
  let match;
  tagRe.lastIndex = contentStart;

  while ((match = tagRe.exec(html))) {
    if (/^<\/div\b/i.test(match[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      return {
        contentStart,
        contentEnd: match.index,
      };
    }
  }

  throw new PublicationValidationError([
    `${fileName}: unbalanced div starting ${openTag}`,
  ]);
}

function findSingleClassTag(html, className, fileName) {
  const classPattern = `\\bclass\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\1`;
  const matches = [...html.matchAll(new RegExp(`<div\\b(?=[^>]*${classPattern})[^>]*>`, 'gi'))];
  if (matches.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: expected exactly one ${className} block`,
    ]);
  }
  return matches[0][0];
}

function renderByline() {
  return `<span class="sep">·</span>
          <span class="article-byline">By <a href="${AUTHOR_PATH}" rel="author" class="article-byline__link">${AUTHOR_NAME}</a></span>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function fmtDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function selectRelatedArticles(articles, currentSlug, count = 2) {
  const selected = articles
    .filter(article => article.meta.slug !== currentSlug)
    .slice(0, count);
  if (selected.length !== count) {
    throw new PublicationValidationError([
      `${currentSlug}: expected ${count} non-self related articles, found ${selected.length}`,
    ]);
  }
  return selected;
}

function renderRelatedCard(article) {
  const meta = article.meta;
  return `        <a href="/research/${escapeHtml(meta.slug)}" class="more-card">
          <div class="more-card__meta">${escapeHtml(fmtDate(meta.published_date))} &middot; ${escapeHtml(meta.reading_time_min)} min read</div>
          <h3 class="more-card__title">${escapeHtml(meta.title)}</h3>
          <div class="more-card__source">arXiv:${escapeHtml(meta.arxiv_id)}</div>
        </a>`;
}

function renderArchiveCard(article, ordinal) {
  const meta = article.meta;
  return `        <a href="/research/${escapeHtml(meta.slug)}" class="article-card">
          <div class="article-card__ordinal">
            ${String(ordinal).padStart(2, '0')}
            <span class="article-card__rule"></span>
          </div>
          <div class="article-card__body">
            <div class="article-card__meta">
              <span class="article-card__date">${escapeHtml(fmtDate(meta.published_date))}</span>
              <span class="article-card__dot"></span>
              <span class="article-card__reading-time">${escapeHtml(meta.reading_time_min)} min read</span>
            </div>
            <h2 class="article-card__title">${escapeHtml(meta.title)}</h2>
            <p class="article-card__summary">${escapeHtml(meta.summary_for_card)}</p>
            <span class="article-card__source">arXiv:${escapeHtml(meta.arxiv_id)}</span>
          </div>
        </a>`;
}

function ensureRssDiscoveryHtml(html) {
  const hasDiscovery = findTags(html, 'link').some(tag => {
    const rel = (getAttribute(tag, 'rel') || '').split(/\s+/);
    return rel.includes('alternate')
      && (getAttribute(tag, 'type') || '').toLowerCase() === 'application/rss+xml'
      && getAttribute(tag, 'href') === RSS_FEED_URL;
  });
  if (hasDiscovery) return html;
  if (html.includes('\n  <!-- Fonts -->')) {
    return html.replace('\n  <!-- Fonts -->', `\n  ${RSS_FEED_LINK_TAG}\n  <!-- Fonts -->`);
  }
  return html.replace(/<\/head>/i, `  ${RSS_FEED_LINK_TAG}\n</head>`);
}

function removeBlockedDigestLinks(html) {
  return html
    .replace(/<li><a href="\/digest">Weekly Digest<\/a><\/li>/g, '<li><a href="/research/feed.xml">RSS Feed</a></li>')
    .replace(/\n\s*<li><a href="\/digest">Newsletter<\/a><\/li>/g, '');
}

function generateArchiveHtml(indexHtml, articles) {
  const indexWithDiscovery = removeBlockedDigestLinks(ensureRssDiscoveryHtml(indexHtml));
  const gridTag = findSingleClassTag(indexWithDiscovery, 'articles__grid', 'research/index.html');
  const cards = articles.map((article, index) => renderArchiveCard(article, index + 1)).join('\n\n');
  const archiveWithCards = replaceBalancedDivContents(
    indexWithDiscovery,
    gridTag,
    `\n\n${cards}\n\n      `,
    'research/index.html',
  );
  const count = articles.length;
  return archiveWithCards.replace(
    /<span class="articles__count">\d+ articles?<\/span>/,
    `<span class="articles__count">${count} article${count === 1 ? '' : 's'}</span>`,
  );
}

function rssDate(value) {
  return new Date(`${value}T00:00:00Z`).toUTCString();
}

function generateFeedXml(articles) {
  const items = articles.map(article => {
    const meta = article.meta;
    const url = `${BASE_URL}/research/${meta.slug}`;
    const category = meta.category_label ? `\n      <category>${escapeXml(meta.category_label)}</category>` : '';
    return `    <item>\n      <title>${escapeXml(meta.title)}</title>\n      <link>${escapeXml(url)}</link>\n      <guid isPermaLink="true">${escapeXml(url)}</guid>\n      <pubDate>${rssDate(meta.published_date)}</pubDate>\n      <description>${escapeXml(meta.summary_for_card)}</description>${category}\n    </item>`;
  }).join('\n');
  const latestDate = articles[0] ? articles[0].meta.published_date : new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>BLURSOR Research</title>\n    <link>${BASE_URL}/research</link>\n    <atom:link href="${RSS_FEED_URL}" rel="self" type="application/rss+xml"/>\n    <description>Research on why AI says what it says, distilled for practitioners.</description>\n    <language>en</language>\n    <lastBuildDate>${rssDate(latestDate)}</lastBuildDate>\n${items}\n  </channel>\n</rss>\n`;
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function generateSitemapXml({ rootDir, articles }) {
  const entries = [
    ...STATIC_ROUTES.map(route => ({
      loc: route.url,
      lastmod: route.file === 'research/index.html' && articles[0]
        ? articles[0].meta.published_date
        : isoDate(fs.statSync(path.join(rootDir, route.file)).mtime),
    })),
    ...articles.map(article => ({
      loc: `${BASE_URL}/research/${article.meta.slug}`,
      lastmod: article.meta.published_date,
    })),
  ];
  const body = entries.map(entry => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function replaceBalancedDivContents(html, openTag, replacement, fileName) {
  const { contentStart, contentEnd } = findBalancedDivBlock(html, openTag, fileName);
  return `${html.slice(0, contentStart)}${replacement}${html.slice(contentEnd)}`;
}

function stripManagedBylines(contents) {
  const bylineRe = /<span\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\barticle-byline\b[^"']*\1)[^>]*>[\s\S]*?<\/span>/gi;
  const attachedSeparatorRe = /<span\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bsep\b[^"']*\1)[^>]*>\s*·\s*<\/span>\s*$/i;
  let result = '';
  let cursor = 0;
  let match;

  while ((match = bylineRe.exec(contents))) {
    result += contents.slice(cursor, match.index).replace(attachedSeparatorRe, '');
    cursor = match.index + match[0].length;
  }
  return result + contents.slice(cursor);
}

function normalizeArticleHtml(article, articles) {
  const fileName = article.fileName || path.basename(article.filePath || article.meta.slug);
  const headerTag = findSingleClassTag(article.html, 'article-header__meta', fileName);
  const { contentStart, contentEnd } = findBalancedDivBlock(article.html, headerTag, fileName);
  const contents = stripManagedBylines(article.html.slice(contentStart, contentEnd));
  const arxivRe = /<a\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\barxiv-link\b[^"']*\1)[^>]*>/gi;
  const arxivMatches = [...contents.matchAll(arxivRe)];
  if (arxivMatches.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: ambiguous byline insertion point (expected one arXiv link)`,
    ]);
  }

  const arxiv = arxivMatches[0];
  const beforeArxiv = contents.slice(0, arxiv.index);
  const separatorRe = /<span\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bsep\b[^"']*\1)[^>]*>\s*·\s*<\/span>\s*$/i;
  const separator = separatorRe.exec(beforeArxiv);
  if (!separator) {
    throw new PublicationValidationError([
      `${fileName}: ambiguous byline insertion point (expected separator before arXiv link)`,
    ]);
  }

  const separatorStart = arxiv.index - (beforeArxiv.length - separator.index);
  const separatorWhitespace = /\s*$/.exec(contents.slice(0, separatorStart))[0];
  const normalizedContents = `${contents.slice(0, separatorStart - separatorWhitespace.length)}${renderByline()}
          <span class="sep">·</span>${contents.slice(arxiv.index)}`;
  const bylineHtml = `${article.html.slice(0, contentStart)}${normalizedContents}${article.html.slice(contentEnd)}`;
  const related = selectRelatedArticles(articles, article.meta.slug);
  const gridTag = findSingleClassTag(bylineHtml, 'more-articles__grid', fileName);
  const gridContents = `\n${related.map(renderRelatedCard).join('\n')}\n      `;
  return replaceBalancedDivContents(bylineHtml, gridTag, gridContents, fileName);
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseJsonLdArticles(html, fileName, issues) {
  const articles = [];
  const scriptRe = /<script\b[^>]*\btype\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRe.exec(html))) {
    let json;
    try {
      json = JSON.parse(match[2].trim());
    } catch (error) {
      issues.push(`${fileName}: invalid JSON-LD (${error.message})`);
      continue;
    }

    const values = Array.isArray(json)
      ? json
      : Array.isArray(json['@graph'])
        ? json['@graph']
        : [json];
    for (const value of values) {
      if (value && value['@type'] === 'Article') articles.push(value);
    }
  }

  return articles;
}

function validateCandidate(filePath) {
  const fileName = path.basename(filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const metaMatches = [...html.matchAll(META_RE)];
  let meta = null;

  if (metaMatches.length !== 1) {
    issues.push(`${fileName}: expected exactly one BLURSOR-META comment`);
  } else {
    try {
      meta = JSON.parse(metaMatches[0][1]);
    } catch (error) {
      issues.push(`${fileName}: invalid BLURSOR-META JSON (${error.message})`);
    }
  }

  if (meta) {
    for (const field of REQUIRED_META_FIELDS) {
      if (!(field in meta) || meta[field] === '' || meta[field] == null) {
        issues.push(`${fileName}: missing required metadata field ${field}`);
      }
    }
    if (!Number.isInteger(meta.reading_time_min) || meta.reading_time_min <= 0) {
      issues.push(`${fileName}: reading_time_min must be a positive integer`);
    }
    if (typeof meta.published_date !== 'string' || !isRealDate(meta.published_date)) {
      issues.push(`${fileName}: published_date must be a real YYYY-MM-DD date`);
    }
    if (meta.slug !== path.basename(fileName, '.html')) {
      issues.push(`${fileName}: slug must match filename`);
    }
  }

  const expectedCanonicalUrl = meta && typeof meta.slug === 'string'
    ? `${BASE_URL}/research/${meta.slug}`
    : null;
  const canonicalUrls = findTags(html, 'link')
    .filter(tag => (getAttribute(tag, 'rel') || '').split(/\s+/).includes('canonical'))
    .map(tag => getAttribute(tag, 'href'));
  const canonicalUrl = canonicalUrls.length === 1 ? canonicalUrls[0] : null;
  if (!expectedCanonicalUrl || canonicalUrls.length !== 1 || canonicalUrl !== expectedCanonicalUrl) {
    issues.push(`${fileName}: canonical must match its self URL`);
  }

  const hasNoindex = findTags(html, 'meta').some(tag => {
    const name = (getAttribute(tag, 'name') || '').toLowerCase();
    const content = (getAttribute(tag, 'content') || '').toLowerCase();
    return (name === 'robots' || /bot(?:-|$)/.test(name))
      && /(^|\s|,)noindex($|\s|,)/.test(content);
  });
  if (hasNoindex) issues.push(`${fileName}: noindex is not allowed`);

  const hasExactArticleAuthor = findTags(html, 'meta').some(tag =>
    (getAttribute(tag, 'property') || '') === 'article:author'
      && getAttribute(tag, 'content') === AUTHOR_URL,
  );
  if (!hasExactArticleAuthor) {
    issues.push(`${fileName}: article:author must equal ${AUTHOR_URL}`);
  }

  const jsonLdArticles = parseJsonLdArticles(html, fileName, issues);
  const hasExactJsonLdAuthor = jsonLdArticles.some(article => {
    const author = article.author;
    return author
      && author['@type'] === 'Person'
      && author.name === AUTHOR_NAME
      && author.url === AUTHOR_URL;
  });
  if (!hasExactJsonLdAuthor) {
    issues.push(`${fileName}: JSON-LD Article must name ${AUTHOR_NAME} at ${AUTHOR_URL}`);
  }

  if (!meta || typeof meta.arxiv_id !== 'string'
    || !html.includes(`https://arxiv.org/abs/${meta.arxiv_id}`)) {
    issues.push(`${fileName}: arXiv link must match metadata arxiv_id`);
  }
  if (!/class\s*=\s*(["'])[^"']*\barticle-header__meta\b[^"']*\1/i.test(html)) {
    issues.push(`${fileName}: expected article-header metadata marker`);
  }
  if (!/class\s*=\s*(["'])[^"']*\bmore-articles__grid\b[^"']*\1/i.test(html)) {
    issues.push(`${fileName}: expected related-grid marker`);
  }
  const hasRssDiscovery = findTags(html, 'link').some(tag => {
    const rel = (getAttribute(tag, 'rel') || '').split(/\s+/);
    return rel.includes('alternate')
      && (getAttribute(tag, 'type') || '').toLowerCase() === 'application/rss+xml'
      && getAttribute(tag, 'href') === RSS_FEED_URL;
  });
  if (!hasRssDiscovery) issues.push(`${fileName}: expected RSS discovery link`);

  return { fileName, filePath, html, meta, canonicalUrl, canonicalUrls, issues };
}

function discoverArticles({ rootDir }) {
  const researchDir = path.join(rootDir, 'research');
  const candidates = fs.readdirSync(researchDir)
    .filter(fileName => fileName.endsWith('.html') && fileName !== 'index.html')
    .sort()
    .map(fileName => validateCandidate(path.join(researchDir, fileName)));
  const issues = candidates.flatMap(candidate => candidate.issues);

  const duplicateFields = [
    { label: 'slug', getValues: candidate => [candidate.meta && candidate.meta.slug] },
    { label: 'canonical', getValues: candidate => candidate.canonicalUrls },
  ];
  for (const { label, getValues } of duplicateFields) {
    const groups = new Map();
    for (const candidate of candidates) {
      const values = new Set(getValues(candidate));
      for (const value of values) {
        if (!value) continue;
        const group = groups.get(value) || [];
        group.push(candidate);
        groups.set(value, group);
      }
    }
    for (const [value, group] of groups) {
      if (group.length > 1) {
        for (const candidate of group) {
          issues.push(`${candidate.fileName}: duplicate ${label} ${value}`);
        }
      }
    }
  }

  if (issues.length) throw new PublicationValidationError(issues);

  const articles = candidates.map(({ fileName, filePath, html, meta, canonicalUrl }) => ({
    fileName,
    filePath,
    html,
    meta,
    canonicalUrl,
  }));
  articles.sort((left, right) => {
    const dateOrder = right.meta.published_date.localeCompare(left.meta.published_date);
    return dateOrder || left.meta.slug.localeCompare(right.meta.slug);
  });
  return articles;
}

function assertSameSet(label, actual, expected, issues) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter(value => !actualSet.has(value));
  const extra = [...actualSet].filter(value => !expectedSet.has(value));
  if (actual.length !== actualSet.size) issues.push(`${label}: duplicate entries`);
  if (missing.length) issues.push(`${label}: missing ${missing.join(', ')}`);
  if (extra.length) issues.push(`${label}: unexpected ${extra.join(', ')}`);
}

function readPublishedFile(rootDir, file, issues) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    issues.push(`${file}: missing file`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function hasRssDiscovery(html) {
  return findTags(html, 'link').some(tag => {
    const rel = (getAttribute(tag, 'rel') || '').split(/\s+/);
    return rel.includes('alternate')
      && (getAttribute(tag, 'type') || '').toLowerCase() === 'application/rss+xml'
      && getAttribute(tag, 'href') === RSS_FEED_URL;
  });
}

function extractClassLinkTargets(html, className) {
  const classPattern = `\\bclass\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\1`;
  return [...html.matchAll(new RegExp(`<a\\b(?=[^>]*${classPattern})[^>]*>`, 'gi'))]
    .map(match => getAttribute(match[0], 'href'));
}

function verifyPublishedState({ rootDir, expectedArticles }) {
  const issues = [];
  const expectedSlugs = expectedArticles.map(article => article.meta.slug);
  const expectedUrls = expectedSlugs.map(slug => `${BASE_URL}/research/${slug}`);
  const archive = readPublishedFile(rootDir, 'research/index.html', issues);
  const feed = readPublishedFile(rootDir, 'research/feed.xml', issues);
  const sitemap = readPublishedFile(rootDir, 'sitemap.xml', issues);
  const home = readPublishedFile(rootDir, 'index.html', issues);
  let relatedLinkCount = 0;

  for (const route of STATIC_ROUTES) readPublishedFile(rootDir, route.file, issues);

  if (archive) {
    assertSameSet(
      'research/index.html',
      extractClassLinkTargets(archive, 'article-card').map(target => target && target.replace(/^\/research\//, '')),
      expectedSlugs,
      issues,
    );
    if (!hasRssDiscovery(archive)) issues.push('research/index.html: missing RSS discovery');
  }
  if (feed) {
    const itemUrls = [...feed.matchAll(/<item\b[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/gi)]
      .map(match => match[1].trim());
    assertSameSet('research/feed.xml', itemUrls, expectedUrls, issues);
  }
  if (sitemap) {
    const sitemapUrls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match => match[1].trim());
    assertSameSet('sitemap.xml', sitemapUrls, [...STATIC_ROUTES.map(route => route.url), ...expectedUrls], issues);
  }
  if (home && !hasRssDiscovery(home)) issues.push('index.html: missing RSS discovery');

  for (const article of expectedArticles) {
    const file = `research/${article.meta.slug}.html`;
    const html = readPublishedFile(rootDir, file, issues);
    if (!html) continue;
    const candidate = validateCandidate(path.join(rootDir, file));
    issues.push(...candidate.issues);
    if (!hasRssDiscovery(html)) issues.push(`${file}: missing RSS discovery`);
    const bylines = [...html.matchAll(/<span\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\barticle-byline\b[^"']*\1)[^>]*>[\s\S]*?<\/span>/gi)];
    const exactByline = `<span class="article-byline">By <a href="${AUTHOR_PATH}" rel="author" class="article-byline__link">${AUTHOR_NAME}</a></span>`;
    if (bylines.length !== 1 || bylines[0][0] !== exactByline) {
      issues.push(`${file}: expected one exact linked byline`);
    }
    const relatedTargets = extractClassLinkTargets(html, 'more-card');
    relatedLinkCount += relatedTargets.length;
    if (relatedTargets.length !== 2) issues.push(`${file}: expected two related targets`);
    if (new Set(relatedTargets).size !== relatedTargets.length) issues.push(`${file}: duplicate related targets`);
    const expectedRelatedSlugs = selectRelatedArticles(expectedArticles, article.meta.slug, 2)
      .map(related => related.meta.slug);
    const actualRelatedSlugs = relatedTargets.map(target => {
      const match = target && /^\/research\/([^/?#]+)$/.exec(target);
      return match ? match[1] : target;
    });
    assertSameSet(`${file}: related targets`, actualRelatedSlugs, expectedRelatedSlugs, issues);
    for (const target of relatedTargets) {
      const targetSlug = target && /^\/research\/([^/?#]+)$/.exec(target);
      if (!targetSlug || !expectedSlugs.includes(targetSlug[1])) {
        issues.push(`${file}: noncanonical related target ${target}`);
      } else if (targetSlug[1] === article.meta.slug) {
        issues.push(`${file}: self-related target ${target}`);
      }
    }
    for (const legacyPath of LEGACY_SOFT_404_PATHS) {
      if (html.includes(legacyPath)) issues.push(`${file}: contains legacy soft-404 route ${legacyPath}`);
    }
  }

  if (issues.length) throw new PublicationValidationError(issues);
  return { articleCount: expectedArticles.length, relatedLinkCount };
}

function compileResearch({ rootDir }) {
  const articles = discoverArticles({ rootDir });
  const renderedArticles = articles.map(article => ({
    filePath: article.filePath,
    html: removeBlockedDigestLinks(ensureRssDiscoveryHtml(normalizeArticleHtml(article, articles))),
  }));
  const archivePath = path.join(rootDir, 'research/index.html');
  const generatedOutputs = [
    ...renderedArticles,
    { filePath: archivePath, html: generateArchiveHtml(fs.readFileSync(archivePath, 'utf8'), articles) },
    { filePath: path.join(rootDir, 'research/feed.xml'), html: generateFeedXml(articles) },
    { filePath: path.join(rootDir, 'index.html'), html: ensureRssDiscoveryHtml(fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8')) },
    { filePath: path.join(rootDir, 'sitemap.xml'), html: generateSitemapXml({ rootDir, articles }) },
  ];
  const changedOutputs = generatedOutputs.filter(({ filePath, html }) =>
    !fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== html,
  );
  const writtenArticleCount = changedOutputs.filter(output =>
    output.filePath.startsWith(`${path.join(rootDir, 'research')}${path.sep}`)
      && output.filePath.endsWith('.html')
      && path.basename(output.filePath) !== 'index.html',
  ).length;

  for (const output of changedOutputs) {
    fs.writeFileSync(output.filePath, output.html);
  }

  const verification = verifyPublishedState({ rootDir, expectedArticles: articles });

  return {
    articleCount: articles.length,
    writtenArticleCount,
    articleSlugs: articles.map(article => article.meta.slug),
    verification,
  };
}

module.exports = {
  AUTHOR_NAME,
  AUTHOR_PATH,
  AUTHOR_URL,
  PublicationValidationError,
  discoverArticles,
  compileResearch,
  generateArchiveHtml,
  generateFeedXml,
  generateSitemapXml,
  normalizeArticleHtml,
  renderByline,
  selectRelatedArticles,
  verifyPublishedState,
};
