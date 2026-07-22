import { isReportId, readReport } from "./report-store.mjs";

const PRIVATE_REPORT_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function getStoredReportResponse(context) {
  if (!isGet(context)) return json({ ok: false, error: "Report not found." }, 404);
  const id = context && context.params && context.params.id;
  const outcome = await readReport(id, context && context.env, {
    fetch: context && context.fetch,
    logger: context && context.logger,
  });

  if (outcome.status === "invalid" || outcome.status === "missing") {
    return json({ ok: false, error: "Report not found." }, 404);
  }
  if (outcome.status === "unconfigured") {
    return json({ ok: false, error: "Report storage is not configured." }, 503);
  }
  if (outcome.status !== "found") {
    return json({ ok: false, error: "Report storage is temporarily unavailable." }, 502);
  }

  const origin = new URL(context.request.url).origin;
  const result = outcome.row.result;
  return json({
    ...result,
    report: { id, url: new URL(`/r/${id}`, origin).href },
    capture: { status: "stored" },
  }, 200);
}

export async function getStableReportPageResponse(context) {
  if (!isGet(context)) return text("Report not found.", 404);
  const id = context && context.params && context.params.id;
  if (!isReportId(id)) return text("Report not found.", 404);
  if (!context.env || !context.env.ASSETS || typeof context.env.ASSETS.fetch !== "function") {
    return text("Report page is temporarily unavailable.", 500);
  }

  const assetUrl = new URL("/ai-crawler-checker", context.request.url);
  const upstream = await context.env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  const headers = new Headers(upstream.headers);
  for (const [name, value] of Object.entries(PRIVATE_REPORT_HEADERS)) headers.set(name, value);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function isGet(context) {
  return Boolean(context && context.request && context.request.method === "GET");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...PRIVATE_REPORT_HEADERS,
    },
  });
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...PRIVATE_REPORT_HEADERS,
    },
  });
}
