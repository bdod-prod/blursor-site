import { buildReportRow } from "./report-model.mjs";

const TABLE_PATH = "/rest/v1/check_reports";
const REQUEST_TIMEOUT_MS = 8000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReportId(value) {
  return UUID_RE.test(String(value || ""));
}

export async function captureReport(result, env, options = {}) {
  if (!hasStorageEnvironment(env)) {
    return { report: null, capture: { status: "unconfigured" } };
  }

  const fetchImpl = options.fetch || globalThis.fetch;
  const logger = options.logger || console;
  try {
    const config = storageConfig(env);
    const row = await buildReportRow(result, "user");
    const endpoint = new URL(TABLE_PATH, config.url);
    endpoint.searchParams.set("select", "id");
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: storageHeaders(config.key, {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify(row),
      signal: timeoutSignal(),
    });
    if (!response || !response.ok) throw storageError("insert_http");

    const body = await response.json().catch(() => null);
    const id = body && Array.isArray(body) && body[0] && body[0].id;
    if (!isReportId(id)) throw storageError("insert_shape");

    const url = new URL(`/r/${id}`, options.origin || "https://blursor.ai").href;
    return {
      report: { id, url },
      capture: { status: "stored" },
    };
  } catch (error) {
    logStorageFailure(logger, "capture", error);
    return {
      report: null,
      capture: { status: "failed", code: "storage_error" },
    };
  }
}

export async function readReport(id, env, options = {}) {
  if (!isReportId(id)) return { status: "invalid" };
  if (!hasStorageEnvironment(env)) return { status: "unconfigured" };

  const fetchImpl = options.fetch || globalThis.fetch;
  const logger = options.logger || console;
  try {
    const config = storageConfig(env);
    const endpoint = new URL(TABLE_PATH, config.url);
    endpoint.searchParams.set("select", "id,result,checked_at");
    endpoint.searchParams.set("id", `eq.${id}`);
    endpoint.searchParams.set("limit", "1");
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: storageHeaders(config.key),
      signal: timeoutSignal(),
    });
    if (!response || !response.ok) throw storageError("read_http");

    const rows = await response.json().catch(() => null);
    if (!Array.isArray(rows)) throw storageError("read_shape");
    if (rows.length === 0) return { status: "missing" };
    const row = rows[0];
    if (!row || row.id !== id || !row.result || typeof row.result !== "object") {
      throw storageError("read_shape");
    }
    return { status: "found", row };
  } catch (error) {
    logStorageFailure(logger, "read", error);
    return { status: "failed" };
  }
}

function hasStorageEnvironment(env) {
  return Boolean(
    env &&
    typeof env.SUPABASE_URL === "string" && env.SUPABASE_URL.trim() &&
    typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" && env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  );
}

function storageConfig(env) {
  let url;
  try {
    url = new URL(env.SUPABASE_URL.trim());
  } catch {
    throw storageError("config_url");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw storageError("config_url");
  }
  return { url, key: env.SUPABASE_SERVICE_ROLE_KEY.trim() };
}

function storageHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...extra,
  };
}

function timeoutSignal() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;
}

function storageError(code) {
  const error = new Error("Report storage operation failed.");
  error.code = code;
  return error;
}

function logStorageFailure(logger, operation, error) {
  if (!logger || typeof logger.error !== "function") return;
  logger.error("BLURSOR_REPORT_STORAGE_FAILED", {
    operation,
    code: error && error.code ? error.code : "unexpected",
    name: error && error.name ? error.name : "Error",
  });
}
