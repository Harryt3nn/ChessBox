/*apps/desktop/src/chess/material.ts*/

import { Chess, type PieceSymbol } from 'chess.js';

// captured pieces and material count for the board's graveyard

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const byValue = (a: PieceSymbol, b: PieceSymbol) => VALUE[b] - VALUE[a];

/**
 * pieces taken along `moves` (SAN) from `rootFen`, most valuable first.
 * Replaying the moves (rather than diffing the board) gets promotions and custom starts right.
 */
export function capturedPieces(rootFen: string, moves: string[]): { byWhite: PieceSymbol[]; byBlack: PieceSymbol[] } {
  const chess = new Chess(rootFen);
  const byWhite: PieceSymbol[] = [];
  const byBlack: PieceSymbol[] = [];

  for (const san of moves) {
    let move;
    try {
      move = chess.move(san);
    } catch {
      break;
    }
    if (move.captured) (move.color === 'w' ? byWhite : byBlack).push(move.captured);
  }

  return { byWhite: byWhite.sort(byValue), byBlack: byBlack.sort(byValue) };
}

/** White's material minus Black's, in pawns */
export function materialBalance(fen: string): number {
  let balance = 0;
  for (const row of new Chess(fen).board()) {
    for (const sq of row) {
      if (sq) balance += sq.color === 'w' ? VALUE[sq.type] : -VALUE[sq.type];
    }
  }
  return balance;
}
