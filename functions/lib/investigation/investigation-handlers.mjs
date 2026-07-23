import { buildKamranSyntheticDemo } from "./kamran-synthetic-demo.mjs";
import { DOSSIER_PAGE_HTML } from "./dossier-page.mjs";

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
  return new Response(DOSSIER_PAGE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...PRIVATE_HEADERS,
    },
  });
}
