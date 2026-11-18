import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import { walkGame } from './walk';

const n = (id: string, move: string | null, kids: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id, parentId: null, move, childIDs: kids, ...extra });
const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));

// white repertoire: 1.e4 e5 2.Nf3 Nc6 3.Bb5, and 1...c5 2.Nf3
const white = graph(
  n('root', null, ['e4'], { fen: DEFAULT_POSITION }),
  n('e4', 'e4', ['e5', 'c5']),
  n('e5', 'e5', ['Nf3']), n('Nf3', 'Nf3', ['Nc6']), n('Nc6', 'Nc6', ['Bb5']), n('Bb5', 'Bb5'),
  n('c5', 'c5', ['Nf3b']), n('Nf3b', 'Nf3'),
);

const walk = (moves: string, nodes = white, side: 'white' | 'black' = 'white', start = DEFAULT_POSITION) =>
  walkGame(start, moves.split(' '), 'root', nodes, side);

describe('walkGame', () => {
  it('records every move that followed the repertoire', () => {
    const result = walk('e4 e5 Nf3 Nc6 Bb5');
    expect(result.matched.map(m => m.nodeId)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    expect(result.matched[2]).toEqual({ ply: 3, san: 'Nf3', nodeId: 'Nf3' });
    expect(result.outcome).toEqual({ kind: 'complete' });
  });

  it('flags a deviation when you play something other than your prepared reply', () => {
    const result = walk('e4 e5 Bc4 Nf6');
    expect(result.matched.map(m => m.san)).toEqual(['e4', 'e5']);
    expect(result.outcome).toEqual({ kind: 'deviation', ply: 3, san: 'Bc4', expected: 'Nf3', nodeId: 'e5' });
  });

  it('flags a novelty when the opponent plays a move the repertoire does not cover', () => {
    const result = walk('e4 d5 exd5');
    expect(result.outcome).toEqual({ kind: 'novelty', reason: 'opponent-move', ply: 2, san: 'd5', nodeId: 'e4' });
  });

  it('flags the first move after the end of a line as a novelty, whoever plays it', () => {
    expect(walk('e4 e5 Nf3 Nc6 Bb5 a6 Ba4').outcome).toEqual({ kind: 'novelty', reason: 'end-of-line', ply: 6, san: 'a6', nodeId: 'Bb5' });
    expect(walk('e4 c5 Nf3 d6 d4').outcome).toEqual({ kind: 'novelty', reason: 'end-of-line', ply: 4, san: 'd6', nodeId: 'Nf3b' });
  });

  it('judges moves by the position they reach, so SAN spelling does not matter', () => {
    const nodes = graph(n('root', null, ['a']), n('a', 'e4', ['b']), n('b', 'e5', ['c']), n('c', 'Ng1f3'));
    expect(walk('e4 e5 Nf3', nodes).matched.map(m => m.nodeId)).toEqual(['a', 'b', 'c']);
  });

  it('follows transpositions into the line they join', () => {
    // black repertoire: 1.e4 e6 2.d4 d5, and 1.d4 e6 2.e4 transposes into it
    const nodes = graph(
      n('root', null, ['a1', 'b1']),
      n('a1', 'e4', ['a2']), n('a2', 'e6', ['a3']), n('a3', 'd4', ['a4']), n('a4', 'd5'),
      n('b1', 'd4', ['b2']), n('b2', 'e6', [], { transpositionEdges: [{ targetId: 'a3', move: 'e4' }] }),
    );
    const result = walk('d4 e6 e4 d5 Nc3', nodes, 'black');
    expect(result.matched.map(m => m.nodeId)).toEqual(['b1', 'b2', 'a3', 'a4']);
    expect(result.outcome).toEqual({ kind: 'novelty', reason: 'end-of-line', ply: 5, san: 'Nc3', nodeId: 'a4' });
  });

  it('reads chessgraph childIds as well', () => {
    const nodes = { root: { id: 'root', parentId: null, move: null, childIDs: [], childIds: ['a'] } as unknown as Node, a: n('a', 'd4') };
    expect(walk('d4', nodes).outcome).toEqual({ kind: 'complete' });
  });

  it('says so when the game starts from a different position than the repertoire', () => {
    const start = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    expect(walk('e4', white, 'white', start).outcome).toEqual({ kind: 'different-start' });
  });

  it('stops at an illegal move in the game record', () => {
    expect(walk('e4 e5 Ke3').outcome).toEqual({ kind: 'invalid-game', ply: 3, san: 'Ke3' });
  });

  it('handles an empty game', () => {
    expect(walkGame(DEFAULT_POSITION, [], 'root', white, 'white')).toEqual({ matched: [], outcome: { kind: 'complete' } });
  });
});
