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
  // white repertoire: 1.e4 e5 2.Nf3 Nc6 3.Bc4; one game deviated with 3.Bb5 (your third move, so it's drilled: D39)
  const node = (id: string, parentId: string | null, move: string | null, kids: string[]) => ({ id, parentId, move, childIDs: kids, repertoireId: 'rep' });
  await saveNodes({
    root: node('root', null, null, ['e4']), e4: node('e4', 'root', 'e4', ['e5']), e5: node('e5', 'e4', 'e5', ['Nf3']),
    Nf3: node('Nf3', 'e5', 'Nf3', ['Nc6']), Nc6: node('Nc6', 'Nf3', 'Nc6', ['Bc4']), Bc4: node('Bc4', 'Nc6', 'Bc4', []),
  });
  await saveRepertoires([{ id: 'rep', name: 'e4', side: 'white', rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 }]);
  const dir = path.join(DATA, 'games', 'lichess', 'me');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'g1.pgn'), '[White "me"]\n[Black "x"]\n[Result "*"]\n[UTCDate "2026.11.01"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *\n');
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('weakpointsQueue', () => {
  it('asks for a novelty run first when there is none', async () => {
    expect(await weakpointsQueue('rep', 'focused', null)).toEqual({ drills: [], cards: 0, recovered: false, noNovelty: true });
    expect(fs.existsSync(FILE)).toBe(false);
  });

  it('turns the deviation into a due drill and saves the cards', async () => {
    await runNovelty('rep', 'all');
    const queue = await weakpointsQueue('rep', 'focused', null);
    // the deviation, plus 1.e4 e5 as a rare card (the game reached it once)
    expect(queue).toMatchObject({ cards: 2, recovered: false, noNovelty: false });
    expect(queue.drills[0]).toMatchObject({ nodeId: 'Nc6', line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], from: 0, scoredFrom: 4 });
    expect(JSON.parse(fs.readFileSync(FILE, 'utf8')).cards.Nc6.source).toBe('deviation');
  });

  it('sets an unreadable or wrongly shaped file aside and starts fresh', async () => {
    await runNovelty('rep', 'all');
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    for (const bad of ['{ not json', JSON.stringify({ version: 2, repertoireId: 'rep', cards: {} })]) {
      fs.writeFileSync(FILE, bad);
      expect((await weakpointsQueue('rep', 'focused', null)).recovered).toBe(true);
    }
    const aside = fs.readdirSync(path.dirname(FILE)).filter(f => /^rep\.corrupt-\d+\.json$/.test(f));
    expect(aside).toHaveLength(2);
    expect((await weakpointsQueue('rep', 'focused', null)).recovered).toBe(false);
  });

  it('refuses a bad mode or a branch that no longer exists', async () => {
    await runNovelty('rep', 'all');
    await expect(weakpointsQueue('rep', 'everything', null)).rejects.toThrow('Invalid drill request');
    await expect(weakpointsQueue('rep', 'focused', 7)).rejects.toThrow('Invalid drill request');
    await expect(weakpointsQueue('rep', 'focused', 'gone')).rejects.toThrow("doesn't exist");
    expect((await weakpointsQueue('rep', 'mistakes', 'e5')).drills).toHaveLength(1);
  });

  it('refuses unsafe or unknown repertoire ids', async () => {
    await expect(weakpointsQueue('../x', 'focused', null)).rejects.toThrow('Invalid repertoire id');
    await expect(weakpointsQueue('gone', 'focused', null)).rejects.toThrow("doesn't exist");
  });
});

describe('weakpointsGrade', () => {
  it('schedules the card and takes it out of the queue until it is due', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep', 'focused', null);
    const due = await weakpointsGrade('rep', 'Nc6', true, 'Bc4');
    expect(due).toBeGreaterThan(Date.now());
    expect((await weakpointsQueue('rep', 'focused', null)).drills.map(d => d.nodeId)).toEqual(['e5']);
    expect(JSON.parse(fs.readFileSync(FILE, 'utf8')).cards.Nc6.log).toEqual([expect.objectContaining({ rating: 3, played: 'Bc4' })]);
  });

  it('only accepts a node id, a true / false answer and a SAN move from the renderer', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep', 'focused', null);
    await expect(weakpointsGrade('rep', 'Nc6', 'yes', 'Nf3')).rejects.toThrow('Invalid grade');
    for (const played of [undefined, '', 'N', '<script>', 'Nf3'.repeat(4)]) {
      await expect(weakpointsGrade('rep', 'Nc6', true, played)).rejects.toThrow('Invalid grade');
    }
    await expect(weakpointsGrade('rep', 'Nc6', false, 'exd8=Q+')).resolves.toBeGreaterThan(0);
    await expect(weakpointsGrade('rep', 'nope', true, 'Nf3')).rejects.toThrow("doesn't exist");
  });
});

describe('deleteRepertoire', () => {
  it('removes the WeakPoints file too', async () => {
    await runNovelty('rep', 'all');
    await weakpointsQueue('rep', 'focused', null);
    await deleteRepertoire('rep');
    expect(fs.existsSync(FILE)).toBe(false);
  });
});
