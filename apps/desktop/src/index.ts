/*apps/desktop/src/index.ts*/

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import fs from "fs";
import path from "path";
import type { ImportRepertoiresPayload } from "./types/ImportPayload";
import { importRepertoires } from "./Storage/ImportService";
import {
  loadFolders,
  saveFolders,
  loadRepertoires,
  saveRepertoires,
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

ipcMain.handle("storage:saveFolders", (_event, folders) => saveFolders(folders));

ipcMain.handle("storage:loadRepertoires", () => loadRepertoires());

ipcMain.handle("storage:saveRepertoire", (_event, rep) => saveRepertoires([rep]));

ipcMain.handle(
  "storage:openFileDialog",
  async (_event: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    return result.filePaths;
  }
);

ipcMain.handle(
  "storage:readFile",
  (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
    return fs.promises.readFile(filePath, "utf8");
  }
);

ipcMain.handle(
  "storage:importRepertoires",
  (_event, payload: ImportRepertoiresPayload) => importRepertoires(payload)
);

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
      sandbox: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});