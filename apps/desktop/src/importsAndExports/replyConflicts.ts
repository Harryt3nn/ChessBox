/*apps/desktop/src/importsAndExports/replyConflicts.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { childrenOf, reachableIds } from '../chess/repertoireTree';
import { numberedLine } from '../chess/analysisTree';

// one prepared reply per position on the repertoire's own move (D17). Files from chessgraph can
// have several; the import modal lists them so the user keeps one and the other branches are dropped.

export interface ReplyConflict {
  repertoireId: string;
  repertoireName: string;
  nodeId: string;
  line: string; // the moves leading to the position, for the user to recognise it
  replies: { id: string; move: string }[];
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

export function findReplyConflicts(repertoires: Repertoire[], nodes: Record<string, Node>): ReplyConflict[] {
  const conflicts: ReplyConflict[] = [];

  for (const rep of repertoires) {
    const root = lookup(nodes, rep.rootNodeId);
    if (!root) continue;
    const rootFen = root.fen ?? DEFAULT_POSITION;
    const ownSide = rep.side === 'white' ? 'w' : 'b';
    const seen = new Set<string>();
    const stack: { id: string; fen: string; line: string[] }[] = [{ id: root.id, fen: rootFen, line: [] }];

    while (stack.length > 0) {
      const { id, fen, line } = stack.pop() as (typeof stack)[number];
      if (seen.has(id)) continue;
      seen.add(id);

      const children = childrenOf(lookup(nodes, id) as Node).flatMap(childId => {
        const child = lookup(nodes, childId);
        const next = child?.move ? play(fen, child.move) : null;
        return child?.move && next ? [{ id: childId, move: child.move, fen: next }] : [];
      });

      if (fen.split(' ')[1] === ownSide && children.length > 1) {
        conflicts.push({
          repertoireId: rep.id,
          repertoireName: rep.name,
          nodeId: id,
          line: line.length ? numberedLine(rootFen, line) : 'Start position',
          replies: children.map(c => ({ id: c.id, move: c.move })),
        });
      }
      // reversed so the first child (the main line) is walked first
      for (const c of [...children].reverse()) stack.push({ id: c.id, fen: c.fen, line: [...line, c.move] });
    }
  }

  return conflicts;
}

/**
 * a copy of `nodes` where each position in `choices` keeps only the chosen reply. The dropped branches
 * are removed too, unless some repertoire still reaches them another way.
 */
export function keepReplies(nodes: Record<string, Node>, repertoires: Repertoire[], choices: Record<string, string>): Record<string, Node> {
  const out: Record<string, Node> = { ...nodes };
  const dropped: string[] = [];

  for (const [nodeId, keep] of Object.entries(choices)) {
    const node = lookup(nodes, nodeId);
    if (!node) continue;
    const children = childrenOf(node);
    dropped.push(...children.filter(id => id !== keep));
    const copy: Record<string, unknown> = { ...node, childIDs: children.filter(id => id === keep) };
    delete copy.childIds;
    delete copy.children;
    out[nodeId] = copy as unknown as Node;
  }

  const reachable = reachableIds(repertoires.map(r => r.rootNodeId), out, true);
  for (const id of reachableIds(dropped, nodes, false)) {
    if (!reachable.has(id)) delete out[id];
  }
  return out;
}
