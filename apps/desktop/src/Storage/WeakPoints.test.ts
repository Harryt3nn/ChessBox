import fs from 'fs';
import path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// MainStorage reads app.getPath at import time, so the temp folder must exist before the mock runs
const dataDir = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  return mkdtempSync(`${tmpdir()}/chessbox-weakpoints-`);
});

vi.mock('electron', () => ({ app: { getPath: () => dataDir }, safeStorage: {} }));

import { weakpointsGrade, weakpointsQueue } from './WeakPoints';
import { deleteRepertoire, saveNodes, saveRepertoires } from './MainStorage';
import { runNovelty } from './NoveltyRunner';

const DATA = path.join(dataDir, 'ChessBox-data');
const FILE = path.join(DATA, 'weakpoints', 'rep.json');

beforeEach(async () => {
  fs.rmSync(DATA, { recursive: true, force: true });
  // white repertoire: 1.e4 e5 2.Nf3; one game deviated with 2.Bc4
  await saveNodes({
    root: { id: 'root', parentId: null, move: null, childIDs: ['e4'], repertoireId: 'rep' },
    e4: { id: 'e4', parentId: 'root', move: 'e4', childIDs: ['e5'], repertoireId: 'rep' },
    e5: { id: 'e5', parentId: 'e4', move: 'e5', childIDs: ['Nf3'], repertoireId: 'rep' },
    Nf3: { id: 'Nf3', parentId: 'e5', move: 'Nf3', childIDs: [], repertoireId: 'rep' },
  });
  await saveRepertoires([{ id: 'rep', name: 'e4', side: 'white', rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 }]);
  const dir = path.join(DATA, 'games', 'lichess', 'me');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'g1.pgn'), '[White "me"]\n[Black "x"]\n[Result "*"]\n[UTCDate "2026.11.01"]\n\n1. e4 e5 2. Bc4 *\n');
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('weakpointsQueue', () => {
  it('asks for a novelty run first when there is none', async () => {
    expect(await weakpointsQueue('rep')).toEqual({ drills: [], cards: 0, recovered: false, noNovelty: true });
    expect(fs.existsSync(FILE)).toBe(false);
  });

  it('turns the deviation into a due drill and saves the cards', async () => {
    await runNovelty('rep', 'all');
    const queue = await weakpointsQueue('rep');
    expect(queue).toMatchObject({ cards: 1, recovered: false, noNovelty: false });
    expect(queue.drills[0]).toMatchObject({ nodeId: 'e5', answer: 'Nf3', moves: ['e4', 'e5'], from: 0 });
    expect(JSON.parse(fs.readFileSync(FILE, 'utf8')).cards.e5.source).toBe('deviation');
  });

  it('sets an unreadable or wrongly shaped file aside and starts fresh', async () => {
    await runNovelty('rep', 'all');
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    for (const bad of ['{ not json', JSON.stringify({ version: 2, repertoireId: 'rep', cards: {} })]) {
      fs.writeFileSync(FILE, bad);
      expect((await weakpointsQueue('rep')).recovered).toBe(true);
    }
    const aside = fs.readdirSync(path.dirname(FILE)).filter(f => /^rep\.corrupt-\d+\.json$/.test(f));
    expect(aside).toHaveLength(2);
    expect((await weakpointsQueue('rep')).recovered).toBe(false);
  });

  it('refuses unsafe or unknown repertoire ids', async () => {
    await expect(weakpointsQueue('../x')).rejects.toThrow('Invalid repertoire id');
    await expect(weakpointsQueue('gone')).rejects.toThrow("doesn't exist");
  });
});

describe('weakpointsGrade', () => {
  it('schedules the card and takes it out of the queue until it is due', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep');
    const due = await weakpointsGrade('rep', 'e5', true, 'Nf3');
    expect(due).toBeGreaterThan(Date.now());
    expect((await weakpointsQueue('rep')).drills).toEqual([]);
    expect(JSON.parse(fs.readFileSync(FILE, 'utf8')).cards.e5.log).toEqual([expect.objectContaining({ rating: 3, played: 'Nf3' })]);
  });

  it('only accepts a node id, a true / false answer and a SAN move from the renderer', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep');
    await expect(weakpointsGrade('rep', 'e5', 'yes', 'Nf3')).rejects.toThrow('Invalid grade');
    for (const played of [undefined, '', 'N', '<script>', 'Nf3'.repeat(4)]) {
      await expect(weakpointsGrade('rep', 'e5', true, played)).rejects.toThrow('Invalid grade');
    }
    await expect(weakpointsGrade('rep', 'e5', false, 'exd8=Q+')).resolves.toBeGreaterThan(0);
    await expect(weakpointsGrade('rep', 'nope', true, 'Nf3')).rejects.toThrow("doesn't exist");
  });
});

describe('deleteRepertoire', () => {
  it('removes the WeakPoints file too', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep');
    await deleteRepertoire('rep');
    expect(fs.existsSync(FILE)).toBe(false);
  });
});
