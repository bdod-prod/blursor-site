import { getStoredReportResponse } from "../../lib/report-handlers.mjs";

export function onRequestGet(context) {
  return getStoredReportResponse(context);
}
