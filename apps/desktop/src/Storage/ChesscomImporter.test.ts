import fs from 'fs';
import path from 'path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

// MainStorage reads app.getPath at import time, so the temp folder must exist before the mock runs
const dataDir = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  return mkdtempSync(`${tmpdir()}/chessbox-test-`);
});

vi.mock('electron', () => ({ app: { getPath: () => dataDir }, safeStorage: {} }));

import { importChesscom } from './ChesscomImporter';

const ARCHIVE = 'https://api.chess.com/pub/player/harry/games/2026/11';

const game = (uuid: string, extra: Record<string, unknown>) => ({
  uuid, url: `https://www.chess.com/game/live/${uuid}`, pgn: '1. e4 e5 *', end_time: 0, ...extra,
});

function stubChesscom(games: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const body = url.endsWith('/archives') ? { archives: [ARCHIVE] } : { games };
    return new Response(JSON.stringify(body), { status: 200 });
  }));
}

const saved = () => fs.readdirSync(path.join(dataDir, 'ChessBox-data', 'games', 'chesscom', 'harry')).sort();

afterEach(() => {
  vi.unstubAllGlobals();
  fs.rmSync(path.join(dataDir, 'ChessBox-data'), { recursive: true, force: true });
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('importChesscom', () => {
  it('saves only standard-chess blitz and rapid games', async () => {
    stubChesscom([
      game('standard-blitz', { time_class: 'blitz', rules: 'chess' }),
      game('standard-rapid', { time_class: 'rapid', rules: 'chess' }),
      game('chess960-blitz', { time_class: 'blitz', rules: 'chess960' }),
      game('crazyhouse-rapid', { time_class: 'rapid', rules: 'crazyhouse' }),
      game('standard-bullet', { time_class: 'bullet', rules: 'chess' }),
    ]);

    const result = await importChesscom('harry');

    expect(result).toEqual({ ok: true, gamesImported: 2 });
    expect(saved()).toEqual(['standard-blitz.pgn', 'standard-rapid.pgn']);
  });

  it('skips a game whose uuid is not a safe file name', async () => {
    stubChesscom([game('../escape', { time_class: 'blitz', rules: 'chess' })]);
    expect(await importChesscom('harry')).toEqual({ ok: true, gamesImported: 0 });
  });

  it('refuses an unsafe username before making any request', async () => {
    stubChesscom([]);
    expect(await importChesscom('../harry')).toEqual({ ok: false, error: 'Invalid username' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
