import { getStableReportPageResponse } from "../lib/report-handlers.mjs";

export function onRequest(context) {
  return getStableReportPageResponse(context);
}
