/*apps/desktop/src/types/ImportPayload.ts*/


import type { Repertoire } from "./Repertoire";
import type { Node } from "./Node";

// defines data shape for importing chess graph repertoires

export type ImportRepertoiresPayload = {
  repertoires: Repertoire[];
  nodes: Record<string, Node>;
};