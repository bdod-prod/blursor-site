'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'https://blursor.ai';
const AUTHOR_NAME = 'Alex Rostovtsev';
const AUTHOR_PATH = '/author/alex-rostovtsev';
const AUTHOR_URL = `${BASE_URL}${AUTHOR_PATH}`;
const RSS_FEED_URL = `${BASE_URL}/research/feed.xml`;
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

function compileResearch({ rootDir }) {
  const articles = discoverArticles({ rootDir });
  const renderedArticles = articles.map(article => ({
    filePath: article.filePath,
    html: normalizeArticleHtml(article, articles),
  }));
  const changedArticles = renderedArticles.filter(({ filePath, html }) =>
    fs.readFileSync(filePath, 'utf8') !== html,
  );

  for (const article of changedArticles) {
    fs.writeFileSync(article.filePath, article.html);
  }

  return {
    articleCount: articles.length,
    writtenArticleCount: changedArticles.length,
    articleSlugs: articles.map(article => article.meta.slug),
  };
}

module.exports = {
  AUTHOR_NAME,
  AUTHOR_PATH,
  AUTHOR_URL,
  PublicationValidationError,
  discoverArticles,
  compileResearch,
  normalizeArticleHtml,
  renderByline,
  selectRelatedArticles,
};
