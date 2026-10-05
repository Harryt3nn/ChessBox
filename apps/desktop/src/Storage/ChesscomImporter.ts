/*apps/desktop/src/Storage/ChesscomImporter.ts*/

import fs from "fs";
import path from "path";
import { ensureDirs, CHESSCOM_DIR } from "./MainStorage";
import { isSafeId } from "../importsAndExports/sanitiseImport";

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

const MAX_PGN_BYTES = 200_000;
const REQUEST_TIMEOUT_MS = 30_000;

// only ever follow archive links back to the Chess.com public API
const ARCHIVE_URL = /^https:\/\/api\.chess\.com\/pub\/player\/[A-Za-z0-9_-]+\/games\/\d{4}\/\d{2}$/;

export async function importChesscom(username: string): Promise<ChesscomImportResult> {
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(username)) {
    return { ok: false, error: "Invalid username" };
  }

  ensureDirs();

  const userDir = path.join(CHESSCOM_DIR, username);
  fs.mkdirSync(userDir, { recursive: true });

  let gamesImported = 0;

  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!archivesRes.ok) {
      return { ok: false, error: `Chess.com returned ${archivesRes.status} fetching archives` };
    }

    const archivesData = (await archivesRes.json()) as Partial<ChesscomArchivesResponse>;
    const archives = Array.isArray(archivesData.archives)
      ? archivesData.archives.filter((u): u is string => typeof u === "string" && ARCHIVE_URL.test(u))
      : [];

    for (const archiveUrl of archives) {
      // Skip a single bad month (network error, bad status, malformed JSON) rather than failing the whole import
      let gamesData: Partial<ChesscomGamesResponse>;
      try {
        const gamesRes = await fetch(archiveUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!gamesRes.ok) continue;
        gamesData = await gamesRes.json();
      } catch {
        continue;
      }

      if (!Array.isArray(gamesData.games)) continue;

      for (const game of gamesData.games) {
        if (!game || typeof game !== "object") continue;
        // the uuid becomes a file name, so it must be a plain id
        if (!isSafeId(game.uuid) || typeof game.pgn !== "string" || !game.pgn || game.pgn.length > MAX_PGN_BYTES) continue;
        if (!ALLOWED_TIME_CLASSES.has(game.time_class)) continue;

        const filePath = path.join(userDir, `${game.uuid}.pgn`);

        // skip if file already exists
        if (fs.existsSync(filePath)) {
          continue;
        }

        await fs.promises.writeFile(filePath, game.pgn, "utf8");
        gamesImported++;
      }
    }

    return { ok: true, gamesImported };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error during import" };
  }
}
