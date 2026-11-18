import fs from 'fs';
import path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// MainStorage reads app.getPath at import time, so the temp folder must exist before the mock runs
const dataDir = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  return mkdtempSync(`${tmpdir()}/chessbox-novelty-`);
});

vi.mock('electron', () => ({ app: { getPath: () => dataDir }, safeStorage: {} }));

import { listAccounts, loadNovelty, runNovelty, updateFinding } from './NoveltyRunner';
import { saveNodes, saveRepertoires } from './MainStorage';

const DATA = path.join(dataDir, 'ChessBox-data');
const pgn = (white: string, black: string, date: string, moves: string) =>
  `[White "${white}"]\n[Black "${black}"]\n[Result "*"]\n[UTCDate "${date}"]\n[UTCTime "12:00:00"]\n\n${moves} *\n`;

function writeGame(site: string, user: string, id: string, text: string) {
  const dir = path.join(DATA, 'games', site, user);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.pgn`), text);
}

beforeEach(async () => {
  fs.rmSync(DATA, { recursive: true, force: true });
  // white repertoire: 1.e4 e5 2.Nf3
  await saveNodes({
    root: { id: 'root', parentId: null, move: null, childIDs: ['e4'] },
    e4: { id: 'e4', parentId: 'root', move: 'e4', childIDs: ['e5'] },
    e5: { id: 'e5', parentId: 'e4', move: 'e5', childIDs: ['Nf3'] },
    Nf3: { id: 'Nf3', parentId: 'e5', move: 'Nf3', childIDs: [] },
  });
  await saveRepertoires([{ id: 'rep', name: 'e4', side: 'white', rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 }]);
  writeGame('chesscom', 'Harry_Tennant', 'g1', pgn('harry_tennant', 'x', '2026.11.01', '1. e4 e5 2. Bc4 Nf6'));
  writeGame('chesscom', 'Harry_Tennant', 'g2', pgn('Harry_Tennant', 'y', '2026.11.03', '1. e4 d5'));
  writeGame('chesscom', 'Harry_Tennant', 'g3', pgn('z', 'Harry_Tennant', '2026.11.04', '1. d4 d5'));
  writeGame('lichess', 'harryt3nn', 'g4', pgn('someone', 'else', '2026.11.05', '1. e4 e5'));
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('runNovelty', () => {
  it('walks every game where you played the repertoire\'s colour and saves the results', async () => {
    const summary = await runNovelty('rep', 'all');

    expect(summary).toEqual({ walked: 2, deviations: 1, novelties: 1, inPrep: 0 });
    const file = await loadNovelty('rep');
    expect(Object.keys(file?.games ?? {}).sort()).toEqual(['chesscom:g1', 'chesscom:g2']);
    expect(file?.findings['e5|Bc4|deviation']).toMatchObject({ count: 1, line: ['e4', 'e5'], expected: 'Nf3' });
    expect(file?.nodeHits.e4.count).toBe(2);
  });

  it('checks only the most recent game in "latest" mode, keeping earlier results', async () => {
    await runNovelty('rep', 'all');
    writeGame('chesscom', 'Harry_Tennant', 'g5', pgn('Harry_Tennant', 'w', '2026.11.10', '1. e4 e5 2. Bc4'));
    expect(await runNovelty('rep', 'latest')).toEqual({ walked: 1, deviations: 1, novelties: 0, inPrep: 0 });
    const file = await loadNovelty('rep');
    expect(file?.findings['e5|Bc4|deviation'].count).toBe(2);
    expect(Object.keys(file?.games ?? {})).toHaveLength(3);
  });

  it('never double-counts when run again', async () => {
    await runNovelty('rep', 'all');
    await runNovelty('rep', 'all');
    expect((await loadNovelty('rep'))?.findings['e5|Bc4|deviation'].count).toBe(1);
  });

  it('reports progress while it works', async () => {
    const progress = vi.fn();
    await runNovelty('rep', 'all', progress);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('saves a finding\'s status and engine verdict, and they survive a re-run', async () => {
    await runNovelty('rep', 'all');
    await updateFinding('rep', 'e5|Bc4|deviation', { status: 'dismissed', eval: { score: '-0.40', depth: 20, best: 'Nf3' } });
    await runNovelty('rep', 'all');
    expect((await loadNovelty('rep'))?.findings['e5|Bc4|deviation']).toMatchObject({ status: 'dismissed', eval: { score: '-0.40', depth: 20, best: 'Nf3' } });
  });

  it('ignores bad finding updates', async () => {
    await runNovelty('rep', 'all');
    await expect(updateFinding('rep', 'nope|x|deviation', { status: 'dismissed' })).rejects.toThrow();
    await updateFinding('rep', 'e5|Bc4|deviation', { status: 'deleted', eval: { score: 5 } } as never);
    expect((await loadNovelty('rep'))?.findings['e5|Bc4|deviation']).toMatchObject({ status: 'new' });
    expect((await loadNovelty('rep'))?.findings['e5|Bc4|deviation'].eval).toBeUndefined();
  });

  it('lists the imported accounts', async () => {
    expect(await listAccounts()).toEqual(['chesscom/Harry_Tennant', 'lichess/harryt3nn']);
  });

  it('only reads games from the accounts you picked, and remembers the pick', async () => {
    expect(await runNovelty('rep', 'all', undefined, ['lichess/harryt3nn'])).toMatchObject({ walked: 0 });
    expect((await loadNovelty('rep'))?.accounts).toEqual(['lichess/harryt3nn']);
    // no pick passed: the saved one is used
    expect(await runNovelty('rep', 'all')).toMatchObject({ walked: 0 });
    expect(await runNovelty('rep', 'all', undefined, ['chesscom/Harry_Tennant', 'lichess/harryt3nn'])).toMatchObject({ walked: 2 });
  });

  it('refuses an unsafe or unknown repertoire id', async () => {
    await expect(runNovelty('../rep', 'all')).rejects.toThrow();
    await expect(runNovelty('missing', 'all')).rejects.toThrow();
    expect(await loadNovelty('missing')).toBeNull();
  });
});
