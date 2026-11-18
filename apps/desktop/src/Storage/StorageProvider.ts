/*apps/desktop/src/storage/StorageProvider.ts*/

import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import type { Node } from "../types/Node";
export interface StorageProvider {
  loadFolders(): Promise<Folder[]>;
  saveFolders(folders: Folder[]): Promise<void>;

  loadRepertoires(): Promise<Repertoire[]>;
  saveRepertoire(rep: Repertoire): Promise<void>;

  loadNodes(): Promise<Record<string, Node>>;
  saveNodes(patch: Record<string, Node>, remove?: string[]): Promise<void>;
  deleteRepertoire(id: string): Promise<void>;
}
