/*apps/desktop/src/index.ts*/

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import fs from "fs";
import path from "path";
import { IMPORT_LIMITS, sanitiseFolders, sanitiseRepertoire } from "./importsAndExports/sanitiseImport";
import { importRepertoires } from "./Storage/ImportService";
import { importChesscom } from "./Storage/ChesscomImporter";
import { importLichess } from "./Storage/LichessImporter";
import { loadNovelty, runNovelty } from "./Storage/NoveltyRunner";
import {
  loadFolders,
  saveFolders,
  loadRepertoires,
  saveRepertoires,
  loadNodes,
  saveNodePatch,
  saveAuthToken,
  loadAuthToken,
  clearAuthToken
} from "./Storage/MainStorage";



// main electron process
// creates application window, handles IPC requests from renderer, manages filesystem
// 'backend' of the app

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;


// all IPC functions — delegate to storage/MainStorage.ts rather than duplicating logic here

ipcMain.handle("storage:loadFolders", () => loadFolders());

// renderer input is never written to disk as-is
ipcMain.handle("storage:saveFolders", (_event, folders: unknown) => saveFolders(sanitiseFolders(folders)));

ipcMain.handle("storage:loadRepertoires", () => loadRepertoires());

ipcMain.handle("storage:loadNodes", () => loadNodes());

// renderer input is sanitised node by node inside saveNodePatch
ipcMain.handle("storage:saveNodes", (_event, patch: unknown) => saveNodePatch(patch));

ipcMain.handle("storage:saveRepertoire", (_event, rep: unknown) => {
  const clean = sanitiseRepertoire(rep);
  if (!clean) throw new Error("Invalid repertoire");
  return saveRepertoires([clean]);
});

// the renderer may only read files the user picked in an open dialog this session
const userPickedFiles = new Set<string>();

ipcMain.handle(
  "storage:openFileDialog",
  async (_event: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    result.filePaths.forEach(p => userPickedFiles.add(path.resolve(p)));
    return result.filePaths;
  }
);

ipcMain.handle(
  "storage:readFile",
  async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
    if (typeof filePath !== "string" || !userPickedFiles.has(path.resolve(filePath))) {
      throw new Error("That file wasn't chosen through the file picker.");
    }

    const { size } = await fs.promises.stat(filePath);
    if (size > IMPORT_LIMITS.maxFileBytes) {
      throw new Error(`That file is too large to import (limit ${IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB).`);
    }

    return fs.promises.readFile(filePath, "utf8");
  }
);

ipcMain.handle(
  "storage:importRepertoires",
  (_event, payload: unknown) => importRepertoires(payload)
);

ipcMain.handle("import-lichess", async (_event, username: string) => {
  try {
    const result = await importLichess(username);
    return result;
  } catch (err) {
    console.error("Lichess import failed:", err);

    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }

    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("import-chesscom", async (_event, username: string) => {
  try {
    const result = await importChesscom(username);
    return result;
  } catch (err) {
    console.error("Chess.com import failed:", err);

    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }

    return { ok: false, error: String(err) };
  }
});

// novelty finder: walks imported games against one repertoire; progress is pushed to the window as it goes
ipcMain.handle("novelty:run", (event, repertoireId: unknown, mode: unknown) => {
  if (typeof repertoireId !== "string" || (mode !== "latest" && mode !== "all")) throw new Error("Invalid novelty run");
  return runNovelty(repertoireId, mode, (done, total) => event.sender.send("novelty:progress", done, total));
});

ipcMain.handle("novelty:load", (_event, repertoireId: unknown) => {
  if (typeof repertoireId !== "string") throw new Error("Invalid repertoire id");
  return loadNovelty(repertoireId);
});

ipcMain.handle("storage:saveAuthToken", (_event, token: string) => saveAuthToken(token));

ipcMain.handle("storage:loadAuthToken", () => loadAuthToken());

ipcMain.handle("storage:clearAuthToken", () => clearAuthToken());


// creation of window

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 1300,
    width: 1300,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      // renderer has no Node access; it can only use the APIs preload.ts exposes
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// the app only ever shows its own page: block new windows and navigation away from it,
// so a malicious link in imported data (or anywhere else) can't load remote content with app privileges
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event, url) => {
    if (url !== contents.getURL()) event.preventDefault();
  });
  contents.on("will-attach-webview", event => event.preventDefault());
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});