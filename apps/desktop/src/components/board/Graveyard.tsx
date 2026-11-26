/*apps/desktop/src/components/board/Graveyard.tsx*/

import type { PieceSymbol } from 'chess.js';
import styles from './Graveyard.module.css';

// one side's captured pieces, Lichess style but in letters ("Q R 2N 3P"), with the material lead after them.
// Letters, not chess glyphs: Harry's rule is no symbol-like icons (D45)

const LETTER: Record<PieceSymbol, string> = { q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P', k: 'K' };
const NAME: Record<PieceSymbol, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn', k: 'king' };

export interface CapturedGroup { piece: PieceSymbol; count: number }

/** counts each piece type, in the order the types first appear */
export function groupCaptured(pieces: PieceSymbol[]): CapturedGroup[] {
  const counts = new Map<PieceSymbol, number>();
  for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([piece, count]) => ({ piece, count }));
}

/** what a screen reader hears, e.g. "Captured: queen, 2 knights, 3 pawns" */
export function capturedLabel(groups: CapturedGroup[]): string {
  return `Captured: ${groups.map(g => (g.count === 1 ? NAME[g.piece] : `${g.count} ${NAME[g.piece]}s`)).join(', ')}`;
}

interface GraveyardProps {
  pieces: PieceSymbol[];
  // colour of the captured pieces (the opponent of whoever took them)
  pieceColor: 'w' | 'b';
  // material lead of the capturing side, shown only when positive
  lead: number;
}

export function Graveyard({ pieces, pieceColor, lead }: GraveyardProps) {
  const groups = groupCaptured(pieces);

  return (
    <div className={styles.graveyard}>
      {groups.length > 0 && (
        <span className={pieceColor === 'w' ? styles.white : styles.black} role="img" aria-label={capturedLabel(groups)}>
          {groups.map(g => `${g.count > 1 ? g.count : ''}${LETTER[g.piece]}`).join(' ')}
        </span>
      )}
      {lead > 0 && <span className={styles.lead}>+{lead}</span>}
    </div>
  );
}
