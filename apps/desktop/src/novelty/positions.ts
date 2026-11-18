/*apps/desktop/src/novelty/positions.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';

/** the positions just before and after a finding's move, from the moves that led to it; null if they don't replay */
export function findingPositions(line: string[], move: string, startFen = DEFAULT_POSITION): { before: string; after: string } | null {
  const chess = new Chess(startFen);
  try {
    for (const san of line) chess.move(san);
    const before = chess.fen();
    chess.move(move);
    return { before, after: chess.fen() };
  } catch {
    return null;
  }
}
