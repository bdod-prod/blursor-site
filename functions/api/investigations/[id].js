import { getInvestigationDossierResponse } from "../../lib/investigation/investigation-handlers.mjs";

export function onRequestGet(context) {
  return getInvestigationDossierResponse(context);
}
