import { getStoredReportResponse } from "../../lib/report-handlers.mjs";

export function onRequest(context) {
  return getStoredReportResponse(context);
}
