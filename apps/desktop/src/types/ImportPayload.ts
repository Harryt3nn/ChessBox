/*apps/desktop/src/types/ImportPayload.ts*/


import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";
import type { Node } from "./Node";

// defines data shape for importing chess graph repertoires

export type ImportRepertoiresPayload = {
  folders: Folder[];
  repertoires: Repertoire[];
  nodes: Record<string, Node>;
};