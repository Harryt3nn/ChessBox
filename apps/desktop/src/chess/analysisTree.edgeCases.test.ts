import { describe, expect, it } from 'vitest';
import { BoardImportError, createTree, getNodeAtPath, importAny, importFen, importPgn, playMove } from './analysisTree';

// borderline and invalid input for the analysis board (T10)

describe('importFen rejects impossible positions', () => {
  it.each([
    ['empty text', ''],
    ['too few ranks', '8/8/8 w - - 0 1'],
    ['a rank with nine squares', '9/8/8/8/8/8/8/4K2k w - - 0 1'],
    ['no black king', '8/8/8/8/8/8/8/4K3 w - - 0 1'],
    ['two white kings', '4k3/8/8/8/8/8/8/3KK3 w - - 0 1'],
    ['a pawn on the back rank', 'P3k3/8/8/8/8/8/8/4K3 w - - 0 1'],
    ['the side not to move is in check', '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1'],
    ['a bad side to move', '4k3/8/8/8/8/8/8/4K3 x - - 0 1'],
  ])('%s', (_name, fen) => {
    expect(() => importFen(fen)).toThrow(BoardImportError);
  });

  it('accepts a legal position with extra spaces and a trailing newline', () => {
    expect(importFen('  4k3/8/8/8/8/8/4R3/4K3   b - - 0 1 \n').root.fen).toBe('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1');
  });
});

describe('importPgn edge cases', () => {
  it('asks for a PGN when the text is empty or blank', () => {
    expect(() => importPgn('')).toThrow(new BoardImportError('Paste a PGN first.'));
    expect(() => importPgn('  \n\t ')).toThrow(new BoardImportError('Paste a PGN first.'));
  });

  it('refuses a PGN over the size limit', () => {
    expect(() => importPgn('1. e4 '.repeat(200_000))).toThrow(new BoardImportError('That PGN is too large to import.'));
  });

  it('imports the first of several games and says how many there were', () => {
    const { tree, gameCount } = importPgn('[White "a"]\n\n1. e4 *\n\n[White "b"]\n\n1. d4 *');
    expect(gameCount).toBe(2);
    expect(tree.headers?.White).toBe('a');
    expect(tree.root.children[0].move).toBe('e4');
  });

  it('keeps the tags of a game with no moves', () => {
    const { tree } = importPgn('[White "a"]\n[Black "b"]\n\n*');
    expect(tree.root.children).toEqual([]);
    expect(tree.headers?.Black).toBe('b');
  });

  it('reports an illegal move inside a variation with its move number', () => {
    expect(() => importPgn('1. e4 e5 (1... Ke7) 2. Nf3 *')).toThrow(new BoardImportError('Illegal move 1... Ke7'));
  });

  it('rejects a FEN tag where the side not to move is in check', () => {
    expect(() => importPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1"]\n\n*')).toThrow(BoardImportError);
  });

  it('rejects text that is not a PGN', () => {
    expect(() => importAny('hello there')).toThrow(BoardImportError);
  });
});

describe('playMove rules', () => {
  const at = (fen: string) => createTree(fen);

  it('refuses to castle through check', () => {
    // the black rook on f2 covers f1
    expect(playMove(at('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1'), { from: 'e1', to: 'g1' })).toBeNull();
  });

  it('castles queenside when that side is safe', () => {
    const next = playMove(at('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1'), { from: 'e1', to: 'c1' });
    expect(next && getNodeAtPath(next.root, next.currentPath).move).toBe('O-O-O');
  });

  it('marks a promotion that gives check', () => {
    const next = playMove(at('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1'), { from: 'b7', to: 'b8', promotion: 'q' });
    expect(next && getNodeAtPath(next.root, next.currentPath).move).toBe('b8=Q+');
  });

  it('underpromotes when asked', () => {
    const next = playMove(at('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1'), { from: 'b7', to: 'b8', promotion: 'n' });
    expect(next && getNodeAtPath(next.root, next.currentPath).move).toBe('b8=N');
  });

  it('refuses any move once the game is over', () => {
    // fool's mate: white is checkmated
    const mated = importPgn('1. f3 e5 2. g4 Qh4# 0-1').tree;
    const end = { ...mated, currentPath: [mated.root.children[0].id, mated.root.children[0].children[0].id, mated.root.children[0].children[0].children[0].id, mated.root.children[0].children[0].children[0].children[0].id] };
    expect(playMove(end, { from: 'a2', to: 'a3' })).toBeNull();
  });
});
