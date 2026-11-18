/*apps/desktop/src/storage/FileSystemStorageProvider.ts*/

import type { StorageProvider } from "./StorageProvider";
import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import type { Node } from "../types/Node";
export class FileSystemStorageProvider implements StorageProvider {
  
  async loadFolders(): Promise<Folder[]> {
    return await window.storage.loadFolders();
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    await window.storage.saveFolders(folders);
  }

  async loadRepertoires(): Promise<Repertoire[]> {
    return await window.storage.loadRepertoires();
  }

  async saveRepertoire(rep: Repertoire): Promise<void> {
    await window.storage.saveRepertoire(rep);
  }

  async loadNodes(): Promise<Record<string, Node>> {
    return await window.storage.loadNodes();
  }

  async saveNodes(patch: Record<string, Node>): Promise<void> {
    await window.storage.saveNodes(patch);
  }
}
