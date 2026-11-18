/*apps/desktop/src/novelty/walk.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import { childrenOf } from '../chess/repertoireTree';

// walks one game down the repertoire the user picked (D15), ply by ply, and stops at the first surprise:
//  - deviation: on the user's move, something other than the one prepared reply (D17)
//  - novelty:   the opponent plays a move the repertoire doesn't cover, or the line has ended
// Moves are compared by the position they reach, and transposition edges are followed (D1).

export interface MatchedMove {
  ply: number; // 1 = first move of the game
  san: string;
  nodeId: string;
}

export type WalkOutcome =
  | { kind: 'complete' } // the game ended while still inside the repertoire
  | { kind: 'deviation'; ply: number; san: string; expected: string; nodeId: string }
  | { kind: 'novelty'; reason: 'opponent-move' | 'end-of-line'; ply: number; san: string; nodeId: string }
  | { kind: 'different-start' }
  | { kind: 'invalid-game'; ply: number; san: string };

export interface WalkResult {
  matched: MatchedMove[];
  outcome: WalkOutcome;
}

const lookup = (nodes: Record<string, Node>, id: string): Node | undefined =>
  Object.prototype.hasOwnProperty.call(nodes, id) ? nodes[id] : undefined;

// placement, side to move, castling, en passant: the same position whatever the move counters say
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

/** the position `san` reaches from the board's position, with the move in standard SAN; the board is left as it was */
function tryMove(board: Chess, san: string): { key: string; san: string } | null {
  try {
    const move = board.move(san);
    const key = positionKey(board.fen());
    board.undo();
    return { key, san: move.san };
  } catch {
    return null;
  }
}

export function walkGame(startFen: string, moves: string[], rootId: string, nodes: Record<string, Node>, userSide: 'white' | 'black'): WalkResult {
  const root = lookup(nodes, rootId);
  if (!root) throw new Error('This repertoire has no starting position.');
  if (positionKey(startFen) !== positionKey(root.fen ?? DEFAULT_POSITION)) return { matched: [], outcome: { kind: 'different-start' } };

  const game = new Chess(startFen);
  const matched: MatchedMove[] = [];
  let node = root;

  for (let i = 0; i < moves.length; i++) {
    const ply = i + 1;

    // the repertoire's moves from here: its children, then its transposition links
    const options = [
      ...childrenOf(node).map(id => ({ id, move: lookup(nodes, id)?.move })),
      ...(node.transpositionEdges ?? []).map(e => ({ id: e.targetId, move: e.move })),
    ].flatMap(o => {
      const target = lookup(nodes, o.id);
      const result = o.move && target ? tryMove(game, o.move) : null;
      return result ? [{ target, ...result }] : [];
    });

    let played;
    try {
      played = game.move(moves[i]);
    } catch {
      return { matched, outcome: { kind: 'invalid-game', ply, san: moves[i] } };
    }
    const reached = positionKey(game.fen());

    const match = options.find(o => o.key === reached);
    if (match) {
      matched.push({ ply, san: played.san, nodeId: match.target.id });
      node = match.target;
      continue;
    }

    if (options.length === 0) {
      return { matched, outcome: { kind: 'novelty', reason: 'end-of-line', ply, san: played.san, nodeId: node.id } };
    }
    if (played.color === userSide[0]) {
      return { matched, outcome: { kind: 'deviation', ply, san: played.san, expected: options[0].san, nodeId: node.id } };
    }
    return { matched, outcome: { kind: 'novelty', reason: 'opponent-move', ply, san: played.san, nodeId: node.id } };
  }

  return { matched, outcome: { kind: 'complete' } };
}
