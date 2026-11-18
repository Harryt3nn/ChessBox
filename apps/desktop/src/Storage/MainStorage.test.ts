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

import { loadNodes, saveNodePatch, saveNodes } from './MainStorage';

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

  it('rejects something that is not an object', async () => {
    await expect(saveNodePatch([])).rejects.toThrow();
  });
});
