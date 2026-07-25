/*apps/desktop/src/Storage/LichessImporter.ts*/

import fs from "fs";
import path from "path";
import readline from "readline";
import fetch from "node-fetch";
import { ensureDirs, LICHESS_DIR } from "./MainStorage";

export async function importLichess(username: string) {
  ensureDirs();

  const userDir = path.join(LICHESS_DIR, username);
  fs.mkdirSync(userDir, { recursive: true });

  const res = await fetch(
    `https://lichess.org/api/games/user/${username}?max=200&pgnInJson=true`,
    { headers: { Accept: "application/x-ndjson" } }
  );

  const rl = readline.createInterface({ input: res.body });

  for await (const line of rl) {
    const game = JSON.parse(line);
    const filePath = path.join(userDir, `${game.id}.pgn`);
    await fs.promises.writeFile(filePath, game.pgn, "utf8");
  }
}
