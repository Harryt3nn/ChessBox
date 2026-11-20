/*apps/desktop/src/builder/graph.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import { Graph, layout } from '@dagrejs/dagre';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { childrenOf } from '../chess/repertoireTree';
import { plyInfo } from '../chess/analysisTree';
import { normalised } from '../chess/repertoireEdits';

// pure helpers behind the repertoire builder (M5): lay the graph out for React Flow, delete a branch,
// start a new repertoire. Saving goes through the same node patches as the board.

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 44;

export interface BuilderNode {
  id: string;
  position: { x: number; y: number };
  // children = positions directly after this one; hidden = how many positions its collapse hides
  data: { label: string; comment?: string; fen: string; children: number; hidden?: number };
}

export interface BuilderEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data: { transposition: boolean };
}

const lookup = (nodes: Record<string, Node>, id: string): Node | undefined =>
  Object.prototype.hasOwnProperty.call(nodes, id) ? nodes[id] : undefined;

function play(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return chess.fen();
  } catch {
    return null;
  }
}

/** every node the root reaches (each once) without passing through a collapsed one, with its position and ply */
function reachable(rootId: string, nodes: Record<string, Node>, collapsed: ReadonlySet<string> = new Set()) {
  const root = lookup(nodes, rootId);
  if (!root) throw new Error('This repertoire has no starting position.');
  const rootFen = root.fen ?? DEFAULT_POSITION;
  const found = new Map<string, { node: Node; fen: string; ply: number }>([[rootId, { node: root, fen: rootFen, ply: 0 }]]);
  const stack = [rootId];

  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    const { node, fen, ply } = found.get(id) as { node: Node; fen: string; ply: number };
    if (collapsed.has(id)) continue;
    for (const childId of childrenOf(node)) {
      const child = lookup(nodes, childId);
      const childFen = child?.move ? play(fen, child.move) : null;
      if (!child || !childFen || found.has(childId)) continue;
      found.set(childId, { node: child, fen: childFen, ply: ply + 1 });
      stack.push(childId);
    }
  }
  return { found, rootFen };
}

/** how many positions under `id` are hidden: reachable in full, but not shown (another path may still show some) */
function hiddenUnder(id: string, nodes: Record<string, Node>, shown: ReadonlyMap<string, unknown>): number {
  const seen = new Set<string>();
  const stack = childrenOf(nodes[id]);
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const node = lookup(nodes, next);
    if (!node || seen.has(next) || shown.has(next)) continue;
    seen.add(next);
    stack.push(...childrenOf(node));
  }
  return seen.size;
}

export function layoutRepertoire(
  rootId: string,
  nodes: Record<string, Node>,
  collapsed: ReadonlySet<string> = new Set(),
): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const { found, rootFen } = reachable(rootId, nodes, collapsed);
  const edges: BuilderEdge[] = [];

  for (const [id, { node }] of found) {
    for (const childId of childrenOf(node)) {
      if (found.has(childId)) edges.push({ id: `${id}->${childId}`, source: id, target: childId, data: { transposition: false } });
    }
    for (const t of node.transpositionEdges ?? []) {
      if (found.has(t.targetId)) edges.push({ id: `${id}~>${t.targetId}`, source: id, target: t.targetId, label: t.move, data: { transposition: true } });
    }
  }

  // dagre ranks by the tree edges only; transpositions would pull nodes out of their move's row
  const g = new Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 56 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of found.keys()) g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) if (!e.data.transposition) g.setEdge(e.source, e.target);
  layout(g);

  const flowNodes = [...found.entries()].map(([id, { node, fen, ply }]) => {
    const { x, y } = g.node(id);
    const { moveNumber, isWhite } = plyInfo(rootFen, ply);
    const label = ply === 0 ? 'Start' : `${moveNumber}${isWhite ? '.' : '...'} ${node.move}`;
    const children = childrenOf(node).filter(c => lookup(nodes, c)).length;
    return {
      id,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        label,
        fen,
        children,
        ...(node.comment ? { comment: node.comment } : {}),
        ...(collapsed.has(id) && children ? { hidden: hiddenUnder(id, nodes, found) } : {}),
      },
    };
  });

  return { nodes: flowNodes, edges };
}

/** the patch (changed parents / linking nodes) and ids to remove when deleting `nodeId` and everything under it */
export function deleteBranch(nodes: Record<string, Node>, rootId: string, nodeId: string): { patch: Record<string, Node>; removed: string[] } {
  if (nodeId === rootId) throw new Error("The starting position can't be deleted.");

  const removed = new Set<string>();
  const stack = [nodeId];
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    const node = lookup(nodes, id);
    if (!node || removed.has(id)) continue;
    removed.add(id);
    stack.push(...childrenOf(node));
  }

  const patch: Record<string, Node> = {};
  for (const node of Object.values(nodes)) {
    if (removed.has(node.id)) continue;
    const children = childrenOf(node);
    const keptChildren = children.filter(id => !removed.has(id));
    const edges = node.transpositionEdges ?? [];
    const keptEdges = edges.filter(e => !removed.has(e.targetId));
    if (keptChildren.length === children.length && keptEdges.length === edges.length) continue;

    const copy: Node = { ...normalised(node), childIDs: keptChildren };
    if (keptEdges.length) copy.transpositionEdges = keptEdges;
    else delete copy.transpositionEdges;
    patch[node.id] = copy;
  }

  return { patch, removed: [...removed] };
}

export function newRepertoire(name: string, side: 'white' | 'black', folderId: string | null, now = Date.now()): { repertoire: Repertoire; root: Node } {
  const id = crypto.randomUUID();
  const rootId = crypto.randomUUID();
  return {
    repertoire: { id, name, side, rootNodeId: rootId, folderId, createdAt: now, updatedAt: now },
    root: { id: rootId, repertoireId: id, parentId: null, move: null, fen: DEFAULT_POSITION, childIDs: [] },
  };
}
