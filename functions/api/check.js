// BLURSOR — AI crawler-readability + agent-readiness checker
// Cloudflare Pages Function:  GET /api/check?url=<target>
//
// Two halves, one request:
//   1. Can AI READ the page? Fetch it the way AI crawlers do (raw HTML, no JS),
//      and — when a Cloudflare Browser Rendering token is configured — ALSO
//      render it and diff raw vs rendered to measure how much is client-only.
//   2. Can an AI AGENT USE the page? While rendering, an injected probe reads the
//      live page for WebMCP tools, accessible names on buttons/forms/images, and
//      layout stability (CLS) — the signals Google's Lighthouse "Agentic
//      Browsing" category checks. Falls back to HTML heuristics if render is off.
//
// Without a token (or if rendering fails/quota-limits), it falls back to a
// heuristic. Transparency is the point: every finding carries a plain-English
// "why" and a research source.
//
// To activate render-diff, set two Pages env vars (secrets):
//   CF_ACCOUNT_ID    - your Cloudflare account id
//   CF_BROWSER_TOKEN - API token with Browser Rendering permission

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

// Verified behavior (docs/research/ai-readiness-research-recovered-2026-06.md):
// standalone AI crawlers take raw HTML and DON'T run JS; Gemini (Google-Extended,
// via Googlebot's renderer) and Applebot DO render.
const AI_BOTS = [
  { token: "GPTBot",             label: "GPTBot",             group: "OpenAI",      owner: "OpenAI (training)",        rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.3; +https://openai.com/gptbot", source: "https://developers.openai.com/api/docs/bots" },
  { token: "OAI-SearchBot",      label: "OAI-SearchBot",      group: "OpenAI",      owner: "OpenAI (ChatGPT search)",  rendersJS: false, ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot", source: "https://developers.openai.com/api/docs/bots" },
  { token: "ChatGPT-User",       label: "ChatGPT-User",       group: "OpenAI",      owner: "OpenAI (live fetch)",      rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot", source: "https://developers.openai.com/api/docs/bots" },
  { token: "ClaudeBot",          label: "ClaudeBot",          group: "Anthropic",   owner: "Anthropic (training)",     rendersJS: false, ua: "ClaudeBot", source: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
  { token: "Claude-SearchBot",   label: "Claude-SearchBot",   group: "Anthropic",   owner: "Anthropic (search)",       rendersJS: false, ua: "Claude-SearchBot", source: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
  { token: "Claude-User",        label: "Claude-User",        group: "Anthropic",   owner: "Anthropic (user fetch)",   rendersJS: false, ua: "Claude-User", source: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
  { token: "PerplexityBot",      label: "PerplexityBot",      group: "Perplexity",  owner: "Perplexity (search)",      rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", source: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers" },
  { token: "Perplexity-User",    label: "Perplexity-User",    group: "Perplexity",  owner: "Perplexity (user fetch)",  rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)", source: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers" },
  { token: "CCBot",              label: "CCBot",              group: "Common Crawl", owner: "Common Crawl",            rendersJS: false, ua: "CCBot/2.0 (https://commoncrawl.org/faq/)", source: "https://commoncrawl.org/ccbot" },
  { token: "Google-Extended",    label: "Google-Extended",    group: "Google",      owner: "Google Gemini control token", rendersJS: true, ua: null, source: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers" },
  { token: "Applebot",           label: "Applebot",           group: "Apple",       owner: "Apple (search; feeds Apple Intelligence)", rendersJS: true, ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)", source: "https://support.apple.com/en-us/119829" },
  { token: "Meta-ExternalAgent", label: "Meta-ExternalAgent", group: "Meta",        owner: "Meta AI (training)",       rendersJS: false, ua: "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)", source: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers" },
  { token: "Amazonbot",          label: "Amazonbot",          group: "Amazon",      owner: "Amazon (Alexa/Rufus)",     rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot) Chrome/119.0.6045.214 Safari/537.36", source: "https://developer.amazon.com/amazonbot" },
  { token: "Bytespider",         label: "Bytespider",         group: "ByteDance",   owner: "ByteDance / TikTok (training)", rendersJS: false, ua: "Bytespider", source: "https://zhanzhang.toutiao.com/docs/intro/26899" },
  { token: "DuckAssistBot",      label: "DuckAssistBot",      group: "DuckDuckGo",  owner: "DuckDuckGo AI answers",   rendersJS: false, ua: "DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)", source: "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot" },
  { token: "MistralAI-User",     label: "MistralAI-User",     group: "Mistral",     owner: "Mistral (user fetch)",     rendersJS: false, ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; MistralAI-User/1.0; +https://docs.mistral.ai/robots)", source: "https://docs.mistral.ai/robots" },
];

const PROBE_TOKENS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Claude-SearchBot", "Meta-ExternalAgent", "Amazonbot"];

const SRC = {
  vercel:    { label: "Vercel AI-crawler study (2024)",         url: "https://vercel.com/blog/the-rise-of-the-ai-crawler" },
  seranking: { label: "SE Ranking, 300k-domain llms.txt study", url: "https://seranking.com/blog/llms-txt/" },
  geo:       { label: "GEO paper (Princeton et al., KDD '24)",  url: "https://arxiv.org/abs/2311.09735" },
  googleTitle: { label: "Google Search Central - title links",  url: "https://developers.google.com/search/docs/appearance/title-link" },
  googleMeta:  { label: "Google Search Central - snippets",     url: "https://developers.google.com/search/docs/appearance/snippet" },
  googleSchema:{ label: "Google Search Central - structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data" },
  foundation:{ label: "AirOps, industry study (2025)",          url: "https://www.airops.com/report/structuring-content-for-llms" },
  freshness: { label: "Semrush via ConvertMate (secondary source, 2026)", url: "https://www.omnibound.ai/blog/generative-engine-optimization-statistics" },
  position:  { label: "Kevin Indig citation-position analysis (secondary source, 2026)", url: "https://ahrefs.com/blog/how-to-rank-on-chatgpt/" },
  lighthouse:{ label: "Google Lighthouse — Agentic Browsing",   url: "https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring" },
  robotMeta: { label: "Google Search Central - robots meta and X-Robots-Tag", url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" },
  contentSignals: { label: "Content Signals specification", url: "https://contentsignals.org/" },
  webmcp:    { label: "WebMCP (W3C Community Group draft)",      url: "https://github.com/webmachinelearning/webmcp" },
};

const METHOD_NOTE =
  "We fetch with each bot's published user-agent from our servers. Sites that verify crawler IPs may treat the genuine bot differently. No external tool can fully see around that \u2014 including this one.";

const FETCH_TIMEOUT_MS = 9000;
const RENDER_TIMEOUT_MS = 25000;
const MAX_BYTES = 2_500_000;
const RENDER_CACHE_TTL = 21600; // 6h
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Injected into the page during render (addScriptTag) to read the signals an AI
// AGENT needs — things that only exist after JS runs and can't be seen in static
// HTML: live WebMCP tools (document.modelContext), the accessible name of every
// interactive control (computed against the real DOM), and the layout shift
// (CLS) that accumulated during load. It writes one JSON <script> node back into
// the page; the server reads it out of the returned HTML (see extractInjected).
// All wrapped in try/catch so a quirky page can never break the render.
const AGENT_PROBE_JS = `(function(){
  function t(s){return (s||'').replace(/\\s+/g,' ').trim();}
  var R={v:1,webmcp:{},a11y:{},cls:null,vitals:{}};
  // --- WebMCP (current spec: document.modelContext; older drafts: navigator) ---
  try{
    var mc=(typeof document!=='undefined'&&document.modelContext)||(typeof navigator!=='undefined'&&navigator.modelContext)||null;
    R.webmcp.present=!!mc;
    if(mc){
      R.webmcp.api=(document.modelContext?'document.modelContext':'navigator.modelContext');
      var n=null;
      try{ if(typeof mc.getTools==='function'){var g=mc.getTools(); if(g&&g.length!=null)n=g.length;} }catch(e){}
      try{ if(n==null&&mc.tools&&mc.tools.length!=null)n=mc.tools.length; }catch(e){}
      R.webmcp.tools=n;
    }
  }catch(e){R.webmcp.error=1;}
  // --- Agent-centric accessibility (computed on the live DOM) ---
  try{
    function vis(el){
      try{var s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)return false;}catch(e){}
      if(el.closest&&el.closest('[aria-hidden="true"]'))return false;
      var r=el.getBoundingClientRect?el.getBoundingClientRect():null;
      if(r&&r.width===0&&r.height===0)return false;
      return true;
    }
    function name(el){
      var al=el.getAttribute&&el.getAttribute('aria-label'); if(t(al))return t(al);
      var lb=el.getAttribute&&el.getAttribute('aria-labelledby');
      if(lb){var ref=document.getElementById(lb.split(/\\s+/)[0]); if(ref&&t(ref.textContent))return t(ref.textContent);}
      var tx=t(el.textContent); if(tx)return tx;
      var ti=el.getAttribute&&el.getAttribute('title'); if(t(ti))return t(ti);
      var tag=(el.tagName||'').toLowerCase(), ty=(el.getAttribute&&el.getAttribute('type')||'').toLowerCase();
      if(tag==='input'&&(ty==='submit'||ty==='button')){var v=el.getAttribute('value'); if(t(v))return t(v);}
      if(tag==='input'&&ty==='image'){var a=el.getAttribute('alt'); if(t(a))return t(a);}
      if(el.id){try{var lf=document.querySelector('label[for="'+(window.CSS&&CSS.escape?CSS.escape(el.id):el.id)+'"]'); if(lf&&t(lf.textContent))return t(lf.textContent);}catch(e){}}
      var pl=el.closest&&el.closest('label'); if(pl&&t(pl.textContent))return t(pl.textContent);
      var ph=el.getAttribute&&el.getAttribute('placeholder'); if(t(ph))return t(ph);
      var im=el.querySelector&&el.querySelector('img[alt]'); if(im&&t(im.getAttribute('alt')))return t(im.getAttribute('alt'));
      return '';
    }
    var sel='a[href],button,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),select,textarea';
    var els=document.querySelectorAll(sel), total=0, unnamed=0, samples=[];
    for(var i=0;i<els.length;i++){var el=els[i]; if(!vis(el))continue; total++; if(!name(el)){unnamed++; if(samples.length<8){var h=(el.getAttribute&&(el.getAttribute('class')||el.id))||''; samples.push(((el.tagName||'').toLowerCase())+(h?('.'+String(h).split(/\\s+/)[0]):''));}}}
    R.a11y.interactive=total; R.a11y.unnamed=unnamed; R.a11y.unnamedSamples=samples;
    var fields=document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]),select,textarea');
    var ft=0,fn=0; for(var j=0;j<fields.length;j++){var fe=fields[j]; if(!vis(fe))continue; ft++; if(!name(fe))fn++;}
    R.a11y.fields=ft; R.a11y.fieldsNoLabel=fn;
    var imgs=document.querySelectorAll('img'); var it=0,ina=0; for(var k=0;k<imgs.length;k++){var im2=imgs[k]; if(!vis(im2))continue; if(im2.getAttribute('role')==='presentation'||im2.getAttribute('aria-hidden')==='true')continue; it++; if(im2.getAttribute('alt')==null)ina++;}
    R.a11y.images=it; R.a11y.imagesNoAlt=ina;
    R.a11y.hasMain=!!document.querySelector('main,[role="main"]');
    R.a11y.landmarks=document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"]').length;
    R.a11y.h1=document.querySelectorAll('h1').length;
  }catch(e){R.a11y.error=1;}
  // --- write results back into the page for the server to read ---
  function write(){
    try{
      var node=document.getElementById('__blursor_agentic__')||document.createElement('script');
      node.type='application/json'; node.id='__blursor_agentic__';
      node.textContent=JSON.stringify(R).replace(/</g,'\\\\u003c');
      (document.body||document.documentElement).appendChild(node);
    }catch(e){}
  }
  // --- Layout stability (CLS). Prefer a buffered observer — it reports shifts
  // that happened before this probe was injected. Fall back to a sync read. An
  // empty result on a browser that supports the API means zero shift (good),
  // not "unknown" — so report 0, not null. ---
  try{
    var supported=!!(window.PerformanceObserver&&PerformanceObserver.supportedEntryTypes&&PerformanceObserver.supportedEntryTypes.indexOf('layout-shift')>=0);
    var got=false;
    if(supported){
      try{
        var total=0;
        var obs=new PerformanceObserver(function(list){
          list.getEntries().forEach(function(e){ if(!e.hadRecentInput) total+=e.value; });
          R.cls=Math.round(total*1000)/1000; got=true; write();
        });
        obs.observe({type:'layout-shift',buffered:true});
      }catch(e){}
    }
    if(!got){
      var ls=[]; try{ls=performance.getEntriesByType('layout-shift')||[];}catch(e){}
      if(ls.length){var c=0;for(var m=0;m<ls.length;m++){if(!ls[m].hadRecentInput)c+=ls[m].value;}R.cls=Math.round(c*1000)/1000;}
      else{R.cls=supported?0:null;}
    }
    try{var lcp=performance.getEntriesByType('largest-contentful-paint'); if(lcp&&lcp.length)R.vitals.lcp=Math.round(lcp[lcp.length-1].startTime);}catch(e){}
  }catch(e){R.cls=null;}
  write();
})();`;

export async function onRequestGet({ request, env }) {
  const reqUrl = new URL(request.url);
  const raw = (reqUrl.searchParams.get("url") || "").trim();

  let target;
  try {
    target = normalizeTarget(raw);
  } catch (e) {
    return json({ ok: false, error: e.message }, 400);
  }

  const rate = await checkRateLimit(request);
  if (!rate.ok) {
    return json({
      ok: false,
      error: "Easy there - this free tool is limited to 10 checks per hour from one IP so the render budget survives. Try again soon.",
      retryAfterSeconds: rate.retryAfter,
    }, 429, { "Retry-After": String(rate.retryAfter) });
  }

  try {
    const origin = `${target.protocol}//${target.host}`;
    const [robotsRes, llmsRes, baseline, ...probes] = await Promise.all([
      safeFetch(`${origin}/robots.txt`, BROWSER_UA),
      safeFetch(`${origin}/llms.txt`, BROWSER_UA),
      safeFetch(target.href, BROWSER_UA),
      ...PROBE_TOKENS.map((t) => safeFetch(target.href, AI_BOTS.find((b) => b.token === t).ua)),
    ]);

    if (!baseline.ok && baseline.status === 0) {
      return json({ ok: false, error: `Couldn't reach ${target.href} — ${baseline.error || "no response"}. Double-check the address.` }, 422);
    }
    if (baseline.status === 403 || baseline.status === 429) {
      return json({ ok: false, error: `We were blocked from loading ${target.href} (HTTP ${baseline.status}) — the site may be protected against automated tools, so we can't read it the way AI would.` }, 422);
    }
    if (baseline.status >= 400) {
      return json({ ok: false, error: `That page returned an error (HTTP ${baseline.status}) — there may be no live page at ${target.href}.` }, 422);
    }
    if (baseline.contentType && !/text\/html|application\/xhtml/i.test(baseline.contentType)) {
      return json({ ok: false, error: `That link isn't a web page (it's ${baseline.contentType.split(";")[0].trim()}). Paste a normal page URL instead.` }, 415);
    }

    const robotsRules = robotsRes.ok && robotsRes.status < 400 ? parseRobots(robotsRes.body) : null;
    const contentSignals = robotsRes.ok && robotsRes.status < 400 ? parseContentSignals(robotsRes.body) : [];
    const path = target.pathname || "/";

    const probeByToken = {};
    PROBE_TOKENS.forEach((t, i) => (probeByToken[t] = probes[i]));

    const botAccess = AI_BOTS.map((bot) => {
      const robots = robotsRules === null ? "no-robots" : isAllowed(robotsRules, bot, path) ? "allowed" : "disallowed";
      let server = "not-probed";
      const probe = probeByToken[bot.token];
      if (probe) {
        if (!probe.ok && probe.status === 0) server = "error";
        else if (probe.status === 403 || probe.status === 429) server = "blocked";
        else if (baseline.ok && probe.ok && cloaked(baseline, probe)) server = "cloaked";
        else server = "ok";
      }
      return { token: bot.token, label: bot.label, group: bot.group, owner: bot.owner, rendersJS: bot.rendersJS, robots, server, status: probe ? probe.status : null, source: bot.source || null };
    });

    // Raw HTML = what a non-JS crawler receives.
    const rawHtml = baseline.ok ? baseline.body : (probes.find((p) => p.ok)?.body || "");
    const rawPage = analyzeHtml(rawHtml);
    const indexSignals = parseIndexSignals(rawHtml, baseline.headers || {}, AI_BOTS);

    // Rendered HTML (post-JS) via Cloudflare Browser Rendering, if configured.
    const render = await renderViaCloudflare(target.href, env);
    const renderedPage = render.html ? analyzeHtml(render.html) : null;

    // If there's essentially nothing to analyze — no title, no text, no headings, and no JS
    // app to explain the emptiness — and rendering didn't reveal content either, don't
    // fabricate a report. It's likely a parked domain, an empty page, or a redirect.
    const rawEmpty = rawPage.visibleTextChars < 50 && !rawPage.title && rawPage.headings.h1 + rawPage.headings.h2 === 0 && !rawPage.frameworkHint && rawPage.scriptBytes < 2000;
    const renEmpty = !renderedPage || renderedPage.visibleTextChars < 50;
    if (rawEmpty && renEmpty) {
      return json({ ok: false, error: `We reached ${target.href} but found almost no readable content — it may be a parked domain, an empty page, or a redirect. Try the specific page you want to check.` }, 422);
    }

    const llms = { present: llmsRes.ok && llmsRes.status === 200, looksValid: false };
    if (llms.present) llms.looksValid = /^\s*#\s+/.test(llmsRes.body) && /\n\s*##\s+/.test(llmsRes.body);

    const findings = buildFindings({ botAccess, rawPage, renderedPage, llms, indexSignals, contentSignals });
    const summary = findings.reduce((a, f) => ((a[f.status] = (a[f.status] || 0) + 1), a), { pass: 0, warn: 0, fail: 0 });
    const citeability = buildCiteability({ rawHtml, rawPage, renderedPage, target });

    // The second half: can an AI AGENT use the page (not just read it)?
    const agentic = analyzeAgentic({ injected: render.agentic, renderedHtml: render.html, rawHtml, llms });

    return json({
      ok: true,
      url: target.href,
      finalUrl: baseline.finalUrl || target.href,
      checkedAt: new Date().toISOString(),
      renderMode: renderedPage ? "rendered" : "heuristic",
      renderStatus: render.status,
      summary,
      botAccess,
      content: rawPage,
      rendered: renderedPage ? { visibleTextChars: renderedPage.visibleTextChars, headings: renderedPage.headings, hasJsonLd: renderedPage.hasJsonLd, outline: renderedPage.outline } : null,
      screenshot: render.screenshot || null,
      llms,
      signals: { metaRobots: indexSignals, contentSignals },
      method: { note: METHOD_NOTE },
      findings,
      citeability,
      agentic,
    });
  } catch (e) {
    return json({ ok: false, error: `Check failed: ${e.message}` }, 500);
  }
}

// --- Browser Rendering (Cloudflare REST API) --------------------------------

async function renderViaCloudflare(url, env) {
  if (!env || !env.CF_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) return { html: null, screenshot: null, agentic: null, status: "no-credentials" };

  // Edge-cache renders by URL so repeat checks don't burn the daily budget. The
  // agent probe writes its results into the HTML (a JSON <script> node), so
  // caching the HTML caches the agent signals too — we just re-extract on a hit.
  let cache = null, cacheKey = null;
  try {
    cache = caches.default;
    cacheKey = new Request("https://render-cache.blursor.ai/v4/" + encodeURIComponent(url));
    const hit = await cache.match(cacheKey);
    if (hit) {
      const t = await hit.text();
      if (t) {
        const cached = JSON.parse(t);
        const html = cached && typeof cached.html === "string" ? cached.html : null;
        const screenshot = cached && typeof cached.screenshot === "string" ? cached.screenshot : null;
        if (html) return { html, screenshot, agentic: extractInjected(html), status: "cached" };
      }
    }
  } catch { /* cache optional */ }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/snapshot`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RENDER_TIMEOUT_MS);
  try {
    // Try WITH the agent probe injected. If that specific request fails (but the
    // budget isn't exhausted), retry a plain render — so the readability half can
    // never regress just because the probe params were unhappy.
    let out = await postContent(endpoint, env, url, true, ctrl);
    if (!out.html && out.status !== "quota-exceeded") out = await postContent(endpoint, env, url, false, ctrl);
    if (!out.html) return { html: null, screenshot: null, agentic: null, status: out.status };
    if (cache && cacheKey) {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify({ html: out.html, screenshot: out.screenshot || null }), {
          headers: { "Cache-Control": `public, max-age=${RENDER_CACHE_TTL}` },
        }));
      } catch {}
    }
    return { html: out.html, screenshot: out.screenshot || null, agentic: extractInjected(out.html), status: out.status };
  } catch (e) {
    return { html: null, screenshot: null, agentic: null, status: e.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function postContent(endpoint, env, url, withProbe, ctrl) {
  const body = {
    url,
    gotoOptions: { waitUntil: "networkidle0", timeout: 15000 },
    viewport: { width: 1100, height: 1400 },
    screenshotOptions: { type: "jpeg", quality: 70 },
  };
  if (withProbe) {
    // Inject the agent probe, then let late JS register WebMCP tools / layout
    // settle before the HTML is captured.
    body.addScriptTag = [{ content: AGENT_PROBE_JS }];
    body.waitForTimeout = 1000;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  });
  if (res.status === 429) return { html: null, status: "quota-exceeded" };
  if (!res.ok) return { html: null, status: `error-${res.status}` };
  const data = await res.json().catch(() => null);
  const result = data && data.success ? data.result : null;
  const html = typeof result === "string" ? result : (result && typeof result.content === "string" ? result.content : null);
  let screenshot = null;
  try { screenshot = result && typeof result.screenshot === "string" ? result.screenshot : null; } catch {}
  return { html, screenshot, status: html ? (withProbe ? "rendered" : "rendered-noprobe") : "empty" };
}

// Read the agent-probe results the injected script wrote into the page. The JSON
// has its "<" escaped to <, so it can't contain a literal </script> to trip
// this regex (or the browser's own HTML parser).
function extractInjected(html) {
  try {
    const m = html.match(/<script[^>]+id=["']__blursor_agentic__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!m) return null;
    const parsed = JSON.parse(m[1].trim());
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

// --- Helpers ----------------------------------------------------------------

function normalizeTarget(input) {
  if (!input) throw new Error("Add a ?url= parameter.");
  const urlText = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const rawHost = rawHostnameFromInput(urlText);
  if (isNumericHostToken(rawHost)) throw new Error("That host isn't allowed (numeric IP aliases are blocked).");

  let u;
  try {
    u = new URL(urlText);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http and https URLs are supported.");
  const host = u.hostname.toLowerCase();
  const ipv6Literal = host.startsWith("[") && host.endsWith("]");
  const blocked =
    host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    isPrivateIpv4(host) || isBlockedIpv6Literal(host) ||
    (!ipv6Literal && !host.includes("."));
  if (blocked) throw new Error("That host isn't allowed (internal/private addresses are blocked).");
  return u;
}

// SSRF guard notes:
// - rejects numeric/hex host aliases before URL() can normalize them (2130706433, 0x7f000001)
// - rejects localhost/private IPv4, .localhost/.local/.internal, and non-public IPv6 literals ([::], [::1], [fc00::1])
// - allows normal public domains and public IPv6 literals such as [2606:4700:4700::1111]
function rawHostnameFromInput(urlText) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?(\[[^\]]+\]|[^/:?#]+)/i.exec(urlText);
  return m ? m[1].toLowerCase() : "";
}

function isNumericHostToken(host) {
  return /^(?:0x[0-9a-f]+|\d+)$/i.test(String(host || ""));
}

function isPrivateIpv4(host) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function isBlockedIpv6Literal(host) {
  if (!host.startsWith("[") || !host.endsWith("]")) return false;
  const ip = host.slice(1, -1).toLowerCase();
  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") return true;
  if (/^(fc|fd|fe8|fe9|fea|feb|ff)/.test(ip)) return true;
  if (/^2001:db8(?::|$)/.test(ip)) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

async function checkRateLimit(request) {
  // Free-tier throttle: 10 valid checks per IP per hour. Cache failure falls open
  // so the checker remains usable if Cloudflare's edge cache is unavailable.
  try {
    if (typeof caches === "undefined" || !caches.default) return { ok: true };
    const ip = (request.headers.get("CF-Connecting-IP") ||
      (request.headers.get("x-forwarded-for") || "").split(",")[0] ||
      "unknown").trim() || "unknown";
    const now = Date.now();
    const cache = caches.default;
    const key = new Request("https://rate-limit.blursor.ai/api-check/" + encodeURIComponent(ip));
    const hit = await cache.match(key);
    let record = hit ? await hit.json().catch(() => null) : null;
    if (!record || typeof record.resetAt !== "number" || record.resetAt <= now) {
      record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    }

    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    if (record.count >= RATE_LIMIT_MAX) return { ok: false, retryAfter };

    record.count += 1;
    await cache.put(key, new Response(JSON.stringify(record), {
      headers: { "Cache-Control": `public, max-age=${retryAfter}` },
    }));
    return { ok: true, remaining: Math.max(0, RATE_LIMIT_MAX - record.count), retryAfter };
  } catch {
    return { ok: true };
  }
}

async function safeFetch(url, ua) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html,*/*" }, redirect: "follow", signal: ctrl.signal, cf: { cacheTtl: 0 } });
    const body = await readCapped(res);
    return {
      ok: true,
      status: res.status,
      body,
      bytes: body.length,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") || "",
      headers: { xRobotsTag: res.headers.get("x-robots-tag") || "" },
    };
  } catch (e) {
    return { ok: false, status: 0, body: "", bytes: 0, headers: {}, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return await res.text().catch(() => "");
  const dec = new TextDecoder();
  let out = "", total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    out += dec.decode(value, { stream: true });
    if (total >= MAX_BYTES) { try { await reader.cancel(); } catch {} break; }
  }
  return out;
}

function cloaked(base, probe) {
  if (probe.status !== base.status) return true;
  const a = base.bytes, b = probe.bytes;
  if (a === 0 && b === 0) return false;
  const ratio = Math.min(a, b) / Math.max(a, b || 1);
  return ratio < 0.6 && Math.abs(a - b) > 1500;
}

function parseRobots(text) {
  const groups = {};
  let current = [], expectingRules = false;
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (expectingRules) current = [];
      const key = value.toLowerCase();
      if (!groups[key]) groups[key] = [];
      if (!current.includes(groups[key])) current.push(groups[key]);
      expectingRules = false;
    } else if (field === "allow" || field === "disallow") {
      expectingRules = true;
      for (const rules of current) rules.push({ type: field, value });
    }
  }
  return groups;
}

function parseContentSignals(text) {
  const signals = [];
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = /^content-signal\s*:\s*(.+)$/i.exec(line);
    if (!m) continue;
    const raw = m[1].trim();
    const directives = {};
    raw.split(",").forEach((part) => {
      const kv = part.trim().split(/\s*=\s*/);
      if (kv.length === 2 && kv[0]) directives[kv[0].toLowerCase()] = kv[1].toLowerCase();
    });
    signals.push({ raw, directives });
  }
  return signals;
}

function isAllowed(groups, bot, path) {
  const rules = robotsRulesFor(groups, bot) || null;
  if (!rules || rules.length === 0) return true;
  let best = null, bestLen = -1;
  for (const r of rules) {
    const len = robotsMatchLen(r.value, path);
    if (len > bestLen || (len === bestLen && r.type === "allow")) { bestLen = len; best = r; }
  }
  if (!best || bestLen < 0) return true;
  return best.type === "allow";
}

function robotsRulesFor(groups, bot) {
  const token = String(bot && bot.token || "").toLowerCase();
  let best = null, bestLen = -1;
  for (const key of Object.keys(groups || {})) {
    if (key === "*") continue;
    const k = key.toLowerCase();
    const matches = k === token || k.startsWith(token) || token.startsWith(k);
    if (matches && k.length > bestLen) {
      best = groups[key];
      bestLen = k.length;
    }
  }
  return best || (groups && groups["*"]) || null;
}

function robotsMatchLen(pattern, path) {
  if (pattern === "") return -1;
  let re = "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  if (re.endsWith("\\$")) re = re.slice(0, -2) + "$";
  try { return new RegExp(re).test(path) ? pattern.replace(/\*/g, "").length : -1; } catch { return -1; }
}

function parseIndexSignals(html, headers, bots) {
  const names = new Set(["robots", ...bots.map((b) => b.token.toLowerCase())]);
  const records = [];
  let m, guard = 0;
  const metaRe = /<meta\b[^>]*>/gi;
  while ((m = metaRe.exec(html || "")) !== null && guard++ < 5000) {
    const tag = m[0];
    const name = String(attr(tag, "name") || "").trim().toLowerCase();
    if (!name || !names.has(name)) continue;
    const content = String(attr(tag, "content") || "").trim();
    if (!content) continue;
    records.push(indexDirectiveRecord("meta", name, content));
  }

  const header = String(headers && (headers.xRobotsTag || headers["x-robots-tag"]) || "").trim();
  if (header) records.push(indexDirectiveRecord("header", "x-robots-tag", header));

  return {
    records,
    hasNoindex: records.some((r) => r.noindex),
    hasNoai: records.some((r) => r.noai),
  };
}

function indexDirectiveRecord(source, name, content) {
  const lower = content.toLowerCase();
  const directives = lower.split(/[,\s;]+/).map((d) => d.trim()).filter(Boolean);
  const noindex = directives.includes("noindex") || directives.includes("none") || /\bnoindex\b/i.test(content) || /\bnone\b/i.test(content);
  const noai = directives.includes("noai") || directives.includes("noimageai") || /\bnoai\b/i.test(content) || /\bnoimageai\b/i.test(content);
  return { source, name, content, directives, noindex, noai };
}

function analyzeHtml(html) {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? decode(titleM[1].trim()) : null;
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  const metaDescription = descM ? attr(descM[0], "content") : null;
  const canonM = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const canonical = canonM ? attr(canonM[0], "href") : null;

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  const h3 = (html.match(/<h3[\s>]/gi) || []).length;

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const jsonLdTypes = [];
  for (const block of jsonLdBlocks) {
    const inner = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    for (const m of inner.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) jsonLdTypes.push(m[1]);
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const outline = extractOutline(html);
  const firstParagraph = (outline.find((b) => b.tag === "p" && b.text && b.text.length >= 40) || {}).text || null;
  const visibleTextChars = stripped.length;
  const htmlBytes = html.length;
  const scriptBytes = (html.match(/<script[\s\S]*?<\/script>/gi) || []).join("").length;
  const textRatio = htmlBytes > 0 ? visibleTextChars / htmlBytes : 1;
  const frameworkHint = detectFramework(html);

  // Heuristic JS-shell flag — only used as a FALLBACK when no render is available.
  // Signal: a JS-framework page that ships almost no readable text AND has no
  // headings in the raw HTML (real content pages keep headings even when JS-heavy),
  // or a near-empty shell. NB: text-to-HTML ratio is deliberately NOT used — modern
  // SSR pages ship huge inline JS/JSON beside full content and would false-positive
  // (e.g. Vercel's blog: 14k chars of text but a 2% text ratio).
  const looksLikeJsShell =
    (frameworkHint !== null && h1 + h2 === 0 && visibleTextChars < 2500) ||
    (visibleTextChars < 500 && scriptBytes > 1000);

  return {
    title, titleLength: title ? title.length : 0,
    metaDescription, metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    canonical, headings: { h1, h2, h3 }, headingOrderOk: h1 === 1,
    hasJsonLd: jsonLdBlocks.length > 0, jsonLdTypes: [...new Set(jsonLdTypes)],
    visibleTextChars, htmlBytes, scriptBytes, textRatio: Math.round(textRatio * 1000) / 1000,
    looksLikeJsShell, frameworkHint,
    outline,
    firstParagraph,
  };
}

// Pull readable blocks (headings, paragraphs, lists) in document order — a
// heuristic "what the crawler actually extracts" view. Operates on script-free
// HTML so it reflects readable content, not code.
function extractOutline(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // NB: we deliberately do NOT strip nav/footer — the point of this view is to
  // show everything the crawler actually receives, chrome included. The UI has
  // a search box for navigating long output.
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, total = 0;
  while ((m = re.exec(clean)) !== null) {
    const tag = m[1].toLowerCase();
    let text = decode(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (!text) continue;
    if (text.length > 300) text = text.slice(0, 299) + "…";
    blocks.push({ tag, text });
    total += text.length;
    if (blocks.length >= 150 || total > 15000) { blocks.push({ tag: "more", text: "…(truncated — showing the first part)" }); break; }
  }
  return blocks;
}

function buildCiteability({ rawHtml, rawPage, renderedPage, target }) {
  const blocks = extractCiteBlocks(rawHtml);
  if (blocks.length < 5) {
    const renderedBlocks = renderedPage && renderedPage.outline ? renderedPage.outline.length : 0;
    const detail = renderedBlocks >= 5
      ? `Raw HTML has ${blocks.length} readable content block${blocks.length === 1 ? "" : "s"} after page chrome is skipped. A rendered browser shows ${renderedBlocks}, but most AI crawlers judge the raw version.`
      : `Raw HTML has ${blocks.length} readable content block${blocks.length === 1 ? "" : "s"} after page chrome is skipped.`;
    const findings = [finding("cite-thin", "Too short to judge for citations", "info", detail,
      "These checks matter most for articles, guides, and product pages - not every short homepage needs quotes, stats, and source links.", null)];
    return { summary: summarize(findings), findings };
  }

  const findings = [];
  const quotes = countQuoteSignals(blocks);
  findings.push(finding("cite-quotes", quotes.count ? "Direct quotations present" : "No direct quotations found", quotes.count ? "pass" : "warn",
    quotes.count
      ? `${quotes.count} direct quote signal${quotes.count === 1 ? "" : "s"} found in the raw page content (${quotes.blockquotes} blockquote${quotes.blockquotes === 1 ? "" : "s"}, ${quotes.inlineQuotes} quoted passage${quotes.inlineQuotes === 1 ? "" : "s"}).`
      : "No blockquotes or quoted passages of 25+ characters found in the raw page content.",
    "Peer-reviewed: the GEO paper found quotation addition was its strongest tested generative-engine visibility method, with about a 28-40% lift.", SRC.geo));

  const stats = countStatSignals(blocks);
  findings.push(finding("cite-stats", stats.count >= 2 ? "Statistics present" : stats.count === 1 ? "Only one statistic found" : "No statistics found",
    stats.count >= 2 ? "pass" : stats.count === 1 ? "info" : "warn",
    stats.count
      ? `${stats.count} statistic-like signal${stats.count === 1 ? "" : "s"} found in paragraph/list text${stats.examples.length ? `, including ${stats.examples.join(", ")}.` : "."}`
      : "No percentages, currency figures, ranges, multipliers, or 'N of M' patterns found in paragraph/list text.",
    "Peer-reviewed: the GEO paper found statistics addition was one of the strongest tested ways to improve generative-engine visibility.", SRC.geo));

  const links = countExternalContentLinks(rawHtml, target.href);
  findings.push(finding("cite-sources", links.count >= 2 ? "Cites outside sources" : links.count === 1 ? "Only one outside source link" : "No outside source links",
    links.count >= 2 ? "pass" : links.count === 1 ? "info" : "warn",
    links.count
      ? `${links.count} external content link${links.count === 1 ? "" : "s"} found across ${links.domains.length} outside domain${links.domains.length === 1 ? "" : "s"}${links.domains.length ? ` (${links.domains.slice(0, 3).join(", ")}${links.domains.length > 3 ? ", ..." : ""}).` : "."}`
      : "No outbound links to external domains found inside paragraph/list content.",
    "Peer-reviewed: the GEO paper found source citations were one of its top methods, especially for lower-ranked pages.", SRC.geo));

  const fresh = findFreshnessDate(rawHtml);
  if (!fresh.date) {
    findings.push(finding("cite-freshness", "No clear content date found", "info",
      "No article meta date, JSON-LD date, time[datetime], or visible 'Updated ...' date was parseable in the raw HTML.",
      "Secondary source: Semrush data cited via ConvertMate says AI Overview citations skew toward pages updated within the last year.", SRC.freshness));
  } else {
    const age = ageMonths(fresh.date);
    const status = age < 12 ? "pass" : "warn";
    findings.push(finding("cite-freshness", status === "pass" ? "Content date is fresh" : "Content date looks older", status,
      `${fresh.kind}: ${fresh.date.toISOString().slice(0, 10)} (${age < 1 ? "less than 1 month" : `${Math.round(age)} months`} old).`,
      "Secondary source: Semrush data cited via ConvertMate says AI Overview citations skew toward pages updated within the last year.", SRC.freshness));
  }

  const position = answerPosition(blocks);
  findings.push(finding("cite-position", position.status === "pass" ? "Answer appears near the top" : position.status === "warn" ? "Main answer starts late" : "No clear answer opening found",
    position.status,
    position.detail,
    "Secondary source: citation-position research attributed to SparkToro/Kevin Indig says many AI citations come from the first 30% of a page.", SRC.position));

  return { summary: summarize(findings), findings };
}

function summarize(findings) {
  return findings.reduce((a, f) => ((a[f.status] = (a[f.status] || 0) + 1), a), { pass: 0, warn: 0, fail: 0, info: 0 });
}

function extractCiteBlocks(html) {
  const clean = stripChrome(html || "");
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, guard = 0;
  while ((m = re.exec(clean)) !== null && guard++ < 1000) {
    const tag = m[1].toLowerCase();
    const inner = m[2] || "";
    const text = decode(inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text.length < 8) continue;
    blocks.push({ tag, text, html: inner });
  }
  return blocks;
}

function stripChrome(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
}

function countQuoteSignals(blocks) {
  const blockquotes = blocks.filter((b) => b.tag === "blockquote" && b.text.length >= 25).length;
  const text = blocks.map((b) => b.text).join(" ");
  const straight = [...text.matchAll(/"([^"]{25,})"/g)].length;
  const curly = [...text.matchAll(/\u201c([^\u201d]{25,})\u201d/g)].length;
  return { count: blockquotes + straight + curly, blockquotes, inlineQuotes: straight + curly };
}

function countStatSignals(blocks) {
  const text = blocks.filter((b) => b.tag === "p" || b.tag === "li" || b.tag === "blockquote").map((b) => b.text).join(" ");
  const re = /(?:[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|million|billion))?|\b\d+(?:[.,]\d+)?\s?(?:%|per cent)\b|\b\d+(?:[.,]\d+)?\s?(?:x|\u00d7)\b|\b\d+(?:[.,]\d+)?\s?(?:-|to|–)\s?\d+(?:[.,]\d+)?\b|\b\d+\s+of\s+\d+\b)/gi;
  const matches = [...text.matchAll(re)].map((m) => m[0].replace(/\s+/g, " ").trim());
  return { count: matches.length, examples: [...new Set(matches)].slice(0, 3) };
}

function countExternalContentLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const baseHost = normHost(base.hostname);
  const blocks = extractCiteBlocks(html);
  const links = new Set();
  const domains = new Set();
  for (const block of blocks.filter((b) => b.tag === "p" || b.tag === "li" || b.tag === "blockquote")) {
    const re = /<a\b[^>]*\shref\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let m, guard = 0;
    while ((m = re.exec(block.html)) !== null && guard++ < 200) {
      const href = decode(m[1].trim());
      if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
      let u;
      try { u = new URL(href, base); } catch { continue; }
      if (!/^https?:$/i.test(u.protocol)) continue;
      const host = normHost(u.hostname);
      if (!host || host === baseHost) continue;
      links.add(u.href.split("#")[0]);
      domains.add(host);
    }
  }
  return { count: links.size, domains: [...domains] };
}

function normHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

function findFreshnessDate(html) {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  const wanted = ["article:modified_time", "article:published_time"];
  for (const key of wanted) {
    for (const tag of metas) {
      const prop = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
      if (prop === key) {
        const d = parseDateCandidate(attr(tag, "content"));
        if (d) return { date: d, kind: key };
      }
    }
  }

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const field of ["dateModified", "datePublished"]) {
    for (const block of jsonLdBlocks) {
      const inner = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
      const m = inner.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, "i"));
      const d = m ? parseDateCandidate(decode(m[1])) : null;
      if (d) return { date: d, kind: `JSON-LD ${field}` };
    }
  }

  const timeRe = /<time\b[^>]*\sdatetime\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let tm;
  while ((tm = timeRe.exec(html)) !== null) {
    const d = parseDateCandidate(tm[1]);
    if (d) return { date: d, kind: "time[datetime]" };
  }

  const text = decode(stripChrome(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const visible = text.match(/\b(?:Updated|Last updated|Published|Reviewed)\s*(?:on|:)?\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const d = visible ? parseDateCandidate(visible[1]) : null;
  return d ? { date: d, kind: "visible updated/published date" } : { date: null, kind: null };
}

function parseDateCandidate(value) {
  if (!value) return null;
  const d = new Date(String(value).trim());
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1990 || d.getFullYear() > 2100) return null;
  return d;
}

function ageMonths(date) {
  const ms = Math.max(0, Date.now() - date.getTime());
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

function answerPosition(blocks) {
  const total = blocks.length;
  const earlyCount = Math.max(1, Math.ceil(total * 0.3));
  const totalChars = blocks.reduce((n, b) => n + b.text.length, 0) || 1;
  const earlyChars = blocks.slice(0, earlyCount).reduce((n, b) => n + b.text.length, 0);
  const earlyShare = Math.round((earlyChars / totalChars) * 100);
  let pairIndex = -1;
  for (let i = 0; i < total; i++) {
    if (!/^h[1-6]$/.test(blocks[i].tag)) continue;
    for (let j = i + 1; j < Math.min(total, i + 5); j++) {
      if ((blocks[j].tag === "p" || blocks[j].tag === "li" || blocks[j].tag === "blockquote") && blocks[j].text.length >= 40) {
        pairIndex = i;
        break;
      }
      if (/^h[1-6]$/.test(blocks[j].tag)) break;
    }
    if (pairIndex >= 0) break;
  }
  if (pairIndex < 0) {
    return { status: "info", detail: `${total} content blocks found, but no clear heading-plus-answer opening was detected. The first 30% holds ${earlyShare}% of extracted text.` };
  }
  const firstBlock = pairIndex + 1;
  const status = pairIndex < earlyCount ? "pass" : "warn";
  return {
    status,
    detail: `The first heading-plus-body pair starts at block ${firstBlock} of ${total}. The first 30% of blocks holds ${earlyShare}% of extracted text.`,
  };
}

function detectFramework(html) {
  if (/<div[^>]+id=["']__next["']/i.test(html) || /\/_next\/static\//i.test(html)) return "Next.js";
  if (/__NUXT__|\/_nuxt\//i.test(html)) return "Nuxt";
  if (/<div[^>]+id=["']___gatsby["']/i.test(html)) return "Gatsby";
  if (/data-sveltekit|__sveltekit/i.test(html)) return "SvelteKit";
  if (/window\.__remixContext|__remixManifest/i.test(html)) return "Remix";
  if (/ng-version=/i.test(html)) return "Angular";
  if (/<astro-island/i.test(html)) return "Astro (islands)";
  if (/<div[^>]+data-reactroot/i.test(html)) return "React";
  if (/<div[^>]+id=["']root["']/i.test(html)) return "React (root)";
  if (/<div[^>]+id=["']app["']/i.test(html)) return "Vue/SPA (app)";
  return null;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', "i"));
  return m ? decode(m[1].trim()) : null;
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}

// --- Agentic readiness ------------------------------------------------------
// Can an AI AGENT navigate and USE the page (not just read it)? Judged on the
// RENDERED page — agents drive a real browser — using the live probe when it
// came back, and HTML heuristics otherwise. Mirrors the signals in Google's
// Lighthouse "Agentic Browsing" category: WebMCP tools, accessible names on
// interactive controls, layout stability (CLS), and llms.txt discoverability.

function analyzeAgentic({ injected, renderedHtml, rawHtml, llms }) {
  const haveProbe = !!(injected && injected.a11y && !injected.a11y.error && typeof injected.a11y.interactive === "number");
  // measured  = live probe ran in the browser (accurate)
  // rendered-html = page rendered but the probe didn't report; read the HTML
  // heuristic = no render at all; rough read of the raw HTML
  const mode = haveProbe ? "measured" : (renderedHtml ? "rendered-html" : "heuristic");

  const a11y = haveProbe ? normalizeA11y(injected.a11y) : a11yFromHtml(renderedHtml || rawHtml || "");
  const cls = haveProbe && typeof injected.cls === "number" ? injected.cls : null;

  // WebMCP: live presence (probe) OR a source-level mention in the page code.
  const srcScan = scanWebmcpSource(rawHtml);
  const webmcp = {
    present: !!(injected && injected.webmcp && injected.webmcp.present) || srcScan.found,
    runtime: !!(injected && injected.webmcp && injected.webmcp.present),
    tools: injected && injected.webmcp && injected.webmcp.tools != null ? injected.webmcp.tools : null,
    source: srcScan.found ? srcScan.how : null,
  };

  // Static layout-shift risk (used when CLS couldn't be measured): images with
  // no set size are the classic cause of content jumping during load.
  const imgRisk = countDimensionlessImages(renderedHtml || rawHtml || "");

  const findings = buildAgenticFindings({ mode, a11y, cls, webmcp, imgRisk, llms });
  const summary = findings.reduce((acc, f) => ((acc[f.status] = (acc[f.status] || 0) + 1), acc), { pass: 0, warn: 0, fail: 0, info: 0 });

  return {
    mode,
    summary,
    findings,
    signals: { webmcp, a11y, cls, lcp: haveProbe && injected.vitals ? (injected.vitals.lcp ?? null) : null, imgRisk },
  };
}

function normalizeA11y(a) {
  return {
    interactive: a.interactive || 0,
    unnamed: a.unnamed || 0,
    unnamedSamples: a.unnamedSamples || [],
    fields: a.fields || 0,
    fieldsNoLabel: a.fieldsNoLabel || 0,
    images: a.images || 0,
    imagesNoAlt: a.imagesNoAlt || 0,
    hasMain: !!a.hasMain,
    landmarks: a.landmarks || 0,
    h1: a.h1 || 0,
    approx: false,
  };
}

function buildAgenticFindings({ mode, a11y, cls, webmcp, imgRisk, llms }) {
  const f = [];
  const ratio = a11y.interactive > 0 ? a11y.unnamed / a11y.interactive : 0;

  // 1. Accessible names on interactive controls — the core "can an agent operate this?" check
  if (a11y.interactive === 0) {
    f.push(finding("agent-labels", "No interactive elements found", "info",
      "We didn't find buttons, links, or form fields on the rendered page.",
      "Agents act by using controls. A page with nothing to operate is read-only to them — fine for an article, limiting for an app.", SRC.lighthouse));
  } else if (a11y.unnamed === 0) {
    f.push(finding("agent-labels", "Buttons and links are clearly labeled", "pass",
      `All ${a11y.interactive} interactive elements have a name an agent can read.`,
      "Agents pick what to click by each control's accessible name. Clear names mean reliable actions.", SRC.lighthouse));
  } else {
    const st = ratio > 0.25 ? "fail" : "warn";
    const eg = a11y.unnamedSamples && a11y.unnamedSamples.length ? ` (e.g. ${a11y.unnamedSamples.slice(0, 4).join(", ")})` : "";
    f.push(finding("agent-labels", "Some buttons or links have no readable label", st,
      `${a11y.unnamed} of ${a11y.interactive} interactive elements have no name an agent can read${eg}.`,
      "An icon-only button or a bare link is invisible or ambiguous to an agent — and to screen-reader users. Give each a clear label.", SRC.lighthouse));
  }

  // 2. Form fields
  if (a11y.fields > 0) {
    if (a11y.fieldsNoLabel === 0) {
      f.push(finding("agent-forms", "Form fields are labeled", "pass",
        `All ${a11y.fields} form field${a11y.fields === 1 ? "" : "s"} have a label.`,
        "To fill a form, an agent needs to know what each field is for.", SRC.lighthouse));
    } else {
      const st = a11y.fieldsNoLabel >= a11y.fields ? "fail" : "warn";
      f.push(finding("agent-forms", "Some form fields have no label", st,
        `${a11y.fieldsNoLabel} of ${a11y.fields} form fields have no label.`,
        "An unlabeled field forces an agent to guess what to type — a common point of failure.", SRC.lighthouse));
    }
  }

  // 3. Images
  if (a11y.images > 0) {
    if (a11y.imagesNoAlt === 0) {
      f.push(finding("agent-images", "Images have text descriptions", "pass",
        `All ${a11y.images} content image${a11y.images === 1 ? "" : "s"} have alt text.`,
        "Agents and blind users read images through their alt text.", SRC.lighthouse));
    } else {
      f.push(finding("agent-images", "Some images have no text description", "warn",
        `${a11y.imagesNoAlt} of ${a11y.images} content images have no alt text.`,
        "Without alt text, what an image shows is invisible to an agent.", SRC.lighthouse));
    }
  }

  // 4. Structure / landmarks
  const sIssues = [];
  if (!a11y.hasMain) sIssues.push("no main-content landmark");
  if (a11y.h1 !== 1) sIssues.push(`${a11y.h1} H1 heading${a11y.h1 === 1 ? "" : "s"} (want exactly 1)`);
  if (sIssues.length === 0) {
    f.push(finding("agent-structure", "Clear structure to navigate", "pass",
      "One H1 and a main-content landmark are present.",
      "Agents use landmarks and a single clear H1 to tell your content from the page chrome.", SRC.lighthouse));
  } else {
    f.push(finding("agent-structure", "Page structure could be clearer", "warn",
      `${cap(sIssues.join("; "))}.`,
      "Without a main landmark and one clear H1, an agent has a harder time finding the actual content.", SRC.lighthouse));
  }

  // 5. Layout stability (CLS)
  if (cls !== null && cls !== undefined) {
    if (cls <= 0.1) {
      f.push(finding("agent-stability", "Your page holds still as it loads", "pass",
        `Layout shift (CLS) is ${cls} — Google's "good" mark is 0.1 or under.`,
        "When content stays put, an agent clicks what it means to.", SRC.lighthouse));
    } else if (cls <= 0.25) {
      f.push(finding("agent-stability", "Your page shifts a little as it loads", "warn",
        `Layout shift (CLS) is ${cls} (good is 0.1 or under).`,
        "Moving content can make an agent click the wrong thing as the page settles.", SRC.lighthouse));
    } else {
      f.push(finding("agent-stability", "Your page jumps around as it loads", "fail",
        `Layout shift (CLS) is ${cls} (good is 0.1 or under).`,
        "A lot of movement during load is a recipe for mis-clicks — by agents and people alike.", SRC.lighthouse));
    }
  } else {
    const d = imgRisk > 0
      ? `We couldn't measure it on this render. ${imgRisk} image${imgRisk === 1 ? "" : "s"} have no set size — the most common cause of layout jumps.`
      : "We couldn't measure it on this render, and saw no obvious layout-shift risks in the markup.";
    f.push(finding("agent-stability", "Layout shift not measured", "info", d,
      "If content moves while loading, an agent can click the wrong thing. Worth a manual look.", SRC.lighthouse));
  }

  // 6. WebMCP — forward-looking, never counted against the page
  if (webmcp.present) {
    const how = webmcp.runtime
      ? (webmcp.tools != null ? `${webmcp.tools} tool${webmcp.tools === 1 ? "" : "s"} registered live via the WebMCP API` : "registered live via the WebMCP API (document.modelContext)")
      : `referenced in the page's code (${webmcp.source})`;
    f.push(finding("agent-webmcp", "Exposes agent actions (WebMCP)", "pass", cap(how) + ".",
      "Rare and ahead of the curve: WebMCP lets an agent call your site's actions directly, instead of guessing from the UI.", SRC.webmcp));
  } else {
    f.push(finding("agent-webmcp", "No agent actions yet (WebMCP) — that's normal", "info",
      "We found no WebMCP tools. Almost no site has them yet — the standard is brand new (Chrome-only, experimental).",
      "Forward-looking only: a site isn't behind for lacking WebMCP today. Worth knowing about for when agents start using it.", SRC.webmcp));
  }

  // 7. Discoverability — Lighthouse's agentic category checks for llms.txt
  if (llms && llms.present) {
    f.push(finding("agent-discoverability", "llms.txt is present", "info",
      "Lighthouse's agentic checks count llms.txt being present.",
      "Worth knowing it's there — though a 300k-site study found llms.txt doesn't actually drive AI citations.", SRC.seranking));
  } else {
    f.push(finding("agent-discoverability", "No llms.txt (that's fine)", "info",
      "Lighthouse counts llms.txt presence, but it's optional.",
      "Research shows llms.txt doesn't move the needle, so skipping it costs nothing.", SRC.seranking));
  }

  return f;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Source-level WebMCP backstop: catch pages that reference the API even if the
// runtime probe didn't observe a registered tool in time.
function scanWebmcpSource(rawHtml) {
  // Scan the RAW HTML only. The rendered HTML contains our own injected probe
  // (which references modelContext), which would otherwise self-trigger this.
  const hay = rawHtml || "";
  if (/\bmodelContext\b/.test(hay)) return { found: true, how: "modelContext in page code" };
  if (/\bregisterTool\s*\(/.test(hay)) return { found: true, how: "registerTool() in page code" };
  return { found: false, how: null };
}

function countDimensionlessImages(html) {
  if (!html) return 0;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  let n = 0;
  for (const tag of imgs) {
    if (/aria-hidden=["']true["']/i.test(tag)) continue;
    const hasW = /\swidth\s*=/i.test(tag) || /style=["'][^"']*\bwidth\s*:/i.test(tag) || /\baspect-ratio\s*:/i.test(tag);
    const hasH = /\sheight\s*=/i.test(tag) || /style=["'][^"']*\bheight\s*:/i.test(tag) || /\baspect-ratio\s*:/i.test(tag);
    if (!(hasW && hasH)) n++;
  }
  return n;
}

// Fallback accessible-name read straight from HTML, used when the live probe
// didn't run. Cruder than the in-page probe (it can't resolve label[for] or
// computed visibility), so results carry approx:true and the UI says so.
function a11yFromHtml(html) {
  const res = { interactive: 0, unnamed: 0, unnamedSamples: [], fields: 0, fieldsNoLabel: 0, images: 0, imagesNoAlt: 0, hasMain: false, landmarks: 0, h1: 0, approx: true };
  if (!html) return res;
  res.hasMain = /<main[\s>]/i.test(html) || /role=["']main["']/i.test(html);
  res.landmarks = (html.match(/<(main|nav|header|footer|aside)[\s>]/gi) || []).length + (html.match(/role=["'](main|navigation|banner|contentinfo)["']/gi) || []).length;
  res.h1 = (html.match(/<h1[\s>]/gi) || []).length;

  const named = (attrs, inner) =>
    /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) ||
    /title\s*=\s*["'][^"']+["']/i.test(attrs) ||
    (inner != null && inner.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length > 0) ||
    (inner != null && /<img[^>]+alt\s*=\s*["'][^"']+["']/i.test(inner));

  const note = (label) => { res.unnamed++; if (res.unnamedSamples.length < 8) res.unnamedSamples.push(label); };

  let m, guard = 0;
  const linkRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((m = linkRe.exec(html)) !== null && guard++ < 5000) {
    const tag = m[1].toLowerCase(), attrs = m[2], inner = m[3];
    if (tag === "a" && !/\shref\s*=/i.test(attrs)) continue; // anchors without href aren't controls
    res.interactive++;
    if (!named(attrs, inner)) note(tag);
  }

  guard = 0;
  const inputRe = /<input\b([^>]*)>/gi;
  while ((m = inputRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[1];
    const type = ((attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1] || "text").toLowerCase();
    if (type === "hidden") continue;
    if (type === "submit" || type === "button" || type === "image" || type === "reset") {
      res.interactive++;
      const ok = /value\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /alt\s*=\s*["'][^"']+["']/i.test(attrs);
      if (!ok) note("input." + type);
      continue;
    }
    res.interactive++; res.fields++;
    const ok = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /title\s*=\s*["'][^"']+["']/i.test(attrs) || /placeholder\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs);
    if (!ok) { res.fieldsNoLabel++; note("input." + type); }
  }

  guard = 0;
  const fieldRe = /<(select|textarea)\b([^>]*)>/gi;
  while ((m = fieldRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[2];
    res.interactive++; res.fields++;
    const ok = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /title\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs);
    if (!ok) { res.fieldsNoLabel++; note(m[1].toLowerCase()); }
  }

  guard = 0;
  const imgRe = /<img\b([^>]*)>/gi;
  while ((m = imgRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[1];
    if (/role=["']presentation["']/i.test(attrs) || /aria-hidden=["']true["']/i.test(attrs)) continue;
    res.images++;
    if (!/\salt\s*=/i.test(attrs)) res.imagesNoAlt++;
  }

  return res;
}

// --- Findings ---------------------------------------------------------------

function buildFindings({ botAccess, rawPage, renderedPage, llms, indexSignals, contentSignals }) {
  const f = [];

  const blocked = botAccess.filter((b) => b.server === "blocked");
  const cloakedBots = botAccess.filter((b) => b.server === "cloaked");
  if (blocked.length) {
    f.push(finding("server-block", "Your server blocks AI crawlers", "fail",
      `${blocked.map((b) => b.token).join(", ")} got a 403/429 — the page never reaches them.`,
      "If the server turns the bot away, nothing else matters; the content can't be read or cited.", SRC.vercel));
  } else {
    f.push(finding("server-block", "Server lets AI crawlers through", "pass",
      "No 403/429 for the bots we probed.", "Step one of being cited is simply being fetchable.", SRC.vercel));
  }
  if (cloakedBots.length) {
    f.push(finding("cloaking", "Different content served to bots", "warn",
      `${cloakedBots.map((b) => b.token).join(", ")} received a noticeably different page than a browser.`,
      "Serving bots a thinner page is risky and can misrepresent what gets cited.", SRC.vercel));
  }

  const disallowed = botAccess.filter((b) => b.robots === "disallowed");
  if (disallowed.length) {
    const item = finding("robots", "robots.txt disallows AI crawlers", "fail",
      `Blocked by robots.txt: ${disallowed.map((b) => b.token).join(", ")}.`,
      "robots.txt is the front door. Disallowed bots won't crawl you at all.", SRC.vercel);
    item.copyLabel = "Paste into robots.txt if you want these bots allowed:";
    item.copyText = robotsAllowSnippet(disallowed);
    f.push(item);
  } else {
    f.push(finding("robots", "robots.txt allows AI crawlers", "pass",
      "No AI-bot tokens are disallowed for this path.", "Allowing the bots is necessary to appear in AI answers.", SRC.vercel));
  }

  // The headline check: raw-vs-rendered content gap.
  f.push(contentFinding(rawPage, renderedPage, botAccess));
  f.push(metaRobotsFinding(indexSignals));
  f.push(contentSignalsFinding(contentSignals));

  // Citeability basics — judged on the RAW HTML (what most AI crawlers get).
  if (!rawPage.title) f.push(finding("title", "Missing <title>", "fail", "No title tag in the raw HTML.", "A clear title helps models label and summarize this page.", SRC.googleTitle));
  else f.push(finding("title", "Has a title", "pass", `“${truncate(rawPage.title, 80)}”`, "Gives the model a clear label for citation.", SRC.geo));

  if (!rawPage.metaDescription) {
    const item = finding("meta", "No meta description", "warn", "No meta description in the raw HTML.", "A clear summary helps models quote you accurately.", SRC.geo);
    const draft = metaDescriptionDraft(rawPage);
    if (draft) {
      item.copyLabel = "A starting point - edit before shipping:";
      item.copyText = `<meta name="description" content="${escapeAttr(draft)}">`;
    }
    f.push(item);
  } else {
    f.push(finding("meta", "Has a meta description", "pass", truncate(rawPage.metaDescription, 100), "Gives a ready-made summary to quote.", SRC.geo));
  }

  if (rawPage.headings.h1 === 1) f.push(finding("headings", "Clean heading structure", "pass", `1 H1, ${rawPage.headings.h2} H2, ${rawPage.headings.h3} H3.`, "A clear H1→H2→H3 hierarchy is strongly associated with cited pages.", SRC.geo));
  else f.push(finding("headings", "Heading structure needs work", "warn", `${rawPage.headings.h1} H1 tags (want exactly 1), ${rawPage.headings.h2} H2 — in the raw HTML.`, "Cited pages overwhelmingly use one H1 and a clean hierarchy.", SRC.geo));

  if (rawPage.hasJsonLd) f.push(finding("schema", "Structured data present", "pass", `JSON-LD types: ${rawPage.jsonLdTypes.join(", ") || "unspecified"}.`, "Schema helps engines verify what your page is and who's behind it.", SRC.geo));
  else f.push(finding("schema", "No structured data", "warn", "No JSON-LD in the raw HTML.", "Schema isn't required, but it helps engines trust and attribute content.", SRC.geo));

  if (llms.present) {
    f.push(finding("llms", "llms.txt is present", "info", `Found at /llms.txt${llms.looksValid ? " (well-formed)" : " (check structure)"}.`,
      "Worth noting: a 300k-domain study found NO link between having llms.txt and AI citations — Google says skip it. Hygiene, not a ranking lever.", SRC.seranking));
  } else {
    f.push(finding("llms", "No llms.txt (that's fine)", "info", "Not found — and that's okay.",
      "Research shows llms.txt doesn't drive AI citations. Skipping it costs you nothing; focus on the checks above.", SRC.seranking));
  }

  applyHonestyFixes(f);
  return f;
}

function metaRobotsFinding(signals) {
  const records = signals && signals.records || [];
  const cited = records.length ? records.map((r) => `${r.source === "header" ? "X-Robots-Tag" : r.name}: ${truncate(r.content, 70)}`).slice(0, 4).join("; ") : "No robots meta tag or X-Robots-Tag header found.";

  if (signals && signals.hasNoindex) {
    return finding("meta-robots", "Page asks not to be indexed", "fail",
      cited,
      "A noindex directive asks search engines not to include this page; AI answers that rely on search may leave it out too. Deliberate?", SRC.robotMeta);
  }
  if (signals && signals.hasNoai) {
    return finding("meta-robots", "AI opt-out meta signal found", "info",
      cited,
      "noai/noimageai is not an official robots standard, but some systems treat it as a preference signal.", SRC.robotMeta);
  }
  return finding("meta-robots", "No noindex signal found", "pass",
    cited,
    "Nothing in the raw HTML or response header asks search systems to leave this page out.", SRC.robotMeta);
}

function contentSignalsFinding(signals) {
  if (signals && signals.length) {
    const detail = signals.map((s) => `Content-Signal: ${truncate(s.raw, 90)}`).slice(0, 4).join("; ");
    return finding("content-signals", "Content-Signal policy declared", "info",
      detail,
      "Content Signals are a voluntary robots.txt policy for search and AI-training preferences; they state intent but do not guarantee enforcement.", SRC.contentSignals);
  }
  return finding("content-signals", "No Content-Signal policy declared", "info",
    "robots.txt has no Content-Signal lines.",
    "Content Signals are a newer voluntary way to state search and AI-training preferences. Absence is normal.", SRC.contentSignals);
}

function applyHonestyFixes(findings) {
  for (const item of findings) {
    if (item.id === "title") {
      item.why = "A clear title helps models label and summarize this page.";
      item.source = SRC.googleTitle;
    } else if (item.id === "meta") {
      item.why = "A short description helps search systems and models summarize this page without guessing.";
      item.source = SRC.googleMeta;
    } else if (item.id === "headings") {
      item.why = item.status === "pass"
        ? "Industry study, not peer-reviewed: pages cited by ChatGPT often use a strict H1 to H2 to H3 hierarchy."
        : "Industry study, not peer-reviewed: pages cited by ChatGPT often use one H1 and a clean hierarchy.";
      item.source = SRC.foundation;
    } else if (item.id === "schema") {
      item.why = "Structured data helps eligible systems understand what this page is about; it is helpful context, not a citation guarantee.";
      item.source = SRC.googleSchema;
    }
  }
}

function contentFinding(rawPage, renderedPage, botAccess) {
  const nonJs = botAccess.filter((b) => !b.rendersJS).map((b) => b.token);
  const raw = rawPage.visibleTextChars;

  if (renderedPage) {
    // Definitive: we have both raw and rendered.
    const ren = renderedPage.visibleTextChars;
    const share = ren > 0 ? raw / ren : 1;
    const clientPct = Math.max(0, Math.round((1 - share) * 100));
    const headingsOnlyAfterJs = rawPage.headings.h1 + rawPage.headings.h2 === 0 && renderedPage.headings.h1 + renderedPage.headings.h2 > 0;

    if (share >= 0.8) {
      return finding("content", "Content is in the raw HTML (render-verified)", "pass",
        `A browser renders ~${ren} chars; the raw HTML already has ~${raw}. Non-JS crawlers get essentially everything.`,
        "Confirmed by rendering the page and comparing — not a guess.", SRC.vercel);
    }
    if (share >= 0.5) {
      return finding("content", "Some content is client-rendered", "warn",
        `~${clientPct}% of your content appears only after JavaScript (browser ~${ren} chars vs raw ~${raw}).${headingsOnlyAfterJs ? " Your headings exist only after JS." : ""}`,
        `Non-JS crawlers (${nonJs.join(", ")}) miss that portion; Gemini & Applebot render and see it.`, SRC.vercel);
    }
    return finding("content", "Most content is client-rendered", "fail",
      `Only ~${100 - clientPct}% of your content is in the raw HTML — a browser sees ~${ren} chars, non-JS crawlers see ~${raw}.${headingsOnlyAfterJs ? " Even your headings only appear after JS." : ""}`,
      `${nonJs.join(", ")} get mostly navigation/boilerplate and miss the real page. Gemini & Applebot render and see it.`, SRC.vercel);
  }

  // Fallback: heuristic (no render available).
  if (rawPage.looksLikeJsShell) {
    return finding("content", "Main content likely needs JavaScript", "warn",
      `Heuristic: only ~${raw} chars of text in the raw HTML${rawPage.frameworkHint ? ` (${rawPage.frameworkHint} app)` : ""}, with a heavy script payload. Looks client-rendered.`,
      `Most AI crawlers (${nonJs.join(", ")}) don't run JS, so they'd likely get little. Add a Cloudflare Browser Rendering token to measure this exactly.`, SRC.vercel);
  }
  return finding("content", "Content is in the raw HTML", "pass",
    `~${raw} chars of text present without running JavaScript.`,
    "Non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) can read it as-is. (Heuristic — enable render-diff for an exact measure.)", SRC.vercel);
}

function finding(id, label, status, detail, why, source) {
  return { id, label, status, detail, why, source };
}

function robotsAllowSnippet(disallowed) {
  return disallowed.map((b) => `User-agent: ${b.token}\nAllow: /`).join("\n\n");
}

function metaDescriptionDraft(rawPage) {
  const text = String(rawPage && rawPage.firstParagraph || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const clean = text.replace(/[<>"]/g, "");
  if (clean.length <= 155) return clean;
  const head = clean.slice(0, 156);
  const boundary = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf("; "), head.lastIndexOf(", "), head.lastIndexOf(" "));
  const cut = boundary > 80 ? head.slice(0, boundary) : head.slice(0, 152);
  return cut.replace(/[.,;:!?-]+$/, "").trim() + "...";
}

function escapeAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function json(obj, status = 200, extraHeaders = {}) {
  const cache = status >= 400 || (obj && obj.ok === false) ? "no-store" : "public, max-age=300";
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "Access-Control-Allow-Origin": "*", ...extraHeaders },
  });
}
