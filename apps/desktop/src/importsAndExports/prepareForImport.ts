/*apps/desktop/src/importsAndExports/prepareForImports*/

import { sanitiseImport, type SanitisedImport } from "./sanitiseImport";

// takes poorly arranged chess graph JSON data and converts it into CTTs filesystem template
// all types defined in a way that objects in CTT and chess graph are compatible
// the sanitiser does the actual work (field names, types, ids, graph repair) -- see sanitiseImport.ts
// throws ImportError if the file has nothing usable in it

export type PreparedImportData = SanitisedImport;

export function prepareForImport(data: unknown): PreparedImportData {
  const prepared = sanitiseImport(data);

  // imported folders always start expanded
  prepared.folders = prepared.folders.map(f => ({ ...f, collapsed: false }));

  return prepared;
}
