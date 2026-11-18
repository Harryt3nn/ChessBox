/*apps/desktop/src/Storage/NoveltyRunner.ts*/

import fs from "fs";
import path from "path";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { DATA_DIR, GAMES_DIR, loadNodes, loadRepertoires, readJson } from "./MainStorage";
import { isSafeId } from "../importsAndExports/sanitiseImport";
import { walkGame } from "../novelty/walk";
import { buildResults, gameInfo, type GameRecord, type NoveltyFile } from "../novelty/results";

// runs the novelty finder in the main process, where the games live (D4): walks imported games
// against one repertoire and writes ChessBox-data/novelty/<repertoireId>.json (D18)

const NOVELTY_DIR = path.join(DATA_DIR, "novelty");
const SITES = ["lichess", "chesscom"];
// let the main process handle other events between batches, so the window never freezes
const BATCH = 25;

export interface RunSummary {
  walked: number;
  deviations: number;
  novelties: number;
  inPrep: number; // games that never left the repertoire
}

interface GameFile {
  key: string; // "<site>:<gameId>"
  file: string;
  username: string; // the folder it was imported into: the account it belongs to
}

function noveltyPath(repertoireId: string): string {
  if (!isSafeId(repertoireId)) throw new Error("Invalid repertoire id");
  return path.join(NOVELTY_DIR, `${repertoireId}.json`);
}

export async function loadNovelty(repertoireId: string): Promise<NoveltyFile | null> {
  const file = noveltyPath(repertoireId);
  if (!fs.existsSync(file)) return null;
  const data = await readJson(file);
  return data && typeof data === "object" ? (data as NoveltyFile) : null;
}

async function listGames(): Promise<GameFile[]> {
  const out: GameFile[] = [];
  for (const site of SITES) {
    const siteDir = path.join(GAMES_DIR, site);
    if (!fs.existsSync(siteDir)) continue;
    for (const username of await fs.promises.readdir(siteDir)) {
      const dir = path.join(siteDir, username);
      if (!(await fs.promises.stat(dir)).isDirectory()) continue;
      for (const name of await fs.promises.readdir(dir)) {
        if (name.endsWith(".pgn")) out.push({ key: `${site}:${name.slice(0, -4)}`, file: path.join(dir, name), username });
      }
    }
  }
  return out;
}

/** the tag pairs at the top of a PGN, without parsing the moves */
function readTags(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const m of pgn.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) tags[m[1]] = m[2];
  return tags;
}

export async function runNovelty(
  repertoireId: string,
  mode: "latest" | "all",
  onProgress?: (done: number, total: number) => void,
): Promise<RunSummary> {
  const target = noveltyPath(repertoireId);
  const repertoire = (await loadRepertoires()).find(r => r.id === repertoireId);
  if (!repertoire) throw new Error("That repertoire doesn't exist any more.");
  const nodes = await loadNodes();

  // only games where the account owner played the repertoire's colour
  const candidates: (GameFile & { text: string; tags: Record<string, string> })[] = [];
  for (const game of await listGames()) {
    const text = await fs.promises.readFile(game.file, "utf8");
    const tags = readTags(text);
    const user = game.username.toLowerCase();
    const side = tags.White?.toLowerCase() === user ? "white" : tags.Black?.toLowerCase() === user ? "black" : null;
    if (side === repertoire.side) candidates.push({ ...game, text, tags });
  }

  const chosen = mode === "all"
    ? candidates
    : candidates.sort((a, b) => gameInfo(b.tags).playedAt - gameInfo(a.tags).playedAt).slice(0, 1);

  const previous = await loadNovelty(repertoireId);
  const games: Record<string, GameRecord> = mode === "all" ? {} : { ...(previous?.games ?? {}) };
  const summary: RunSummary = { walked: 0, deviations: 0, novelties: 0, inPrep: 0 };

  for (let i = 0; i < chosen.length; i++) {
    const game = chosen[i];
    const chess = new Chess();
    try {
      chess.loadPgn(game.text);
    } catch {
      continue; // a game chess.js can't read is skipped, not fatal
    }
    const result = walkGame(game.tags.FEN ?? DEFAULT_POSITION, chess.history(), repertoire.rootNodeId, nodes, repertoire.side);
    games[game.key] = {
      ...gameInfo(game.tags),
      matched: result.matched.map(m => m.nodeId),
      // the surprise always comes straight after the last matched move, so these lead to its position
      line: result.matched.map(m => m.san),
      outcome: result.outcome,
    };

    summary.walked++;
    if (result.outcome.kind === "deviation") summary.deviations++;
    else if (result.outcome.kind === "novelty") summary.novelties++;
    else if (result.outcome.kind === "complete") summary.inPrep++;

    if ((i + 1) % BATCH === 0) {
      onProgress?.(i + 1, chosen.length);
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  onProgress?.(chosen.length, chosen.length);

  const file: NoveltyFile = {
    repertoireId,
    updatedAt: Date.now(),
    games,
    ...buildResults(games, previous?.findings ?? {}),
  };
  await fs.promises.mkdir(NOVELTY_DIR, { recursive: true });
  await fs.promises.writeFile(target, JSON.stringify(file), "utf8");
  return summary;
}
