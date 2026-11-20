import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import { deleteBranch, layoutRepertoire, newRepertoire } from './graph';

const n = (id: string, move: string | null, kids: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id, parentId: null, move, childIDs: kids, ...extra });
const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));

// 1.e4 e5 2.Nf3 and 1.e4 c5, with 1...c5 linking back to the 1...e5 position as a transposition (just for the test)
const nodes = graph(
  n('root', null, ['e4'], { fen: DEFAULT_POSITION }),
  n('e4', 'e4', ['e5', 'c5'], { parentId: 'root' }),
  n('e5', 'e5', ['Nf3'], { parentId: 'e4', comment: 'main line' }),
  n('Nf3', 'Nf3', [], { parentId: 'e5' }),
  n('c5', 'c5', [], { parentId: 'e4', transpositionEdges: [{ targetId: 'Nf3', move: 'Nf3' }] }),
);

describe('layoutRepertoire', () => {
  it('lays the graph out top-down with numbered move labels', () => {
    const { nodes: flow } = layoutRepertoire('root', nodes);
    const byId = Object.fromEntries(flow.map(f => [f.id, f]));

    expect(flow.map(f => f.data.label).sort()).toEqual(['1. e4', '1... c5', '1... e5', '2. Nf3', 'Start']);
    expect(byId.e5.data.comment).toBe('main line');
    expect(byId.root.position.y).toBeLessThan(byId.e4.position.y);
    expect(byId.e4.position.y).toBeLessThan(byId.e5.position.y);
    expect(byId.e5.position.y).toBe(byId.c5.position.y);
    expect(byId.e5.position.x).not.toBe(byId.c5.position.x);
  });

  it('draws child links solid and transpositions dashed', () => {
    const { edges } = layoutRepertoire('root', nodes);
    expect(edges.filter(e => !e.data.transposition).map(e => e.id).sort()).toEqual(['e4->c5', 'e4->e5', 'e5->Nf3', 'root->e4']);
    expect(edges.filter(e => e.data.transposition)).toEqual([
      expect.objectContaining({ source: 'c5', target: 'Nf3', label: 'Nf3', data: { transposition: true } }),
    ]);
  });

  it('only shows what the root reaches, reading chessgraph childIds, and survives cycles', () => {
    const odd = { ...nodes, root: { id: 'root', parentId: null, move: null, childIDs: [], childIds: ['e4'] } as unknown as Node, stray: n('stray', 'a4'), Nf3: n('Nf3', 'Nf3', ['e4']) };
    const { nodes: flow } = layoutRepertoire('root', odd);
    expect(flow.map(f => f.id).sort()).toEqual(['Nf3', 'c5', 'e4', 'e5', 'root']);
  });

  it('hides everything under a collapsed position and says how many it hides', () => {
    const { nodes: flow, edges } = layoutRepertoire('root', nodes, new Set(['e4']));
    expect(flow.map(f => f.id).sort()).toEqual(['e4', 'root']);
    expect(flow.find(f => f.id === 'e4')?.data).toMatchObject({ children: 2, hidden: 3 });
    expect(edges.map(e => e.id)).toEqual(['root->e4']);
  });

  it('keeps a transposition target that is still reachable, and drops links into hidden positions', () => {
    const { nodes: flow, edges } = layoutRepertoire('root', nodes, new Set(['e5']));
    expect(flow.map(f => f.id).sort()).toEqual(['c5', 'e4', 'e5', 'root']);
    expect(flow.find(f => f.id === 'e5')?.data.hidden).toBe(1);
    expect(edges.some(e => e.data.transposition)).toBe(false);
  });

  it('ignores a collapsed leaf or an unknown id', () => {
    const { nodes: flow } = layoutRepertoire('root', nodes, new Set(['Nf3', 'nope']));
    expect(flow).toHaveLength(5);
    expect(flow.find(f => f.id === 'Nf3')?.data).toEqual(expect.objectContaining({ children: 0 }));
    expect(flow.find(f => f.id === 'Nf3')?.data.hidden).toBeUndefined();
  });
});

describe('deleteBranch', () => {
  it('removes a node and everything under it, unlinking it from its parent and from transpositions', () => {
    const { patch, removed } = deleteBranch(nodes, 'root', 'e5');
    expect(removed.sort()).toEqual(['Nf3', 'e5']);
    expect(patch.e4.childIDs).toEqual(['c5']);
    expect(patch.c5.transpositionEdges).toBeUndefined();
    expect(Object.keys(patch).sort()).toEqual(['c5', 'e4']);
  });

  it('refuses to delete the starting position', () => {
    expect(() => deleteBranch(nodes, 'root', 'root')).toThrow();
  });
});

describe('newRepertoire', () => {
  it('makes a repertoire with an empty starting position', () => {
    const { repertoire, root } = newRepertoire('Sicilian', 'black', null, 1000);
    expect(repertoire).toMatchObject({ name: 'Sicilian', side: 'black', folderId: null, rootNodeId: root.id, createdAt: 1000, updatedAt: 1000 });
    expect(root).toEqual({ id: root.id, repertoireId: repertoire.id, parentId: null, move: null, fen: DEFAULT_POSITION, childIDs: [] });
    expect(repertoire.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
});
