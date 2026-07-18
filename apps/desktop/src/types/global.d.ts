/*apps/desktop/src/types/global.d.ts*/


import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";

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
    };
  }
}

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}