const RESULT_VERSION = 1;

export function sanitizeStoredUrl(input, base) {
  let url;
  try {
    url = base ? new URL(input, base) : new URL(input);
  } catch {
    throw new Error("Expected a valid http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Expected a valid http or https URL.");
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.href;
}

export async function fingerprintUrl(input) {
  const normalized = sanitizeStoredUrl(input);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function calculateRenderDelta(rawPage, renderedPage) {
  const rawTextChars = finiteNumber(rawPage && rawPage.visibleTextChars, 0);
  if (!renderedPage || !Number.isFinite(Number(renderedPage.visibleTextChars))) {
    return {
      available: false,
      rawTextChars,
      renderedTextChars: null,
      missingPercent: null,
    };
  }

  const renderedTextChars = Math.max(0, Number(renderedPage.visibleTextChars));
  const missingPercent = renderedTextChars > 0
    ? Math.max(0, Math.round((1 - Math.min(1, rawTextChars / renderedTextChars)) * 100))
    : 0;
  return { available: true, rawTextChars, renderedTextChars, missingPercent };
}

export function buildStoredResult(result) {
  if (!result || result.ok !== true) throw new Error("Only successful checker results can be stored.");

  const url = sanitizeStoredUrl(result.url);
  const finalUrl = sanitizeStoredUrl(result.finalUrl || result.url);
  const checkedAt = validTimestamp(result.checkedAt);

  return {
    version: RESULT_VERSION,
    ok: true,
    url,
    finalUrl,
    checkedAt,
    httpStatus: finiteNumber(result.httpStatus, null),
    renderMode: nullableString(result.renderMode),
    renderStatus: nullableString(result.renderStatus),
    renderDelta: pickRenderDelta(result.renderDelta),
    summary: pickSummary(result.summary),
    botAccess: array(result.botAccess).map(pickBot),
    content: pickContent(result.content, url),
    rendered: result.rendered ? pickRendered(result.rendered) : null,
    llms: pickLlms(result.llms),
    signals: pickSignals(result.signals),
    method: { note: nullableString(result.method && result.method.note) },
    findings: array(result.findings).map(pickFinding),
    citeability: pickFindingGroup(result.citeability),
    agentic: pickAgentic(result.agentic),
  };
}

export function buildSignalSnapshot(storedResult) {
  const result = storedResult && storedResult.version === RESULT_VERSION
    ? storedResult
    : buildStoredResult(storedResult);
  const meta = result.signals && result.signals.metaRobots;
  const a11y = result.agentic && result.agentic.signals && result.agentic.signals.a11y;

  return {
    v: RESULT_VERSION,
    httpStatus: result.httpStatus,
    summary: pickSummary(result.summary),
    bots: array(result.botAccess).map((bot) => ({
      token: bot.token,
      robots: bot.robots,
      server: bot.server,
      status: bot.status,
    })),
    render: {
      mode: result.renderMode,
      status: result.renderStatus,
      delta: pickRenderDelta(result.renderDelta),
    },
    llms: pickLlms(result.llms),
    indexing: {
      hasNoindex: Boolean(meta && meta.hasNoindex),
      hasNoai: Boolean(meta && meta.hasNoai),
      contentSignals: array(result.signals && result.signals.contentSignals)
        .map((signal) => signal.raw)
        .filter(Boolean),
    },
    findings: {
      readability: findingStatuses(result.findings),
      citeability: findingStatuses(result.citeability && result.citeability.findings),
      agentic: findingStatuses(result.agentic && result.agentic.findings),
    },
    agentic: {
      mode: result.agentic && result.agentic.mode,
      cls: result.agentic && result.agentic.signals ? result.agentic.signals.cls : null,
      unnamed: finiteNumber(a11y && a11y.unnamed, 0),
      fieldsNoLabel: finiteNumber(a11y && a11y.fieldsNoLabel, 0),
      imagesNoAlt: finiteNumber(a11y && a11y.imagesNoAlt, 0),
    },
  };
}

export async function buildReportRow(result, source = "user") {
  if (source !== "user" && source !== "watch") throw new Error("Unsupported report source.");
  const stored = buildStoredResult(result);
  return {
    checked_at: stored.checkedAt,
    target_url: stored.url,
    final_url: stored.finalUrl,
    url_fingerprint: await fingerprintUrl(stored.url),
    source,
    result: stored,
    signal_json: buildSignalSnapshot(stored),
  };
}

function pickBot(bot) {
  return {
    token: nullableString(bot && bot.token),
    label: nullableString(bot && bot.label),
    group: nullableString(bot && bot.group),
    owner: nullableString(bot && bot.owner),
    rendersJS: Boolean(bot && bot.rendersJS),
    robots: nullableString(bot && bot.robots),
    server: nullableString(bot && bot.server),
    status: finiteNumber(bot && bot.status, null),
    source: nullableString(bot && bot.source),
  };
}

function pickContent(content, baseUrl) {
  const value = content || {};
  return {
    title: nullableString(value.title),
    titleLength: finiteNumber(value.titleLength, 0),
    metaDescription: nullableString(value.metaDescription),
    metaDescriptionLength: finiteNumber(value.metaDescriptionLength, 0),
    canonical: optionalSanitizedUrl(value.canonical, baseUrl),
    headings: pickHeadings(value.headings),
    headingOrderOk: Boolean(value.headingOrderOk),
    hasJsonLd: Boolean(value.hasJsonLd),
    jsonLdTypes: array(value.jsonLdTypes).map(String),
    visibleTextChars: finiteNumber(value.visibleTextChars, 0),
    htmlBytes: finiteNumber(value.htmlBytes, 0),
    scriptBytes: finiteNumber(value.scriptBytes, 0),
    textRatio: finiteNumber(value.textRatio, 0),
    looksLikeJsShell: Boolean(value.looksLikeJsShell),
    frameworkHint: nullableString(value.frameworkHint),
    outline: pickOutline(value.outline),
    firstParagraph: nullableString(value.firstParagraph),
  };
}

function pickRendered(rendered) {
  return {
    visibleTextChars: finiteNumber(rendered.visibleTextChars, 0),
    headings: pickHeadings(rendered.headings),
    hasJsonLd: Boolean(rendered.hasJsonLd),
    outline: pickOutline(rendered.outline),
  };
}

function pickOutline(outline) {
  return array(outline).slice(0, 151).map((block) => ({
    tag: nullableString(block && block.tag),
    text: nullableString(block && block.text),
  }));
}

function pickSignals(signals) {
  const value = signals || {};
  const meta = value.metaRobots || {};
  return {
    metaRobots: {
      records: array(meta.records).map((record) => ({
        source: nullableString(record && record.source),
        name: nullableString(record && record.name),
        content: nullableString(record && record.content),
        directives: array(record && record.directives).map(String),
        noindex: Boolean(record && record.noindex),
        noai: Boolean(record && record.noai),
      })),
      hasNoindex: Boolean(meta.hasNoindex),
      hasNoai: Boolean(meta.hasNoai),
    },
    contentSignals: array(value.contentSignals).map((signal) => ({
      raw: nullableString(signal && signal.raw),
      directives: array(signal && signal.directives).map(String),
    })),
  };
}

function pickFindingGroup(group) {
  const value = group || {};
  return {
    summary: pickSummary(value.summary),
    findings: array(value.findings).map(pickFinding),
  };
}

function pickAgentic(agentic) {
  const value = agentic || {};
  const signals = value.signals || {};
  const webmcp = signals.webmcp || {};
  const a11y = signals.a11y || {};
  return {
    mode: nullableString(value.mode),
    summary: pickExtendedSummary(value.summary),
    findings: array(value.findings).map(pickFinding),
    signals: {
      webmcp: {
        present: Boolean(webmcp.present),
        runtime: Boolean(webmcp.runtime),
        tools: finiteNumber(webmcp.tools, null),
        source: nullableString(webmcp.source),
      },
      a11y: {
        interactive: finiteNumber(a11y.interactive, 0),
        unnamed: finiteNumber(a11y.unnamed, 0),
        unnamedSamples: array(a11y.unnamedSamples).map(String).slice(0, 8),
        fields: finiteNumber(a11y.fields, 0),
        fieldsNoLabel: finiteNumber(a11y.fieldsNoLabel, 0),
        images: finiteNumber(a11y.images, 0),
        imagesNoAlt: finiteNumber(a11y.imagesNoAlt, 0),
        hasMain: Boolean(a11y.hasMain),
        landmarks: finiteNumber(a11y.landmarks, 0),
        h1: finiteNumber(a11y.h1, 0),
        approx: Boolean(a11y.approx),
      },
      cls: finiteNumber(signals.cls, null),
      lcp: finiteNumber(signals.lcp, null),
      imgRisk: finiteNumber(signals.imgRisk, 0),
    },
  };
}

function pickFinding(finding) {
  const value = finding || {};
  return {
    id: nullableString(value.id),
    label: nullableString(value.label),
    status: nullableString(value.status),
    detail: nullableString(value.detail),
    why: nullableString(value.why),
    source: value.source ? {
      label: nullableString(value.source.label),
      url: nullableString(value.source.url),
    } : null,
    copyLabel: nullableString(value.copyLabel),
    copyText: nullableString(value.copyText),
  };
}

function pickRenderDelta(delta) {
  const value = delta || {};
  return {
    available: Boolean(value.available),
    rawTextChars: finiteNumber(value.rawTextChars, 0),
    renderedTextChars: finiteNumber(value.renderedTextChars, null),
    missingPercent: finiteNumber(value.missingPercent, null),
  };
}

function pickLlms(llms) {
  return {
    present: Boolean(llms && llms.present),
    looksValid: Boolean(llms && llms.looksValid),
  };
}

function pickSummary(summary) {
  return {
    pass: finiteNumber(summary && summary.pass, 0),
    warn: finiteNumber(summary && summary.warn, 0),
    fail: finiteNumber(summary && summary.fail, 0),
  };
}

function pickExtendedSummary(summary) {
  return { ...pickSummary(summary), info: finiteNumber(summary && summary.info, 0) };
}

function pickHeadings(headings) {
  return {
    h1: finiteNumber(headings && headings.h1, 0),
    h2: finiteNumber(headings && headings.h2, 0),
    h3: finiteNumber(headings && headings.h3, 0),
  };
}

function findingStatuses(findings) {
  return Object.fromEntries(
    array(findings)
      .filter((finding) => finding && finding.id)
      .map((finding) => [finding.id, finding.status])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function optionalSanitizedUrl(input, base) {
  if (!input) return null;
  try {
    return sanitizeStoredUrl(input, base);
  } catch {
    return null;
  }
}

function validTimestamp(input) {
  const date = new Date(input);
  if (!input || Number.isNaN(date.getTime())) throw new Error("Checker result has no valid timestamp.");
  return date.toISOString();
}

function nullableString(value) {
  return value === null || value === undefined ? null : String(value);
}

function finiteNumber(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}
