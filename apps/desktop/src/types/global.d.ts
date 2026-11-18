/*apps/desktop/src/types/global.d.ts*/


import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";
import type { Node } from "./Node";
import type { ImportResult } from "./ImportResults";
import type { ImportRepertoiresPayload } from "./ImportPayload";

export {};

declare global {
  interface Window {
    storage: {
      loadFolders(): Promise<Folder[]>;
      saveFolders(folders: Folder[]): Promise<void>;
      loadRepertoires(): Promise<Repertoire[]>;
      saveRepertoire(rep: Repertoire): Promise<void>;
      loadNodes(): Promise<Record<string, Node>>;
      openFileDialog(options: Electron.OpenDialogOptions): Promise<string[]>;
      readFile(filePath: string): Promise<string>;
      importRepertoires(payload: ImportRepertoiresPayload): Promise<{ success: boolean }>;
      saveAuthToken(token: string): Promise<void>;
      loadAuthToken(): Promise<string | null>;
      clearAuthToken(): Promise<void>;
    },
     api: {
      importLichess(username: string): Promise<ImportResult>;
      importChesscom(username: string): Promise<ImportResult>;
    };
  }
}