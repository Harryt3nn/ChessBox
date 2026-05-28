import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";

export {};

declare global {
  interface Window {
    storage: {
      loadFolders(): Promise<Folder[]>;
      saveFolders(folders: Folder[]): Promise<void>;
      loadRepertoires(): Promise<Repertoire[]>;
      saveRepertoire(rep: Repertoire): Promise<void>;
    };
  }
}