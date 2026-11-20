/*apps/desktop/src/Storage/WeakPoints.ts*/

import fs from "fs";
import path from "path";
import { DATA_DIR, loadNodes, loadRepertoires } from "./MainStorage";
import { loadNovelty } from "./NoveltyRunner";
import { isSafeId } from "../importsAndExports/sanitiseImport";
import { dueDrills, emptyFile, gradeCard, syncCards, type WeakPointsFile } from "../weakpoints/cards";
import { has, type Drill } from "../weakpoints/lines";

// WeakPoints in the main process (D32): the renderer asks for the queue and reports right / wrong;
// scheduling and the file (ChessBox-data/weakpoints/<repertoireId>.json, D22 + D30) stay here

const WEAKPOINTS_DIR = path.join(DATA_DIR, "weakpoints");

export interface WeakPointsQueue {
  drills: Drill[];
  cards: number; // every card, due or not
  recovered: boolean; // the file was unreadable, set aside and started fresh (D35)
  noNovelty: boolean; // the novelty finder hasn't run on this repertoire yet
}

function checkedId(repertoireId: unknown): string {
  if (!isSafeId(repertoireId)) throw new Error("Invalid repertoire id");
  return repertoireId;
}

const weakpointsPath = (repertoireId: string) => path.join(WEAKPOINTS_DIR, `${repertoireId}.json`);

const FSRS_NUMBERS = ["due", "stability", "difficulty", "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "state"];

function isValidFile(data: unknown, repertoireId: string): data is WeakPointsFile {
  if (!data || typeof data !== "object") return false;
  const file = data as WeakPointsFile;
  if (file.version !== 1 || file.repertoireId !== repertoireId || !file.cards || typeof file.cards !== "object") return false;
  return Object.values(file.cards).every(c =>
    c && ["deviation", "rare", "strong"].includes(c.source) && typeof c.answer === "string" && Number.isFinite(c.added)
    && c.fsrs && FSRS_NUMBERS.every(k => Number.isFinite((c.fsrs as unknown as Record<string, unknown>)[k]))
    && Array.isArray(c.log));
}

/** renames an unreadable file to <id>.corrupt-<time>.json (D35); if that fails it throws, so the fresh file never overwrites it */
async function setAside(repertoireId: string, reason: unknown): Promise<void> {
  const aside = path.join(WEAKPOINTS_DIR, `${repertoireId}.corrupt-${Date.now()}.json`);
  console.error(`Could not read the WeakPoints file for ${repertoireId}, moved it to ${aside}:`, reason);
  await fs.promises.rename(weakpointsPath(repertoireId), aside);
}

/** the file, or a fresh one; an unreadable file is set aside first, never overwritten (D35) */
async function loadFile(repertoireId: string, now: number): Promise<{ file: WeakPointsFile; recovered: boolean }> {
  const target = weakpointsPath(repertoireId);
  if (!fs.existsSync(target)) return { file: emptyFile(repertoireId, now), recovered: false };

  let data: unknown;
  try {
    data = JSON.parse(await fs.promises.readFile(target, "utf8"));
  } catch (err) {
    await setAside(repertoireId, err);
    return { file: emptyFile(repertoireId, now), recovered: true };
  }
  if (isValidFile(data, repertoireId)) return { file: data, recovered: false };
  await setAside(repertoireId, new Error("not a WeakPoints file"));
  return { file: emptyFile(repertoireId, now), recovered: true };
}

async function saveFile(file: WeakPointsFile): Promise<void> {
  await fs.promises.mkdir(WEAKPOINTS_DIR, { recursive: true });
  await fs.promises.writeFile(weakpointsPath(file.repertoireId), JSON.stringify(file), "utf8");
}

async function loadRepertoire(repertoireId: string) {
  const rep = (await loadRepertoires()).find(r => r.id === repertoireId);
  if (!rep) throw new Error("That repertoire doesn't exist any more.");
  return rep;
}

/** the due drills in Focused or Mistakes-only mode (D36), optionally under one branch (D40) */
export async function weakpointsQueue(repertoireId: unknown, mode: unknown, branchId: unknown): Promise<WeakPointsQueue> {
  const id = checkedId(repertoireId);
  if ((mode !== "focused" && mode !== "mistakes") || (branchId !== null && typeof branchId !== "string")) throw new Error("Invalid drill request");
  const rep = await loadRepertoire(id);
  const novelty = await loadNovelty(id);
  if (!novelty) return { drills: [], cards: 0, recovered: false, noNovelty: true };

  const now = Date.now();
  const nodes = await loadNodes();
  if (branchId !== null && !has(nodes, branchId)) throw new Error("That part of the repertoire doesn't exist any more.");
  const loaded = await loadFile(id, now);
  const file = syncCards(loaded.file, rep, nodes, novelty, now);
  await saveFile(file);
  return { drills: dueDrills(file, rep, nodes, now, { mode, branchId }), cards: Object.keys(file.cards).length, recovered: loaded.recovered, noNovelty: false };
}

/** grades one card; returns when it's next due (ms) */
// a SAN move: pieces, squares, captures, castling, promotion, check marks
const SAN = /^[A-Za-z0-9=+#-]{2,10}$/;

export async function weakpointsGrade(repertoireId: unknown, nodeId: unknown, correct: unknown, played: unknown): Promise<number> {
  const id = checkedId(repertoireId);
  if (typeof nodeId !== "string" || typeof correct !== "boolean" || typeof played !== "string" || !SAN.test(played)) throw new Error("Invalid grade");
  const now = Date.now();
  const { file } = await loadFile(id, now);
  const graded = gradeCard(file, nodeId, correct, played, now);
  await saveFile(graded);
  return graded.cards[nodeId].fsrs.due;
}
