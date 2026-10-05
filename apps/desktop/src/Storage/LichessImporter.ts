/*apps/desktop/src/Storage/LichessImporter.ts*/

import fs from "fs";
import path from "path";
import readline from "readline";
import { Readable } from "stream";
import { ensureDirs, LICHESS_DIR } from "./MainStorage";
import { isSafeId } from "../importsAndExports/sanitiseImport";

// a single game's PGN is a few KB; anything far larger isn't a real game
const MAX_PGN_BYTES = 200_000;

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

  async function processStream(res: Response): Promise<void> {
    if (!res.body) return;

    const nodeStream = Readable.from(res.body as unknown as AsyncIterable<any>);
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

  try {
    const blitzRes = await fetch(
      `https://lichess.org/api/games/user/${username}?perfType=blitz&pgnInJson=true`,
      { headers: { Accept: "application/x-ndjson" } }
    );

    if (!blitzRes.ok) {
      return { ok: false, error: `Lichess returned ${blitzRes.status} for blitz games` };
    }

    await processStream(blitzRes);

    const rapidRes = await fetch(
      `https://lichess.org/api/games/user/${username}?perfType=rapid&pgnInJson=true`,
      { headers: { Accept: "application/x-ndjson" } }
    );

    if (!rapidRes.ok) {
      return { ok: false, error: `Lichess returned ${rapidRes.status} for rapid games` };
    }

    await processStream(rapidRes);

    return { ok: true, gamesImported };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error during import" };
  }
}