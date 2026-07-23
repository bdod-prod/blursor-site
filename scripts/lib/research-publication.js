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
  return {
    articleCount: articles.length,
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
};
