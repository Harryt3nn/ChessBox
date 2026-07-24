/*apps/desktop/src/storage/MainStorage.ts*/


import fs from "fs";
import path from "path";
import { app, safeStorage } from "electron";
import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import type { Node } from "../types/Node";


const DATA_DIR = path.join(app.getPath("userData"), "ctt-data");
const FOLDERS_PATH = path.join(DATA_DIR, "folders.json");
const REPS_DIR = path.join(DATA_DIR, "repositories");
const NODES_PATH = path.join(DATA_DIR, "nodes.json");
const AUTH_TOKEN_PATH = path.join(DATA_DIR, "auth.token");

// Api

export async function saveAuthToken(token: string): Promise<void> {
  ensureDirs();
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS-level encryption is not available on this machine");
  }
  const encrypted = safeStorage.encryptString(token);
  await fs.promises.writeFile(AUTH_TOKEN_PATH, encrypted);
}

export async function loadAuthToken(): Promise<string | null> {
  ensureDirs();
  try {
    const encrypted = await fs.promises.readFile(AUTH_TOKEN_PATH);
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export async function clearAuthToken(): Promise<void> {
  ensureDirs();
  try {
    await fs.promises.unlink(AUTH_TOKEN_PATH);
  } catch {
    // no-op if it never existed
  }
}


// Filesystem


function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REPS_DIR)) fs.mkdirSync(REPS_DIR, { recursive: true });
  if (!fs.existsSync(FOLDERS_PATH)) {
    fs.writeFileSync(FOLDERS_PATH, JSON.stringify({ folders: [] }, null, 2));
  }
  if (!fs.existsSync(NODES_PATH)) {
    fs.writeFileSync(NODES_PATH, JSON.stringify({}, null, 2));
  }
}

export async function loadFolders(): Promise<Folder[]> {
  ensureDirs();
  const raw = await fs.promises.readFile(FOLDERS_PATH, "utf8");
  return JSON.parse(raw).folders ?? [];
}

export async function saveFolders(folders: Folder[]): Promise<void> {
  ensureDirs();
  await fs.promises.writeFile(
    FOLDERS_PATH,
    JSON.stringify({ folders }, null, 2),
    "utf8"
  );
}

export async function loadRepertoires(): Promise<Repertoire[]> {
  ensureDirs();
  const files = await fs.promises.readdir(REPS_DIR);
  const reps: Repertoire[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.promises.readFile(path.join(REPS_DIR, file), "utf8");
    reps.push(JSON.parse(raw));
  }

  return reps;
}

export async function saveRepertoires(repertoires: Repertoire[]): Promise<void> {
  ensureDirs();
  for (const rep of repertoires) {
    if (!rep.id) {
      console.warn("Skipping repertoire with missing id", rep);
      continue;
    }
    const filePath = path.join(REPS_DIR, `${rep.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(rep, null, 2), "utf8");
  }
}

export async function loadNodes(): Promise<Record<string, Node>> {
  ensureDirs();
  try {
    const raw = await fs.promises.readFile(NODES_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveNodes(nodes: Record<string, Node>): Promise<void> {
  ensureDirs();
  await fs.promises.writeFile(
    NODES_PATH,
    JSON.stringify(nodes, null, 2),
    "utf8"
  );
}
