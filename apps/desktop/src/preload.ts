/*apps/desktop/src/preload.ts*/

import { contextBridge, ipcRenderer, } from "electron";
import type { Folder } from "./types/Folder";
import type { Repertoire } from "./types/Repertoire";
import type { Node } from "./types/Node";
import type { NoveltyFile } from "./novelty/results";
import type { FindingUpdate, RunSummary } from "./Storage/NoveltyRunner";
import type { WeakPointsQueue } from "./Storage/WeakPoints";
import { ImportRepertoiresPayload } from "./types/ImportPayload";

// the only place where the renderer can communicate with main processes
// renderer cannot access Node.js APIs directly
// ensures type safety (this is why we don't use Javascript)


contextBridge.exposeInMainWorld("storage", {
  loadFolders: (): Promise<Folder[]> =>
    ipcRenderer.invoke("storage:loadFolders"),

  saveFolders: (folders: Folder[]): Promise<void> =>
    ipcRenderer.invoke("storage:saveFolders", folders),

  loadRepertoires: (): Promise<Repertoire[]> =>
    ipcRenderer.invoke("storage:loadRepertoires"),

  saveRepertoire: (rep: Repertoire): Promise<void> =>
    ipcRenderer.invoke("storage:saveRepertoire", rep),

  loadNodes: (): Promise<Record<string, Node>> =>
    ipcRenderer.invoke("storage:loadNodes"),

  saveNodes: (patch: Record<string, Node>, remove: string[] = []): Promise<void> =>
    ipcRenderer.invoke("storage:saveNodes", patch, remove),

  deleteRepertoire: (id: string): Promise<void> =>
    ipcRenderer.invoke("storage:deleteRepertoire", id),

  openFileDialog: (options: Electron.OpenDialogOptions): Promise<string[]> =>
    ipcRenderer.invoke("storage:openFileDialog", options),

  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("storage:readFile", filePath),

  importRepertoires: (payload: ImportRepertoiresPayload) =>
    ipcRenderer.invoke("storage:importRepertoires", payload),

  saveAuthToken: (token: string): Promise<void> =>
    ipcRenderer.invoke("storage:saveAuthToken", token),

  loadAuthToken: (): Promise<string | null> =>
    ipcRenderer.invoke("storage:loadAuthToken"),

  clearAuthToken: (): Promise<void> =>
    ipcRenderer.invoke("storage:clearAuthToken")
});

contextBridge.exposeInMainWorld("api", {
  importLichess: (username: string) =>
    ipcRenderer.invoke("import-lichess", username),
  importChesscom: (username: string) =>
    ipcRenderer.invoke("import-chesscom", username),

  runNovelty: (repertoireId: string, mode: "latest" | "all", accounts: string[]): Promise<RunSummary> =>
    ipcRenderer.invoke("novelty:run", repertoireId, mode, accounts),

  listAccounts: (): Promise<string[]> =>
    ipcRenderer.invoke("novelty:accounts"),

  loadNovelty: (repertoireId: string): Promise<NoveltyFile | null> =>
    ipcRenderer.invoke("novelty:load", repertoireId),

  updateFinding: (repertoireId: string, key: string, update: FindingUpdate): Promise<void> =>
    ipcRenderer.invoke("novelty:update", repertoireId, key, update),

  weakpointsQueue: (repertoireId: string): Promise<WeakPointsQueue> =>
    ipcRenderer.invoke("weakpoints:queue", repertoireId),

  // returns when the card is next due (ms since epoch)
  weakpointsGrade: (repertoireId: string, nodeId: string, correct: boolean, played: string): Promise<number> =>
    ipcRenderer.invoke("weakpoints:grade", repertoireId, nodeId, correct, played),

  // returns a function that stops listening
  onNoveltyProgress: (listener: (done: number, total: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, done: number, total: number) => listener(done, total);
    ipcRenderer.on("novelty:progress", handler);
    return () => ipcRenderer.removeListener("novelty:progress", handler);
  }
});

