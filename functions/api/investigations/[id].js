import { getInvestigationDossierResponse } from "../../lib/investigation/investigation-handlers.mjs";

export function onRequest(context) {
  return getInvestigationDossierResponse(context);
}
