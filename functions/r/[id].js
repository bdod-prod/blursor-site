import { getStableReportPageResponse } from "../lib/report-handlers.mjs";

export function onRequestGet(context) {
  return getStableReportPageResponse(context);
}
