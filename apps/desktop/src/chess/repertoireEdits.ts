/*apps/desktop/src/chess/repertoireEdits.ts*/

import type { Node } from '../types/Node';
import type { MoveNode } from '../types/moveNode';
import type { GameTree } from '../types/gameTree';
import type { Repertoire } from '../types/Repertoire';
import { plyInfo } from './analysisTree';
import { childrenOf } from './repertoireTree';

// works out what to write back to nodes.json after moves were added to a repertoire on the board
// (the board tree came from repertoireToTree, so existing moves keep their graph node ids).
//  - a new move becomes a new node under its parent
//  - one prepared reply per position on the repertoire's own move (D17): a second one is refused
//  - a move that reaches a position the repertoire already has becomes a transposition edge (D1)

export interface RepertoireEdits {
  // nodes to write: new ones, and existing ones whose children or edges changed
  patch: Record<string, Node>;
  added: number;
  transpositions: number;
  // one readable line per move that wasn't saved
  rejected: string[];
}

const own = (nodes: Record<string, Node>, id: string): Node | undefined =>
  Object.prototype.hasOwnProperty.call(nodes, id) ? nodes[id] : undefined;

// placement, side to move, castling, en passant: the same position whatever the move counters say
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

// transposition leaves from repertoireToTree have ids like "parent>target#n"
const isTranspositionLeaf = (move: MoveNode) => move.id.includes('>');

/** a node with its children under childIDs only (older files use chessgraph's childIds / children) */
export function normalised(node: Node): Node {
  const copy: Record<string, unknown> = { ...node, childIDs: childrenOf(node) };
  delete copy.childIds;
  delete copy.children;
  return copy as unknown as Node;
}

interface Step {
  move: MoveNode;
  // graph id this board node stands for
  graphId: string;
  ply: number;
}

export function collectRepertoireEdits(tree: GameTree, repertoire: Repertoire, nodes: Record<string, Node>): RepertoireEdits {
  const rootFen = tree.root.fen;
  const ownSide = repertoire.side === 'white' ? 'w' : 'b';
  const patch: Record<string, Node> = {};
  const rejected: string[] = [];
  let added = 0;
  let transpositions = 0;

  const label = (san: string, ply: number) => {
    const { moveNumber, isWhite } = plyInfo(rootFen, ply);
    return `${moveNumber}${isWhite ? '.' : '...'} ${san}`;
  };
  const current = (id: string): Node | undefined => patch[id] ?? own(nodes, id);
  const editable = (id: string): Node => (patch[id] ??= normalised(own(nodes, id) as Node));

  // every position the repertoire already reaches, from the board's view of it
  const positions = new Map<string, string>();
  const walk: MoveNode[] = [tree.root];
  positions.set(positionKey(rootFen), repertoire.rootNodeId);
  for (let m = walk.pop(); m; m = walk.pop()) {
    for (const child of m.children) {
      if (own(nodes, child.id)) {
        if (!positions.has(positionKey(child.fen))) positions.set(positionKey(child.fen), child.id);
        walk.push(child);
      }
    }
  }

  const rejectSubtree = (move: MoveNode, ply: number, reason: string) => rejected.push(`${label(move.move, ply)}: ${reason}`);

  const stack: Step[] = [{ move: tree.root, graphId: repertoire.rootNodeId, ply: 0 }];
  while (stack.length > 0) {
    const { move, graphId, ply } = stack.pop() as Step;

    for (const child of move.children) {
      const childPly = ply + 1;

      if (own(nodes, child.id)) {
        stack.push({ move: child, graphId: child.id, ply: childPly });
        continue;
      }
      if (isTranspositionLeaf(child)) {
        for (const after of child.children) rejectSubtree(after, childPly + 1, 'continue from the line this transposes to instead');
        continue;
      }

      const parent = current(graphId) as Node;
      if (move.fen.split(' ')[1] === ownSide) {
        const reply = childrenOf(parent).map(id => current(id)?.move).find(Boolean) ?? parent.transpositionEdges?.[0]?.move;
        if (reply) {
          rejectSubtree(child, childPly, `the repertoire already answers this position with ${label(reply, childPly)}`);
          continue;
        }
      }

      const target = positions.get(positionKey(child.fen));
      if (target) {
        const edited = editable(graphId);
        edited.transpositionEdges = [...(edited.transpositionEdges ?? []), { targetId: target, move: child.move }];
        transpositions++;
        for (const after of child.children) rejectSubtree(after, childPly + 1, 'continue from the line this transposes to instead');
        continue;
      }

      patch[child.id] = { id: child.id, repertoireId: repertoire.id, parentId: graphId, move: child.move, fen: child.fen, childIDs: [] };
      editable(graphId).childIDs.push(child.id);
      positions.set(positionKey(child.fen), child.id);
      added++;
      stack.push({ move: child, graphId: child.id, ply: childPly });
    }
  }

  return { patch, added, transpositions, rejected };
}
