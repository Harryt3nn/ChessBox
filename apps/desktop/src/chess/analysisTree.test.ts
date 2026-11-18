import { describe, expect, it } from 'vitest';
import { BoardImportError, createTree, existingPath, pathToNode, playSan, exportPgn, importAny, importPgn, mainLineFrom, movesAlongPath, playMove, plyInfo } from './analysisTree';
import type { GameTree } from '../types/gameTree';

const moves = (tree: GameTree) => mainLineFrom(tree.root, []).length;

describe('playMove', () => {
  it('adds a move, and replaying it from the same position reuses the node', () => {
    const once = playMove(createTree(), { from: 'e2', to: 'e4' });
    if (!once) throw new Error('e4 should be legal');
    const back = { ...once, currentPath: [] };
    const again = playMove(back, { from: 'e2', to: 'e4' });

    expect(again?.root.children).toHaveLength(1);
    expect(again?.currentPath).toEqual(once.currentPath);
  });

  it('returns null for an illegal move', () => {
    expect(playMove(createTree(), { from: 'e2', to: 'e5' })).toBeNull();
  });
});

describe('movesAlongPath', () => {
  it('lists the SAN moves from the start to the current node, following variations', () => {
    const { tree } = importPgn('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    const sicilian = tree.root.children[0].children[1];
    const path = [tree.root.children[0].id, sicilian.id, sicilian.children[0].id];
    expect(movesAlongPath(tree.root, path)).toEqual(['e4', 'c5', 'Nf3']);
  });

  it('is empty at the start position', () => {
    expect(movesAlongPath(createTree().root, [])).toEqual([]);
  });
});

describe('existingPath', () => {
  it('keeps the part of a path that still exists in the tree', () => {
    const { tree } = importPgn('1. e4 e5 2. Nf3 *');
    const e4 = tree.root.children[0];
    const e5 = e4.children[0];
    expect(existingPath(tree.root, [e4.id, e5.id])).toEqual([e4.id, e5.id]);
    expect(existingPath(tree.root, [e4.id, 'gone', e5.id])).toEqual([e4.id]);
  });
});

describe('playSan', () => {
  it('plays a SAN move from the current position, or returns null if illegal', () => {
    const next = playSan(createTree(), 'Nf3');
    expect(next?.root.children[0].move).toBe('Nf3');
    expect(next?.currentPath).toEqual([next?.root.children[0].id]);
    expect(playSan(createTree(), 'Ke2')).toBeNull();
  });
});

describe('pathToNode', () => {
  it('finds the path to a node anywhere in the tree, or null', () => {
    const { tree } = importPgn('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    const e4 = tree.root.children[0];
    const nf3InSicilian = e4.children[1].children[0];
    expect(pathToNode(tree.root, nf3InSicilian.id)).toEqual([e4.id, e4.children[1].id, nf3InSicilian.id]);
    expect(pathToNode(tree.root, 'missing')).toBeNull();
    expect(pathToNode(tree.root, tree.root.id)).toEqual([]);
  });
});

describe('plyInfo', () => {
  it('numbers a black-to-move start as "N..."', () => {
    expect(plyInfo('4k3/8/8/8/8/8/4P3/4K3 b - - 0 7', 1)).toEqual({ moveNumber: 7, isWhite: false });
    expect(plyInfo('4k3/8/8/8/8/8/4P3/4K3 b - - 0 7', 2)).toEqual({ moveNumber: 8, isWhite: true });
  });
});

describe('PGN round trip', () => {
  it('keeps variations, comments and NAGs through export and re-import', () => {
    const pgn = '1. e4 { best by test } e5 $1 (1... c5 2. Nf3) 2. Nf3 *';
    const first = importPgn(pgn).tree;
    const movetext = exportPgn(first).split('\n\n')[1].trim();

    expect(movetext).toBe('1. e4 { best by test } 1... e5 $1 (1... c5 2. Nf3) 2. Nf3 *');
    expect(exportPgn(importPgn(exportPgn(first)).tree)).toBe(exportPgn(first));
  });

  it('reports an illegal move with its move number', () => {
    expect(() => importPgn('1. e4 e5 2. Ke3')).toThrow(new BoardImportError('Illegal move 2. Ke3'));
  });
});

describe('importAny', () => {
  it('loads a FEN', () => {
    const { tree } = importAny('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    expect(tree.root.fen).toBe('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
  });

  it('loads a board saved by the old Save button', () => {
    const saved = JSON.stringify({ root: { fen: createTree().root.fen, children: [{ move: 'e4', children: [] }] } });
    expect(moves(importAny(saved, 'board.json').tree)).toBe(1);
  });

  it('loads a PGN whose movetext starts with a comment', () => {
    const { tree } = importAny('{ Prep for Saturday } 1. e4 e5 *');
    expect(moves(tree)).toBe(2);
  });
});
