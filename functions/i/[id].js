import { getInvestigationDossierPageResponse } from "../lib/investigation/investigation-handlers.mjs";

export function onRequest(context) {
  return getInvestigationDossierPageResponse(context);
}
