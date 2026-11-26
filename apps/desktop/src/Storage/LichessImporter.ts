/*apps/desktop/src/Storage/LichessImporter.ts*/

import fs from "fs";
import path from "path";
import readline from "readline";
import { Readable } from "stream";
import { ensureDirs, LICHESS_DIR } from "./MainStorage";
import { isSafeId } from "../importsAndExports/sanitiseImport";

// a single game's PGN is a few KB; anything far larger isn't a real game
const MAX_PGN_BYTES = 200_000;
// D48 (TUNE): how long Lichess has to start answering, then how long the stream may go quiet.
// No total limit: a big account streams for minutes while healthy
const CONNECT_TIMEOUT_MS = 30_000;
const IDLE_TIMEOUT_MS = 60_000;

const games = (n: number) => `${n} game${n === 1 ? "" : "s"}`;

export interface LichessImportResult {
  ok: boolean;
  error?: string;
  gamesImported?: number;
}

export async function importLichess(username: string): Promise<LichessImportResult> {
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(username)) {
    return { ok: false, error: "Invalid username" };
  }

  ensureDirs();

  const userDir = path.join(LICHESS_DIR, username);
  fs.mkdirSync(userDir, { recursive: true });

  let gamesImported = 0;
  // saved games are complete files and a re-run skips them, so every failure says what was kept
  const keptNote = () => gamesImported > 0 ? `, after saving ${games(gamesImported)}; run it again to fetch the rest` : "";

  // one fetch per game type, returning an error message or null. A timeout aborts the fetch, which
  // also errors its body and so ends the read loop (res.body.cancel() rejects instead, agent-2.md)
  async function importPerf(perf: "blitz" | "rapid"): Promise<string | null> {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restartTimer = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => abort.abort(), ms);
    };
    let connected = false;

    restartTimer(CONNECT_TIMEOUT_MS);
    try {
      const res = await fetch(
        `https://lichess.org/api/games/user/${username}?perfType=${perf}&pgnInJson=true`,
        { headers: { Accept: "application/x-ndjson" }, signal: abort.signal }
      );
      connected = true;
      if (!res.ok) return `Lichess had an error (${res.status}) fetching ${perf} games${keptNote()}`;

      restartTimer(IDLE_TIMEOUT_MS);
      await processStream(res, () => restartTimer(IDLE_TIMEOUT_MS));
      return null;
    } catch (err) {
      if (!abort.signal.aborted) throw err;
      if (!connected) return `Lichess didn't answer within ${CONNECT_TIMEOUT_MS / 1000} seconds${keptNote()}`;
      return gamesImported > 0
        ? `Lichess stopped responding after ${games(gamesImported)}; run it again to fetch the rest`
        : "Lichess stopped sending before the first game arrived; run it again";
    } finally {
      clearTimeout(timer);
    }
  }

  async function processStream(res: Response, onChunk: () => void): Promise<void> {
    if (!res.body) return;

    const body = res.body;
    const nodeStream = Readable.from((async function* () {
      for await (const chunk of body) {
        onChunk();
        yield chunk;
      }
    })());
    const rl = readline.createInterface({ input: nodeStream });

    for await (const line of rl) {
      const trimmed = (line as string).trim();
      if (!trimmed) continue;

      let game: unknown;
      try {
        game = JSON.parse(trimmed);
      } catch {
        continue; // skip malformed lines rather than crashing the whole import
      }

      // the id becomes a file name, so it must be a plain id; the pgn must be a sensible-sized string
      const { id, pgn } = (game ?? {}) as { id?: unknown; pgn?: unknown };
      if (!isSafeId(id) || typeof pgn !== "string" || !pgn || pgn.length > MAX_PGN_BYTES) continue;

      const filePath = path.join(userDir, `${id}.pgn`);

      // skip if file already exists
      if (fs.existsSync(filePath)) continue;

      await fs.promises.writeFile(filePath, pgn, "utf8");
      gamesImported++;
    }
  }

  let error: string | null;
  try {
    error = (await importPerf("blitz")) ?? (await importPerf("rapid"));
  } catch (err) {
    error = (err instanceof Error ? err.message : "Unknown error during import") + keptNote();
  }
  return error ? { ok: false, error, gamesImported } : { ok: true, gamesImported };
}