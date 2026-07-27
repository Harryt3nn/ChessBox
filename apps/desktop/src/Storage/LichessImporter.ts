/*apps/desktop/src/Storage/LichessImporter.ts*/

import fs from "fs";
import path from "path";
import readline from "readline";
import { Readable } from "stream";
import { ensureDirs, LICHESS_DIR } from "./MainStorage";
import { pgnToJson } from "./PGNtoJSON";

export interface LichessImportResult {
  ok: boolean;
  error?: string;
  gamesImported?: number;
}

export async function importLichess(username: string): Promise<LichessImportResult> {
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

      let game: { id: string; pgn: string };
      try {
        game = JSON.parse(trimmed);
      } catch {
        continue; // skip malformed lines rather than crashing the whole import
      }

      const filePath = path.join(userDir, `${game.id}.pgn`);
      await fs.promises.writeFile(filePath, game.pgn, "utf8");
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