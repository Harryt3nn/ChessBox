/* apps/desktop/src/storage/MainStorage.ts */

import fs from "fs";
import path from "path";
import { app, safeStorage } from "electron";
import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import type { Node } from "../types/Node";
import { isSafeId, sanitiseNode } from "../importsAndExports/sanitiseImport";

/* -------------------------------------------------------
   PATHS
------------------------------------------------------- */

const DATA_DIR = path.join(app.getPath("userData"), "ChessBox-data");

const FOLDERS_PATH = path.join(DATA_DIR, "folders.json");
const REPS_DIR = path.join(DATA_DIR, "repertoires");
const NODES_PATH = path.join(DATA_DIR, "nodes.json");
const AUTH_TOKEN_PATH = path.join(DATA_DIR, "auth.token");

// New game directories
const GAMES_DIR = path.join(DATA_DIR, "games");
const LICHESS_DIR = path.join(GAMES_DIR, "lichess");
const CHESSCOM_DIR = path.join(GAMES_DIR, "chesscom");

/* -------------------------------------------------------
   DIRECTORY INITIALIZATION
------------------------------------------------------- */

export function ensureDirs() {
  // Base data directory
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Repertoires
  if (!fs.existsSync(REPS_DIR)) fs.mkdirSync(REPS_DIR, { recursive: true });

  // Folders.json
  if (!fs.existsSync(FOLDERS_PATH)) {
    fs.writeFileSync(FOLDERS_PATH, JSON.stringify({ folders: [] }, null, 2));
  }

  // Nodes.json
  if (!fs.existsSync(NODES_PATH)) {
    fs.writeFileSync(NODES_PATH, JSON.stringify({}, null, 2));
  }

  // Game directories
  if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR, { recursive: true });
  if (!fs.existsSync(LICHESS_DIR)) fs.mkdirSync(LICHESS_DIR, { recursive: true });
  if (!fs.existsSync(CHESSCOM_DIR)) fs.mkdirSync(CHESSCOM_DIR, { recursive: true });
}

/* -------------------------------------------------------
   CORRUPT FILE HANDLING
------------------------------------------------------- */

// a file that can't be parsed is renamed aside rather than overwritten,
// so one bad file can't crash the app or silently lose the user's data
async function quarantine(filePath: string, err: unknown) {
  const aside = `${filePath}.corrupt-${Date.now()}`;
  console.error(`Could not read ${filePath}, moved it to ${aside}:`, err);
  try {
    await fs.promises.rename(filePath, aside);
  } catch {
    // if it can't be moved, leaving it in place is still better than crashing
  }
}

export async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.promises.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    await quarantine(filePath, err);
    return undefined;
  }
}

/** repertoire ids become file names, so only [A-Za-z0-9_-] ids are ever written */
function repertoirePath(id: unknown): string | null {
  if (!isSafeId(id)) return null;
  const filePath = path.join(REPS_DIR, `${id}.json`);
  // belt and braces: the resolved path must still be inside the repertoires folder
  return path.dirname(path.resolve(filePath)) === path.resolve(REPS_DIR) ? filePath : null;
}

/* -------------------------------------------------------
   AUTH TOKEN
------------------------------------------------------- */

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
    // ignore if missing
  }
}

/* -------------------------------------------------------
   FOLDERS
------------------------------------------------------- */

export async function loadFolders(): Promise<Folder[]> {
  ensureDirs();
  const data = await readJson(FOLDERS_PATH);
  const folders = (data as { folders?: unknown } | undefined)?.folders;
  return Array.isArray(folders) ? folders : [];
}

export async function saveFolders(folders: Folder[]): Promise<void> {
  ensureDirs();
  await fs.promises.writeFile(
    FOLDERS_PATH,
    JSON.stringify({ folders }, null, 2),
    "utf8"
  );
}

/* -------------------------------------------------------
   REPERTOIRES
------------------------------------------------------- */

export async function loadRepertoires(): Promise<Repertoire[]> {
  ensureDirs();
  const files = await fs.promises.readdir(REPS_DIR);
  const reps: Repertoire[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const rep = await readJson(path.join(REPS_DIR, file));
    if (rep && typeof rep === "object" && !Array.isArray(rep)) reps.push(rep as Repertoire);
  }

  return reps;
}

export async function saveRepertoires(repertoires: Repertoire[]): Promise<void> {
  ensureDirs();
  for (const rep of repertoires) {
    const filePath = repertoirePath(rep.id);
    if (!filePath) {
      console.warn("Skipping repertoire with missing or unsafe id", rep.id);
      continue;
    }
    await fs.promises.writeFile(filePath, JSON.stringify(rep, null, 2), "utf8");
  }
}

/* -------------------------------------------------------
   NODES
------------------------------------------------------- */

export async function loadNodes(): Promise<Record<string, Node>> {
  ensureDirs();
  try {
    const data = await readJson(NODES_PATH);
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, Node>) : {};
  } catch {
    return {};
  }
}

/**
 * writes changed and new nodes (from the board's "save to repertoire"), keeping all others.
 * The patch comes from the renderer, so each node is sanitised and must sit under its own id.
 */
export async function saveNodePatch(patch: unknown, remove: unknown = []): Promise<void> {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Invalid node update");

  const clean: Record<string, Node> = {};
  for (const [key, raw] of Object.entries(patch)) {
    const node = raw && typeof raw === "object" && !Array.isArray(raw) ? sanitiseNode(raw as Record<string, unknown>) : null;
    if (node && node.id === key) clean[key] = node;
  }

  const nodes = await loadNodes();
  for (const id of Array.isArray(remove) ? remove : []) {
    if (isSafeId(id)) delete nodes[id];
  }
  for (const [id, node] of Object.entries(clean)) {
    // defineProperty, so an id like "__proto__" is stored as data, never as the object's prototype
    Object.defineProperty(nodes, id, { value: node, enumerable: true, writable: true, configurable: true });
  }
  await saveNodes(nodes);
}

/** removes a repertoire with its nodes and its novelty-finder results */
export async function deleteRepertoire(id: unknown): Promise<void> {
  const file = repertoirePath(id);
  if (!file) throw new Error("Invalid repertoire id");

  const nodes = await loadNodes();
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (node.repertoireId === id) delete nodes[nodeId];
  }
  await saveNodes(nodes);
  await fs.promises.rm(file, { force: true });
  await fs.promises.rm(path.join(DATA_DIR, "novelty", `${id}.json`), { force: true });
}

export async function saveNodes(nodes: Record<string, Node>): Promise<void> {
  ensureDirs();
  await fs.promises.writeFile(
    NODES_PATH,
    JSON.stringify(nodes, null, 2),
    "utf8"
  );
}

/* -------------------------------------------------------
   EXPORT PATH CONSTANTS
------------------------------------------------------- */

export {
  DATA_DIR,
  FOLDERS_PATH,
  REPS_DIR,
  NODES_PATH,
  AUTH_TOKEN_PATH,
  GAMES_DIR,
  LICHESS_DIR,
  CHESSCOM_DIR
};
