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

import { importRepertoires } from './ImportService';
import { loadNodes } from './MainStorage';

const rep = (id: string, rootNodeId: string) => ({ id, name: id, side: 'white', rootNodeId, folderId: null, createdAt: 0, updatedAt: 0 });
const node = (id: string, repertoireId: string, parentId: string | null, move: string | null, childIDs: string[] = []) =>
  ({ id, repertoireId, parentId, move, childIDs });

afterEach(() => fs.rmSync(path.join(dataDir, 'ChessBox-data'), { recursive: true, force: true }));
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('importRepertoires', () => {
  // T31 (a) / D47: the import window sends every node in the file, ticked repertoire or not
  it('saves only the nodes of the repertoires that were picked', async () => {
    await importRepertoires({
      folders: [],
      repertoires: [rep('picked', 'p-root')],
      nodes: {
        'p-root': node('p-root', 'picked', null, null, ['p-e4']),
        'p-e4': node('p-e4', 'picked', 'p-root', 'e4'),
        'u-root': node('u-root', 'unpicked', null, null, ['u-d4']),
        'u-d4': node('u-d4', 'unpicked', 'u-root', 'd4'),
      },
    });

    expect(Object.keys(await loadNodes()).sort()).toEqual(['p-e4', 'p-root']);
  });

  it('keeps a node that a picked repertoire reaches only through a transposition, and what follows it', async () => {
    await importRepertoires({
      folders: [],
      repertoires: [rep('picked', 'p-root')],
      nodes: {
        'p-root': node('p-root', 'picked', null, null, ['p-e4']),
        'p-e4': { ...node('p-e4', 'picked', 'p-root', 'e4'), transpositionEdges: [{ targetId: 'u-d4', move: 'd4' }] },
        'u-root': node('u-root', 'unpicked', null, null, ['u-d4']),
        'u-d4': node('u-d4', 'unpicked', 'u-root', 'd4', ['u-d5']),
        'u-d5': node('u-d5', 'unpicked', 'u-d4', 'd5'),
      },
    });

    expect(Object.keys(await loadNodes()).sort()).toEqual(['p-e4', 'p-root', 'u-d4', 'u-d5']);
  });
});
