import { getInvestigationDossierPageResponse } from "../lib/investigation/investigation-handlers.mjs";

export function onRequestGet(context) {
  return getInvestigationDossierPageResponse(context);
}
