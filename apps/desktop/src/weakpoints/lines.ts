/*apps/desktop/src/weakpoints/lines.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { childrenOf } from '../chess/repertoireTree';

// the chess side of WeakPoints: lines through a repertoire, its branches (D40) and random drills (D41).
// No FSRS here, so the window can build random drills itself (D37) without bundling ts-fsrs (D32).

// (TUNE) D34, D39
export const LEAD_IN_MOVES = 2;
export const EARLY_MOVES = 2;

export type DrillSource = 'deviation' | 'rare' | 'strong' | 'random';

export interface Drill {
  nodeId: string | null; // the card being graded; null for a random drill, which saves nothing
  source: DrillSource;
  startFen: string;
  userSide: 'white' | 'black';
  line: string[]; // SAN from the repertoire's start: set-up moves, then the moves played out
  from: number; // moves before this index are set up silently
  scoredFrom: number; // your moves at or after this index count; earlier ones are a forgiven lead-in
}

export const has = (record: Record<string, unknown>, id: string) => Object.prototype.hasOwnProperty.call(record, id);

/** the repertoire's moves from a node, in the walk's order: children first, then transposition links */
export function movesFrom(nodes: Record<string, Node>, node: Node): { id: string; move: string }[] {
  return [
    ...childrenOf(node).map(id => ({ id, move: has(nodes, id) ? nodes[id].move : null })),
    ...(node.transpositionEdges ?? []).map(e => ({ id: e.targetId, move: e.move })),
  ].filter((o): o is { id: string; move: string } => !!o.move && has(nodes, o.id));
}

export type YourPosition = { startFen: string; moves: string[]; answer: string };

export interface LineReader {
  startFen: string;
  /** the position after a node, and the standard-SAN moves to it along its parents; null if the chain is broken */
  lineTo: (nodeId: string | null) => { fen: string; moves: string[] } | null;
  /** a position you must answer, with your prepared reply; null if it isn't your move or has no reply */
  position: (nodeId: string) => YourPosition | null;
}

/** each node's line is built from its parent's and kept, so every node is replayed once however many share its path */
export function lineReader(rep: Repertoire, nodes: Record<string, Node>): LineReader {
  const startFen = (has(nodes, rep.rootNodeId) ? nodes[rep.rootNodeId].fen : undefined) ?? DEFAULT_POSITION;
  const lines = new Map<string, { fen: string; moves: string[] } | null>();
  const visiting = new Set<string>();

  const lineTo = (id: string | null): { fen: string; moves: string[] } | null => {
    if (id === null || !has(nodes, id)) return null;
    if (id === rep.rootNodeId) return { fen: startFen, moves: [] };
    const cached = lines.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return null; // a parent loop never reaches the root
    visiting.add(id);
    const node = nodes[id];
    const parent = node.move ? lineTo(node.parentId) : null;
    let line = null;
    if (parent && node.move) {
      const board = new Chess(parent.fen);
      try {
        const san = board.move(node.move).san;
        line = { fen: board.fen(), moves: [...parent.moves, san] };
      } catch {
        // an illegal move in the repertoire: nothing below it can be drilled
      }
    }
    lines.set(id, line);
    return line;
  };

  const position = (nodeId: string): YourPosition | null => {
    const line = lineTo(nodeId);
    if (!line) return null;
    const board = new Chess(line.fen);
    if (board.turn() !== rep.side[0]) return null;
    const reply = movesFrom(nodes, nodes[nodeId])[0];
    if (!reply) return null;
    try {
      return { startFen, moves: line.moves, answer: board.move(reply.move).san };
    } catch {
      return null;
    }
  };

  return { startFen, lineTo, position };
}

/** a position reached within your first EARLY_MOVES moves: a deviation there means another opening (D39) */
export const isEarly = (moves: string[]) => Math.floor(moves.length / 2) < EARLY_MOVES;

/** is the node under the branch, following main parents (a transposed position belongs to its main parent's branch) */
export function inBranch(nodes: Record<string, Node>, nodeId: string, branchId: string | null): boolean {
  if (branchId === null) return true;
  const seen = new Set<string>();
  for (let id: string | null = nodeId; id !== null && has(nodes, id) && !seen.has(id); id = nodes[id].parentId) {
    if (id === branchId) return true;
    seen.add(id);
  }
  return false;
}

/**
 * the repertoire's main branches (D40): follow the line while it has a single move, and list the
 * moves at the first point where it splits, e.g. 1.e4 → [1...e5, 1...e6, 1...c5]
 */
export function branches(rep: Repertoire, nodes: Record<string, Node>): { nodeId: string; moves: string[] }[] {
  const reader = lineReader(rep, nodes);
  const seen = new Set<string>();
  let node = has(nodes, rep.rootNodeId) ? nodes[rep.rootNodeId] : undefined;
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const next = movesFrom(nodes, node);
    if (next.length > 1) {
      return next.flatMap(o => {
        const line = reader.lineTo(o.id);
        return line ? [{ nodeId: o.id, moves: line.moves }] : [];
      });
    }
    node = next[0] && nodes[next[0].id];
  }
  return [];
}

/** a graded card's drill: a lead-in of LEAD_IN_MOVES of your moves, one ply earlier so the opponent's move is seen (D34) */
export function cardDrill(nodeId: string, source: DrillSource, pos: YourPosition, userSide: 'white' | 'black'): Drill {
  const firstYours = pos.moves.length - 2 * LEAD_IN_MOVES;
  return {
    nodeId, source, startFen: pos.startFen, userSide,
    line: [...pos.moves, pos.answer],
    from: Math.max(0, firstYours - 1),
    scoredFrom: pos.moves.length,
  };
}

/** every position reachable from the root through moves and transposition links */
function reachable(rep: Repertoire, nodes: Record<string, Node>): string[] {
  const seen = new Set<string>();
  const stack = has(nodes, rep.rootNodeId) ? [rep.rootNodeId] : [];
  while (stack.length) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const o of movesFrom(nodes, nodes[id])) stack.push(o.id);
  }
  return [...seen];
}

/**
 * random drills (D41): start at a random position where it's your move, then you play your next
 * `yourMoves` moves while the opponent's replies are picked at random from the repertoire; a drill
 * ends early where the line ends. Distinct starting positions within one call.
 */
export function randomDrills(
  rep: Repertoire, nodes: Record<string, Node>,
  { count, yourMoves, branchId }: { count: number; yourMoves: number; branchId: string | null },
  random: () => number = Math.random,
): Drill[] {
  const reader = lineReader(rep, nodes);
  const starts = reachable(rep, nodes).filter(id => inBranch(nodes, id, branchId) && reader.position(id));

  const drills: Drill[] = [];
  while (drills.length < count && starts.length) {
    const [startId] = starts.splice(Math.floor(random() * starts.length), 1);
    const start = reader.lineTo(startId);
    if (!start) continue;

    const board = new Chess(start.fen);
    const played: string[] = [];
    let node = nodes[startId];
    for (let mine = 0; mine < yourMoves; ) {
      const yourTurn = board.turn() === rep.side[0];
      const next = movesFrom(nodes, node);
      if (!next.length) break;
      const pick = yourTurn ? next[0] : next[Math.floor(random() * next.length)];
      try {
        played.push(board.move(pick.move).san);
      } catch {
        break;
      }
      node = nodes[pick.id];
      if (yourTurn) mine++;
    }

    drills.push({
      nodeId: null, source: 'random', startFen: reader.startFen, userSide: rep.side,
      line: [...start.moves, ...played],
      from: Math.max(0, start.moves.length - 1),
      scoredFrom: start.moves.length,
    });
  }
  return drills;
}
