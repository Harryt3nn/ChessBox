import { contextBridge, ipcRenderer } from "electron";
import type { Folder } from "./types/Folder";
import type { Repertoire } from "./types/Repertoire";

contextBridge.exposeInMainWorld("storage", {
  loadFolders: (): Promise<Folder[]> =>
    ipcRenderer.invoke("storage:loadFolders"),

  saveFolders: (folders: Folder[]): Promise<void> =>
    ipcRenderer.invoke("storage:saveFolders", folders),

  loadRepertoires: (): Promise<Repertoire[]> =>
    ipcRenderer.invoke("storage:loadRepertoires"),

  saveRepertoire: (rep: Repertoire): Promise<void> =>
    ipcRenderer.invoke("storage:saveRepertoire", rep),
});
