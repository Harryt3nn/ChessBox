/*apps/desktop/src/Storage/ChesscomImporter.ts*/

import fs from "fs";
import path from "path";
import { ensureDirs, CHESSCOM_DIR } from "./MainStorage";

export interface ChesscomImportResult {
  ok: boolean;
  error?: string;
  gamesImported?: number;
}

interface ChesscomArchivesResponse {
  archives: string[];
}

interface ChesscomGame {
  url: string;
  pgn: string;
  end_time: number;
  uuid: string;
  time_class: string;
}

interface ChesscomGamesResponse {
  games: ChesscomGame[];
}

const ALLOWED_TIME_CLASSES = new Set(["blitz", "rapid"]);

export async function importChesscom(username: string): Promise<ChesscomImportResult> {
  ensureDirs();

  const userDir = path.join(CHESSCOM_DIR, username);
  fs.mkdirSync(userDir, { recursive: true });

  let gamesImported = 0;

  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);

    if (!archivesRes.ok) {
      return { ok: false, error: `Chess.com returned ${archivesRes.status} fetching archives` };
    }

    const archivesData: ChesscomArchivesResponse = await archivesRes.json();

    for (const archiveUrl of archivesData.archives) {
      const gamesRes = await fetch(archiveUrl);

      if (!gamesRes.ok) {
        // Skip a single bad month rather than failing the whole import
        continue;
      }

      const gamesData: ChesscomGamesResponse = await gamesRes.json();

      for (const game of gamesData.games) {
        if (!game.pgn || !game.uuid) continue;
        if (!ALLOWED_TIME_CLASSES.has(game.time_class)) continue;

        const filePath = path.join(userDir, `${game.uuid}.pgn`);
        await fs.promises.writeFile(filePath, game.pgn, "utf8");
        gamesImported++;
      }
    }

    return { ok: true, gamesImported };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error during import" };
  }
}