/*apps/desktop/src/chess/repertoireTree.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { MoveNode } from '../types/moveNode';
import type { GameTree } from '../types/gameTree';
import { createTree, numberedLine } from './analysisTree';

// turns a repertoire graph (nodes.json) into the analysis board's move tree.
// Tree edges become moves; a transposition (or any node reached a second time) becomes a leaf move
// whose comment names the line it joins, so the tree stays finite and the same size as the graph.

type RawNode = { id: string; childIDs?: unknown; childIds?: unknown; children?: unknown };

// own keys only, so an id like "constructor" never finds Object.prototype
const lookup = (nodes: Record<string, Node>, id: string): Node | undefined =>
  Object.prototype.hasOwnProperty.call(nodes, id) ? nodes[id] : undefined;

/** a node's child ids; files saved before the import sanitiser still use chessgraph's childIds / children */
export function childrenOf(node: RawNode): string[] {
  for (const list of [node.childIDs, node.childIds, node.children]) {
    if (Array.isArray(list) && list.length > 0) return list.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

function play(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return chess.fen();
  } catch {
    return null;
  }
}

interface Step {
  graphId: string;
  parent: MoveNode;
  // SAN moves from the root to `parent`
  line: string[];
}

export function repertoireToTree(rootId: string, nodes: Record<string, Node>, headers?: Record<string, string>): { tree: GameTree; skipped: number } {
  const root = lookup(nodes, rootId);
  if (!root) throw new Error('This repertoire has no starting position.');

  const tree = createTree(root.fen ?? DEFAULT_POSITION, headers);
  const lineTo = new Map<string, string[]>([[rootId, []]]);
  const leaves: { leaf: MoveNode; targetId: string }[] = [];
  let skipped = 0;

  const addLeaf = (parent: MoveNode, move: string, targetId: string) => {
    const fen = play(parent.fen, move);
    if (!fen) return skipped++;
    const leaf: MoveNode = { id: `${parent.id}>${targetId}#${leaves.length}`, move, fen, children: [] };
    parent.children.push(leaf);
    leaves.push({ leaf, targetId });
  };

  // children are pushed in reverse so the first child (the main line) is walked first
  const stack: Step[] = childrenOf(root).reverse().map(id => ({ graphId: id, parent: tree.root, line: [] }));
  for (const edge of root.transpositionEdges ?? []) addLeaf(tree.root, edge.move, edge.targetId);

  while (stack.length > 0) {
    const { graphId, parent, line } = stack.pop() as Step;
    const node = lookup(nodes, graphId);
    if (!node?.move) {
      skipped++;
      continue;
    }
    if (lineTo.has(graphId)) {
      addLeaf(parent, node.move, graphId);
      continue;
    }

    const fen = play(parent.fen, node.move);
    if (!fen) {
      skipped++;
      continue;
    }
    const move: MoveNode = { id: graphId, move: node.move, fen, children: [] };
    if (node.comment) move.comment = node.comment;
    parent.children.push(move);

    const nodeLine = [...line, node.move];
    lineTo.set(graphId, nodeLine);
    for (const edge of node.transpositionEdges ?? []) addLeaf(move, edge.move, edge.targetId);
    for (const childId of childrenOf(node).reverse()) stack.push({ graphId: childId, parent: move, line: nodeLine });
  }

  // targets can be walked after the edge that points at them, so the comments are written last
  for (const { leaf, targetId } of leaves) {
    const target = lineTo.get(targetId);
    leaf.comment = target ? `Transposes to ${numberedLine(tree.root.fen, target)}` : 'Transposes to a missing position';
  }

  return { tree, skipped };
}
