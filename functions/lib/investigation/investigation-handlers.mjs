import { buildKamranSyntheticDemo } from "./kamran-synthetic-demo.mjs";

const PRIVATE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
});

const enabled = (context) => context?.env?.INVESTIGATION_DEMO_ENABLED === "true";
const known = (context) => enabled(context) && context?.params?.id === "kamran-synthetic";
const isGet = (context) => context?.request?.method === "GET";

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    ...PRIVATE_HEADERS,
  },
});

const text = (body, status) => new Response(body, {
  status,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    ...PRIVATE_HEADERS,
  },
});

export async function getInvestigationDossierResponse(context) {
  if (!isGet(context) || !known(context)) {
    return json({ ok: false, error: "Investigation not found." }, 404);
  }

  return json({ ok: true, dossier: buildKamranSyntheticDemo().dossier }, 200);
}

export async function getInvestigationDossierPageResponse(context) {
  if (!isGet(context) || !known(context)) return text("Investigation not found.", 404);
  if (!context?.env?.ASSETS || typeof context.env.ASSETS.fetch !== "function") {
    return text("Investigation page is temporarily unavailable.", 500);
  }

  const assetUrl = new URL("/investigation-dossier", context.request.url);
  let upstream;
  try {
    upstream = await context.env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  } catch {
    return text("Investigation page is temporarily unavailable.", 500);
  }
  const headers = new Headers(upstream.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
