/*apps/desktop/src/types/global.d.ts*/


import type { Folder } from "./Folder";
import type { Repertoire } from "./Repertoire";
import type { Node } from "./Node";
import type { NoveltyFile } from "../novelty/results";
import type { FindingUpdate, RunSummary } from "../Storage/NoveltyRunner";
import type { WeakPointsQueue } from "../Storage/WeakPoints";
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
      saveNodes(patch: Record<string, Node>, remove?: string[]): Promise<void>;
      deleteRepertoire(id: string): Promise<void>;
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
      runNovelty(repertoireId: string, mode: "latest" | "all", accounts: string[]): Promise<RunSummary>;
      listAccounts(): Promise<string[]>;
      loadNovelty(repertoireId: string): Promise<NoveltyFile | null>;
      updateFinding(repertoireId: string, key: string, update: FindingUpdate): Promise<void>;
      onNoveltyProgress(listener: (done: number, total: number) => void): () => void;
      weakpointsQueue(repertoireId: string, mode: "focused" | "mistakes", branchId: string | null): Promise<WeakPointsQueue>;
      weakpointsGrade(repertoireId: string, nodeId: string, correct: boolean, played: string): Promise<number>;
    };
  }
}