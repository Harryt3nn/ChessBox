/*apps/desktop/src/types/global.d.ts*/


import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";
import type { ImportRepertoiresPayload } from "./ImportPayload";

export {};

declare global {
  interface Window {
    storage: {
      loadFolders(): Promise<any[]>;
      saveFolders(folders: any[]): Promise<void>;
      loadRepertoires(): Promise<any[]>;
      saveRepertoire(rep: any): Promise<void>;
      openFileDialog(options: Electron.OpenDialogOptions): Promise<string[]>;
      readFile(filePath: string): Promise<string>;
      importRepertoires(payload: ImportRepertoiresPayload): Promise<{ success: boolean }>;
      saveAuthToken(token: string): Promise<void>;
      loadAuthToken(): Promise<string | null>;
      clearAuthToken(): Promise<void>;
    };
  }
}