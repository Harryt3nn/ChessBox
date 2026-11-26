import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { MoveNode } from '../types/moveNode';
import { childrenOf, reachableIds, repertoireToTree } from './repertoireTree';

// a node as saved on disk; older files use chessgraph's childIds / children instead of childIDs
const n = (id: string, move: string | null, kids: string[] = [], extra: Partial<Node> & Record<string, unknown> = {}): Node =>
  ({ id, parentId: null, move, childIDs: kids, ...extra }) as Node;

const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));
const moves = (node: MoveNode): string[] => node.children.map(c => c.move);

describe('childrenOf', () => {
  it('reads childIDs, chessgraph childIds, or children, whichever has entries', () => {
    expect(childrenOf({ id: 'a', childIDs: ['x'] })).toEqual(['x']);
    expect(childrenOf({ id: 'a', childIds: ['y'], children: [] })).toEqual(['y']);
    expect(childrenOf({ id: 'a', childIDs: [], children: ['z'] })).toEqual(['z']);
    expect(childrenOf({ id: 'a' })).toEqual([]);
  });
});

describe('reachableIds', () => {
  // repairGraph only cuts childIDs cycles, so a transposition can still point back up the line
  const nodes = graph(
    n('root', null, ['a']),
    n('a', 'e4', ['b']),
    n('b', 'e5', [], { transpositionEdges: [{ targetId: 'root', move: 'Nf3' }, { targetId: 'other', move: 'd4' }] }),
    n('other', 'd4', ['missing']),
    n('unlinked', 'c4'),
  );

  it('follows transpositions through a cycle and stops, skipping ids with no node', () => {
    expect([...reachableIds(['root'], nodes, true)].sort()).toEqual(['a', 'b', 'other', 'root']);
  });

  it('follows child moves only when transpositions are off', () => {
    expect([...reachableIds(['root'], nodes, false)].sort()).toEqual(['a', 'b', 'root']);
  });

  it('never finds an inherited key such as constructor', () => {
    expect([...reachableIds(['constructor', '__proto__'], nodes, true)]).toEqual([]);
  });
});

describe('repertoireToTree', () => {
  it('builds the move tree with the first child as the main line, keeping comments', () => {
    const nodes = graph(
      n('root', null, ['e4', 'd4'], { fen: DEFAULT_POSITION }),
      n('e4', 'e4', ['e5'], { comment: 'best by test' }),
      n('e5', 'e5'),
      n('d4', 'd4'),
    );
    const { tree, skipped } = repertoireToTree('root', nodes);

    expect(skipped).toBe(0);
    expect(tree.root.fen).toBe(DEFAULT_POSITION);
    expect(moves(tree.root)).toEqual(['e4', 'd4']);
    expect(tree.root.children[0].comment).toBe('best by test');
    expect(moves(tree.root.children[0])).toEqual(['e5']);
    expect(tree.root.children[0].children[0].fen).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    expect(tree.root.children[0].id).toBe('e4');
  });

  it('gives the tree root the repertoire root\'s id, so the start position can be found by id', () => {
    const { tree } = repertoireToTree('root-123', graph(n('root-123', null, ['a']), n('a', 'e4')));
    expect(tree.root.id).toBe('root-123');
  });

  it('accepts chessgraph childIds', () => {
    const nodes = graph({ id: 'root', parentId: null, move: null, childIDs: [], childIds: ['a'] } as unknown as Node, n('a', 'Nf3'));
    expect(moves(repertoireToTree('root', nodes).tree.root)).toEqual(['Nf3']);
  });

  it('starts from the root FEN of a custom position', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const { tree } = repertoireToTree('root', graph(n('root', null, ['a'], { fen }), n('a', 'e4')));
    expect(tree.root.fen).toBe(fen);
    expect(tree.root.children[0].fen.startsWith('4k3/8/8/8/4P3/8/8/4K3 b')).toBe(true);
  });

  it('shows a transposition as a leaf move pointing at the line it joins', () => {
    // 1.e4 e6 2.d4 and 1.d4 e6 2.e4 reach the same position; the second line links to the first
    const nodes = graph(
      n('root', null, ['e4', 'd4']),
      n('e4', 'e4', ['e6']), n('e6', 'e6', ['d4b']), n('d4b', 'd4', ['d5']), n('d5', 'd5'),
      n('d4', 'd4', ['e6b']), n('e6b', 'e6', [], { transpositionEdges: [{ targetId: 'd4b', move: 'e4' }] }),
    );
    const { tree } = repertoireToTree('root', nodes);
    const leaf = tree.root.children[1].children[0].children[0];

    expect(leaf.move).toBe('e4');
    expect(leaf.children).toEqual([]);
    expect(leaf.comment).toBe('Transposes to 1. e4 e6 2. d4');
    expect(leaf.fen).toBe(tree.root.children[0].children[0].children[0].fen);
  });

  it('never loops: a node reached twice becomes a transposition leaf', () => {
    const nodes = graph(n('root', null, ['a']), n('a', 'e4', ['b']), n('b', 'e5', ['a']));
    const { tree } = repertoireToTree('root', nodes);
    const b = tree.root.children[0].children[0];
    expect(b.children).toEqual([]);
  });

  it('skips moves that are illegal or missing, and counts them', () => {
    const nodes = graph(n('root', null, ['a', 'b', 'gone']), n('a', 'e4'), n('b', 'e5'));
    const { tree, skipped } = repertoireToTree('root', nodes);
    expect(moves(tree.root)).toEqual(['e4']);
    expect(skipped).toBe(2);
  });

  it('handles a long line without overflowing the stack', () => {
    const list: Node[] = [n('root', null, ['m0'])];
    const cycle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    for (let i = 0; i < 4000; i++) list.push(n(`m${i}`, cycle[i % 4], i < 3999 ? [`m${i + 1}`] : []));
    const { tree, skipped } = repertoireToTree('root', graph(...list));
    let depth = 0;
    for (let node = tree.root; node.children.length; node = node.children[0]) depth++;
    expect(skipped).toBe(0);
    expect(depth).toBe(4000);
  });

  it('throws for a missing root', () => {
    expect(() => repertoireToTree('nope', {})).toThrow();
  });
});
