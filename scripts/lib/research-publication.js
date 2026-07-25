'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'https://blursor.ai';
const AUTHOR_NAME = 'Alex Rostovtsev';
const AUTHOR_PATH = '/author/alex-rostovtsev';
const AUTHOR_URL = `${BASE_URL}${AUTHOR_PATH}`;
const RSS_FEED_URL = `${BASE_URL}/research/feed.xml`;
const RSS_FEED_LINK_TAG = `<link rel="alternate" type="application/rss+xml" title="BLURSOR Research RSS" href="${RSS_FEED_URL}">`;
const MOBILE_META_WRAP_STYLE = `  <style data-blursor-managed="article-meta-mobile">
    @media (max-width: 640px) {
      .article-header__meta { flex-wrap: wrap; }
    }
  </style>`;
const STATIC_ROUTES = [
  { url: `${BASE_URL}/`, file: 'index.html' },
  { url: `${BASE_URL}/ai-crawler-checker`, file: 'ai-crawler-checker.html' },
  { url: `${BASE_URL}/research`, file: 'research/index.html' },
  { url: AUTHOR_URL, file: 'author/alex-rostovtsev.html' },
];
const CANONICAL_STATIC_PAGES = [
  { file: 'index.html', currentPath: '/' },
  { file: 'ai-crawler-checker.html', currentPath: '/ai-crawler-checker' },
  { file: 'research/index.html', currentPath: '/research' },
  { file: 'author/alex-rostovtsev.html', currentPath: '/author/alex-rostovtsev' },
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
    `^[\\t ]*<(?:header|footer)\\b[^>]*class=(["'])[^"']*\\b${className}\\b[^"']*\\1[^>]*>[\\s\\S]*?<\\/(?:header|footer)>`,
    'gm',
  );
  const matches = html.match(pattern) || [];
  if (matches.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: expected exactly one ${className}, found ${matches.length}`,
    ]);
  }
  return html.replace(pattern, replacement);
}

function normalizeSiteShellHtml(html, { fileName, currentPath }) {
  const withoutStylesheet = html.replace(
    /<link\b(?=[^>]*\bhref\s*=\s*(["'])\/assets\/site-shell\.css(?:[?#][^"']*)?\1)[^>]*>/gi,
    '',
  );
  const headClosings = [...withoutStylesheet.matchAll(/<\/head>/gi)];
  if (headClosings.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: expected exactly one head closing tag, found ${headClosings.length}`,
    ]);
  }
  const withStylesheet = withoutStylesheet.replace(
    /<\/head>/i,
    `${CANONICAL_SITE_SHELL_STYLESHEET}</head>`,
  );
  const withHeader = replaceSingleShellElement(withStylesheet, {
    className: 'site-header',
    replacement: renderCanonicalHeader(currentPath),
    fileName,
  });
  return replaceSingleShellElement(withHeader, {
    className: 'site-footer',
    replacement: renderCanonicalFooter(),
    fileName,
  });
}

function verifyCanonicalSiteShell(html, { fileName, currentPath, issues }) {
  try {
    const normalized = normalizeSiteShellHtml(html, { fileName, currentPath });
    if (normalized !== html) issues.push(`${fileName}: site shell is not canonical`);
  } catch (error) {
    if (error instanceof PublicationValidationError) issues.push(...error.issues);
    else throw error;
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

function renderHomepageDigestRow(article, ordinal) {
  const meta = article.meta;
  return `      <a class="digest-row" href="/research/${escapeHtml(meta.slug)}">
        <span class="digest-row__num">${String(ordinal).padStart(2, '0')}</span>
        <span>
          <span class="digest-row__meta"><span>${escapeHtml(fmtDate(meta.published_date))}</span><span>${escapeHtml(meta.reading_time_min)} min</span><span class="src">arXiv:${escapeHtml(meta.arxiv_id)}</span></span>
          <span class="digest-row__title" role="heading" aria-level="3">${escapeHtml(meta.title)}</span>
          <span class="digest-row__summary">${escapeHtml(meta.summary_for_card)}</span>
        </span>
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

function generateHomepageHtml(indexHtml, articles) {
  const indexWithDiscovery = ensureRssDiscoveryHtml(indexHtml);
  const latestDigestSections = [
    ...indexWithDiscovery.matchAll(/<section\b[^>]*\bid\s*=\s*(["'])latest-digests\1[^>]*>/gi),
  ];
  if (latestDigestSections.length === 0) return indexWithDiscovery;
  if (latestDigestSections.length !== 1) {
    throw new PublicationValidationError([
      `index.html: expected exactly one latest-digests section, found ${latestDigestSections.length}`,
    ]);
  }

  const listTag = findSingleClassTag(indexWithDiscovery, 'digests__list', 'index.html');
  const rows = articles
    .slice(0, 3)
    .map((article, index) => renderHomepageDigestRow(article, index + 1))
    .join('\n\n');
  return replaceBalancedDivContents(
    indexWithDiscovery,
    listTag,
    `\n\n${rows}\n\n      `,
    'index.html',
  );
}

function ensureMobileMetaWrapHtml(html, fileName) {
  const managedStyleRe = /\n\s*<style\b(?=[^>]*\bdata-blursor-managed\s*=\s*(["'])article-meta-mobile\1)[^>]*>[\s\S]*?<\/style>/gi;
  const withoutManagedStyle = html.replace(managedStyleRe, '');
  const headClosings = [...withoutManagedStyle.matchAll(/<\/head>/gi)];
  if (headClosings.length !== 1) {
    throw new PublicationValidationError([
      `${fileName}: expected one head closing tag for mobile metadata style`,
    ]);
  }
  return withoutManagedStyle.replace(/<\/head>/i, `${MOBILE_META_WRAP_STYLE}\n</head>`);
}

function removeBlockedDigestLinks(html) {
  return html
    .replace(/<li><a href="\/digest">Weekly Digest<\/a><\/li>/g, '<li><a href="/research/feed.xml">RSS Feed</a></li>')
    .replace(/\n\s*<li><a href="\/digest">Newsletter<\/a><\/li>/g, '');
}

function generateArchiveHtml(indexHtml, articles) {
  const indexWithDiscovery = removeBlockedDigestLinks(ensureRssDiscoveryHtml(indexHtml));
  const countMarkerRe = /<span class="articles__count">[\s\S]*?<\/span>/g;
  const countMarkers = [...indexWithDiscovery.matchAll(countMarkerRe)];
  if (countMarkers.length !== 1) {
    throw new PublicationValidationError([
      `research/index.html: expected exactly one articles__count marker, found ${countMarkers.length}`,
    ]);
  }
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
    countMarkerRe,
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

function buildSitemapEntries({
  rootDir,
  articles,
  allowMissingFiles = false,
  fileMtimes = {},
}) {
  return [
    ...STATIC_ROUTES.map(route => {
      const hasExplicitMtime = Object.hasOwn(fileMtimes, route.file);
      return {
        loc: route.url,
        lastmod: hasExplicitMtime
          ? isoDate(fileMtimes[route.file])
          : route.file === 'research/index.html' && articles[0]
            ? articles[0].meta.published_date
            : allowMissingFiles && !fs.existsSync(path.join(rootDir, route.file))
              ? null
              : isoDate(fs.statSync(path.join(rootDir, route.file)).mtime),
      };
    }),
    ...articles.map(article => ({
      loc: `${BASE_URL}/research/${article.meta.slug}`,
      lastmod: article.meta.published_date,
    })),
  ];
}

function generateSitemapXml({ rootDir, articles, fileMtimes = {} }) {
  const entries = buildSitemapEntries({ rootDir, articles, fileMtimes });
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

  const articleAuthorTags = findTags(html, 'meta').filter(tag =>
    (getAttribute(tag, 'property') || '') === 'article:author',
  );
  if (articleAuthorTags.length !== 1) {
    issues.push(`${fileName}: expected exactly one article:author declaration, found ${articleAuthorTags.length}`);
  } else if (getAttribute(articleAuthorTags[0], 'content') !== AUTHOR_URL) {
    issues.push(`${fileName}: article:author must equal ${AUTHOR_URL}`);
  }

  const jsonLdArticles = parseJsonLdArticles(html, fileName, issues);
  const hasOnlyExactJsonLdAuthors = jsonLdArticles.length > 0 && jsonLdArticles.every(article => {
    const author = article.author;
    return author
      && author['@type'] === 'Person'
      && author.name === AUTHOR_NAME
      && author.url === AUTHOR_URL;
  });
  if (!hasOnlyExactJsonLdAuthors) {
    issues.push(`${fileName}: JSON-LD Article must name ${AUTHOR_NAME} at ${AUTHOR_URL} in every Article object`);
  }

  const expectedArxivUrl = meta && typeof meta.arxiv_id === 'string'
    ? `https://arxiv.org/abs/${meta.arxiv_id}`
    : null;
  const exactArxivAnchors = findTags(html, 'a').filter(tag =>
    getAttribute(tag, 'href') === expectedArxivUrl,
  );
  if (!expectedArxivUrl || exactArxivAnchors.length === 0) {
    issues.push(`${fileName}: arXiv link must match metadata arxiv_id`);
  }

  let headerContents = null;
  try {
    const headerTag = findSingleClassTag(html, 'article-header__meta', fileName);
    const bounds = findBalancedDivBlock(html, headerTag, fileName);
    headerContents = html.slice(bounds.contentStart, bounds.contentEnd);
  } catch {
    issues.push(`${fileName}: expected article-header metadata marker`);
  }
  if (expectedArxivUrl && headerContents != null) {
    const headerArxivLinks = findTags(headerContents, 'a').filter(tag =>
      (getAttribute(tag, 'class') || '').split(/\s+/).includes('arxiv-link'),
    );
    if (headerArxivLinks.length !== 1
      || getAttribute(headerArxivLinks[0], 'href') !== expectedArxivUrl) {
      issues.push(`${fileName}: header .arxiv-link href must equal ${expectedArxivUrl}`);
    }
  }
  if (!/class\s*=\s*(["'])[^"']*\bmore-articles__grid\b[^"']*\1/i.test(html)) {
    issues.push(`${fileName}: expected related-grid marker`);
  }

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

function parseSitemapUrlEntries(sitemap, issues) {
  return [...sitemap.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].map((match, index) => {
    const contents = match[1];
    const locs = [...contents.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
      .map(locMatch => locMatch[1].trim());
    const lastmods = [...contents.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/gi)]
      .map(lastmodMatch => lastmodMatch[1].trim());
    const label = locs.length === 1 ? locs[0] : `url entry ${index + 1}`;
    if (locs.length !== 1) {
      issues.push(`sitemap.xml: ${label} must contain exactly one loc, found ${locs.length}`);
    }
    if (lastmods.length !== 1) {
      issues.push(`sitemap.xml: ${label} must contain exactly one lastmod, found ${lastmods.length}`);
    } else if (!lastmods[0]) {
      issues.push(`sitemap.xml: ${label} lastmod must not be empty`);
    }
    return {
      loc: locs.length === 1 ? locs[0] : null,
      lastmod: lastmods.length === 1 && lastmods[0] ? lastmods[0] : null,
    };
  });
}

function verifySitemapEntries({ rootDir, sitemap, expectedArticles, issues }) {
  const fileMtimes = Object.fromEntries(
    STATIC_ROUTES
      .filter(route => fs.existsSync(path.join(rootDir, route.file)))
      .map(route => [route.file, fs.statSync(path.join(rootDir, route.file)).mtime]),
  );
  const expectedEntries = buildSitemapEntries({
    rootDir,
    articles: expectedArticles,
    allowMissingFiles: true,
    fileMtimes,
  });
  const expectedLocs = new Set(expectedEntries.map(entry => entry.loc));
  const actualGroups = new Map();

  for (const entry of parseSitemapUrlEntries(sitemap, issues)) {
    if (!entry.loc) continue;
    const group = actualGroups.get(entry.loc) || [];
    group.push(entry);
    actualGroups.set(entry.loc, group);
  }

  for (const expected of expectedEntries) {
    const group = actualGroups.get(expected.loc) || [];
    if (group.length === 0) {
      issues.push(`sitemap.xml: missing entry ${expected.loc}`);
      continue;
    }
    if (group.length > 1) {
      issues.push(`sitemap.xml: duplicate entry ${expected.loc}`);
      continue;
    }
    if (expected.lastmod && group[0].lastmod && group[0].lastmod !== expected.lastmod) {
      issues.push(`sitemap.xml: ${expected.loc} lastmod must equal ${expected.lastmod}, found ${group[0].lastmod}`);
    }
  }

  for (const loc of actualGroups.keys()) {
    if (!expectedLocs.has(loc)) issues.push(`sitemap.xml: unexpected entry ${loc}`);
  }
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
  const staticPages = new Map();
  for (const page of CANONICAL_STATIC_PAGES) {
    const html = readPublishedFile(rootDir, page.file, issues);
    staticPages.set(page.file, html);
    if (html) {
      verifyCanonicalSiteShell(html, {
        fileName: page.file,
        currentPath: page.currentPath,
        issues,
      });
    }
  }
  const archive = staticPages.get('research/index.html');
  const feed = readPublishedFile(rootDir, 'research/feed.xml', issues);
  const sitemap = readPublishedFile(rootDir, 'sitemap.xml', issues);
  const home = staticPages.get('index.html');
  let relatedLinkCount = 0;

  if (archive) {
    assertSameSet(
      'research/index.html',
      extractClassLinkTargets(archive, 'article-card').map(target => target && target.replace(/^\/research\//, '')),
      expectedSlugs,
      issues,
    );
    const countMarkers = [...archive.matchAll(/<span class="articles__count">([\s\S]*?)<\/span>/g)];
    if (countMarkers.length !== 1) {
      issues.push(`research/index.html: expected exactly one articles__count marker, found ${countMarkers.length}`);
    } else {
      const actualCount = countMarkers[0][1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const expectedCount = `${expectedArticles.length} article${expectedArticles.length === 1 ? '' : 's'}`;
      if (actualCount !== expectedCount) {
        issues.push(`research/index.html: articles__count must equal "${expectedCount}", found "${actualCount}"`);
      }
    }
    if (!hasRssDiscovery(archive)) issues.push('research/index.html: missing RSS discovery');
  }
  if (feed) {
    const itemUrls = [...feed.matchAll(/<item\b[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/gi)]
      .map(match => match[1].trim());
    assertSameSet('research/feed.xml', itemUrls, expectedUrls, issues);
  }
  if (sitemap) {
    verifySitemapEntries({ rootDir, sitemap, expectedArticles, issues });
  }
  if (home) {
    if (!hasRssDiscovery(home)) issues.push('index.html: missing RSS discovery');
    if (/<section\b[^>]*\bid\s*=\s*(["'])latest-digests\1/i.test(home)) {
      const latestTargets = extractClassLinkTargets(home, 'digest-row')
        .map(target => {
          const match = target && /^\/research\/([^/?#]+)$/.exec(target);
          return match ? match[1] : target;
        });
      const expectedLatestTargets = expectedArticles
        .slice(0, 3)
        .map(article => article.meta.slug);
      if (latestTargets.length !== expectedLatestTargets.length
        || latestTargets.some((target, index) => target !== expectedLatestTargets[index])) {
        issues.push(
          `index.html: latest digest targets must equal ${expectedLatestTargets.join(', ')}; found ${latestTargets.join(', ')}`,
        );
      }
    }
  }

  for (const article of expectedArticles) {
    const file = `research/${article.meta.slug}.html`;
    const html = readPublishedFile(rootDir, file, issues);
    if (!html) continue;
    verifyCanonicalSiteShell(html, {
      fileName: file,
      currentPath: `/research/${article.meta.slug}`,
      issues,
    });
    const candidate = validateCandidate(path.join(rootDir, file));
    issues.push(...candidate.issues);
    if (!hasRssDiscovery(html)) issues.push(`${file}: missing RSS discovery`);
    if (html.split(MOBILE_META_WRAP_STYLE).length !== 2) {
      issues.push(`${file}: expected one managed mobile metadata-wrap style`);
    }
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
  const buildTimestamp = new Date();
  const articles = discoverArticles({ rootDir });
  const renderedArticles = articles.map(article => ({
    filePath: article.filePath,
    html: normalizeSiteShellHtml(
      ensureMobileMetaWrapHtml(
        removeBlockedDigestLinks(ensureRssDiscoveryHtml(normalizeArticleHtml(article, articles))),
        article.fileName,
      ),
      {
        fileName: `research/${article.fileName}`,
        currentPath: `/research/${article.meta.slug}`,
      },
    ),
  }));
  const archivePath = path.join(rootDir, 'research/index.html');
  const homePath = path.join(rootDir, 'index.html');
  const currentHomeHtml = fs.readFileSync(homePath, 'utf8');
  const homeHtml = normalizeSiteShellHtml(
    generateHomepageHtml(currentHomeHtml, articles),
    { fileName: 'index.html', currentPath: '/' },
  );
  const archiveHtml = normalizeSiteShellHtml(
    generateArchiveHtml(fs.readFileSync(archivePath, 'utf8'), articles),
    { fileName: 'research/index.html', currentPath: '/research' },
  );
  const staticOutputs = [
    { filePath: homePath, html: homeHtml },
    {
      filePath: path.join(rootDir, 'ai-crawler-checker.html'),
      html: normalizeSiteShellHtml(
        fs.readFileSync(path.join(rootDir, 'ai-crawler-checker.html'), 'utf8'),
        { fileName: 'ai-crawler-checker.html', currentPath: '/ai-crawler-checker' },
      ),
    },
    { filePath: archivePath, html: archiveHtml },
    {
      filePath: path.join(rootDir, 'author/alex-rostovtsev.html'),
      html: normalizeSiteShellHtml(
        fs.readFileSync(path.join(rootDir, 'author/alex-rostovtsev.html'), 'utf8'),
        { fileName: 'author/alex-rostovtsev.html', currentPath: '/author/alex-rostovtsev' },
      ),
    },
  ];
  const changedStaticFiles = new Set(staticOutputs
    .filter(({ filePath, html }) => fs.readFileSync(filePath, 'utf8') !== html)
    .map(({ filePath }) => path.relative(rootDir, filePath)));
  const fileMtimes = Object.fromEntries(STATIC_ROUTES.map(route => [
    route.file,
    changedStaticFiles.has(route.file)
      ? buildTimestamp
      : fs.statSync(path.join(rootDir, route.file)).mtime,
  ]));
  const generatedOutputs = [
    ...renderedArticles,
    ...staticOutputs,
    { filePath: path.join(rootDir, 'research/feed.xml'), html: generateFeedXml(articles) },
    {
      filePath: path.join(rootDir, 'sitemap.xml'),
      html: generateSitemapXml({
        rootDir,
        articles,
        fileMtimes,
      }),
    },
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
    const relativePath = path.relative(rootDir, output.filePath);
    if (changedStaticFiles.has(relativePath)) {
      fs.utimesSync(output.filePath, buildTimestamp, buildTimestamp);
    }
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
  CANONICAL_SITE_SHELL_STYLESHEET,
  PublicationValidationError,
  discoverArticles,
  compileResearch,
  generateArchiveHtml,
  generateFeedXml,
  generateSitemapXml,
  normalizeArticleHtml,
  normalizeSiteShellHtml,
  renderByline,
  selectRelatedArticles,
  verifyCanonicalSiteShell,
  verifyPublishedState,
};
