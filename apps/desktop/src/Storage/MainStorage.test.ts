import fs from 'fs';
import path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// MainStorage reads app.getPath at import time, so the temp folder must exist before the mock runs
const dataDir = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  return mkdtempSync(`${tmpdir()}/chessbox-storage-`);
});

vi.mock('electron', () => ({ app: { getPath: () => dataDir }, safeStorage: {} }));

import { deleteRepertoire, loadNodes, loadRepertoires, saveNodePatch, saveNodes, saveRepertoires } from './MainStorage';

const NODES = path.join(dataDir, 'ChessBox-data', 'nodes.json');

beforeEach(async () => {
  await saveNodes({
    root: { id: 'root', parentId: null, move: null, childIDs: ['a'] },
    a: { id: 'a', parentId: 'root', move: 'e4', childIDs: [] },
  });
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('saveNodePatch', () => {
  it('adds new nodes and replaces changed ones, keeping the rest', async () => {
    await saveNodePatch({
      a: { id: 'a', parentId: 'root', move: 'e4', childIDs: ['b'] },
      b: { id: 'b', repertoireId: 'rep', parentId: 'a', move: 'e5', childIDs: [] },
    });
    const nodes = await loadNodes();
    expect(Object.keys(nodes).sort()).toEqual(['a', 'b', 'root']);
    expect(nodes.a.childIDs).toEqual(['b']);
    expect(nodes.b.repertoireId).toBe('rep');
  });

  it('sanitises what the renderer sends: unsafe ids, mismatched keys and junk fields are dropped', async () => {
    await saveNodePatch({
      '../evil': { id: '../evil', parentId: null, move: 'e4', childIDs: [] },
      c: { id: 'not-c', parentId: null, move: 'e4', childIDs: [] },
      d: { id: 'd', parentId: 'a', move: 'Nf3', childIDs: [], script: '<x>' },
    });
    const nodes = await loadNodes();
    expect(Object.keys(nodes).sort()).toEqual(['a', 'd', 'root']);
    expect(nodes.d).not.toHaveProperty('script');
    expect(fs.readFileSync(NODES, 'utf8')).not.toContain('evil');
  });

  it('removes the ids it is asked to, alongside the patch', async () => {
    await saveNodePatch({ root: { id: 'root', parentId: null, move: null, childIDs: [] } }, ['a', '../evil']);
    expect(Object.keys(await loadNodes())).toEqual(['root']);
  });

  it('rejects something that is not an object', async () => {
    await expect(saveNodePatch([])).rejects.toThrow();
  });
});

describe('deleteRepertoire', () => {
  it('removes the repertoire, its nodes and its novelty results, and nothing else', async () => {
    await saveNodes({
      r1: { id: 'r1', repertoireId: 'rep1', parentId: null, move: null, childIDs: ['x'] },
      x: { id: 'x', repertoireId: 'rep1', parentId: 'r1', move: 'e4', childIDs: [] },
      r2: { id: 'r2', repertoireId: 'rep2', parentId: null, move: null, childIDs: [] },
    });
    await saveRepertoires([
      { id: 'rep1', name: 'a', side: 'white', rootNodeId: 'r1', folderId: null, createdAt: 0, updatedAt: 0 },
      { id: 'rep2', name: 'b', side: 'black', rootNodeId: 'r2', folderId: null, createdAt: 0, updatedAt: 0 },
    ]);
    const novelty = path.join(dataDir, 'ChessBox-data', 'novelty');
    fs.mkdirSync(novelty, { recursive: true });
    fs.writeFileSync(path.join(novelty, 'rep1.json'), '{}');

    await deleteRepertoire('rep1');

    expect((await loadRepertoires()).map(r => r.id)).toEqual(['rep2']);
    expect(Object.keys(await loadNodes())).toEqual(['r2']);
    expect(fs.existsSync(path.join(novelty, 'rep1.json'))).toBe(false);
  });

  it('refuses an unsafe id', async () => {
    await expect(deleteRepertoire('../x')).rejects.toThrow();
  });
});
