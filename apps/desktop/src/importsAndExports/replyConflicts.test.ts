import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { findReplyConflicts, keepReplies } from './replyConflicts';

const n = (id: string, move: string | null, kids: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id, parentId: null, move, childIDs: kids, ...extra });
const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));
const rep = (id: string, side: 'white' | 'black', rootNodeId = 'root'): Repertoire =>
  ({ id, name: `Rep ${id}`, side, rootNodeId, folderId: null, createdAt: 0, updatedAt: 0 });

// white plays 1.e4 or 1.d4 (two replies on White's move); after 1.e4 Black has e5 and c5 (fine, opponent)
const nodes = graph(
  n('root', null, ['e4', 'd4'], { fen: DEFAULT_POSITION }),
  n('e4', 'e4', ['e5', 'c5']), n('e5', 'e5', ['Nf3', 'Bc4']), n('Nf3', 'Nf3'), n('Bc4', 'Bc4'),
  n('c5', 'c5'),
  n('d4', 'd4', ['d5']), n('d5', 'd5'),
);

describe('findReplyConflicts', () => {
  it('lists positions where the repertoire has more than one reply on its own move', () => {
    expect(findReplyConflicts([rep('w', 'white')], nodes)).toEqual([
      { repertoireId: 'w', repertoireName: 'Rep w', nodeId: 'root', line: 'Start position', replies: [{ id: 'e4', move: 'e4' }, { id: 'd4', move: 'd4' }] },
      { repertoireId: 'w', repertoireName: 'Rep w', nodeId: 'e5', line: '1. e4 e5', replies: [{ id: 'Nf3', move: 'Nf3' }, { id: 'Bc4', move: 'Bc4' }] },
    ]);
  });

  it('allows several replies on the opponent\'s move', () => {
    // the same graph seen as a black repertoire: White's 1.e4 / 1.d4 and 2.Nf3 / 2.Bc4 are fine,
    // but 1...e5 / 1...c5 are now two replies on Black's own move
    expect(findReplyConflicts([rep('b', 'black')], nodes).map(c => [c.nodeId, c.line])).toEqual([['e4', '1. e4']]);
  });

  it('reads chessgraph childIds and survives cycles', () => {
    const looped = {
      root: { id: 'root', parentId: null, move: null, childIDs: [], childIds: ['a', 'b'] } as unknown as Node,
      a: n('a', 'e4', ['root']), b: n('b', 'd4'),
    };
    expect(findReplyConflicts([rep('w', 'white')], looped).map(c => c.nodeId)).toEqual(['root']);
  });
});

describe('keepReplies', () => {
  it('keeps the chosen reply and removes the other branches with everything under them', () => {
    const kept = keepReplies(nodes, [rep('w', 'white')], { root: 'e4', e5: 'Bc4' });
    expect(kept.root.childIDs).toEqual(['e4']);
    expect(kept.e5.childIDs).toEqual(['Bc4']);
    expect(Object.keys(kept).sort()).toEqual(['Bc4', 'c5', 'e4', 'e5', 'root']);
    // the input isn't changed
    expect(nodes.root.childIDs).toEqual(['e4', 'd4']);
  });

  it('keeps a removed branch\'s node if another repertoire still reaches it', () => {
    const shared = graph(
      n('root', null, ['e4', 'd4']), n('e4', 'e4'), n('d4', 'd4'),
      n('root2', null, ['d4']),
    );
    const kept = keepReplies(shared, [rep('w', 'white'), rep('x', 'black', 'root2')], { root: 'e4' });
    expect(Object.keys(kept).sort()).toEqual(['d4', 'e4', 'root', 'root2']);
  });
});
