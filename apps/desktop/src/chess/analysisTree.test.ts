import { describe, expect, it } from 'vitest';
import { BoardImportError, createTree, exportPgn, importAny, importPgn, mainLineFrom, playMove, plyInfo } from './analysisTree';
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
