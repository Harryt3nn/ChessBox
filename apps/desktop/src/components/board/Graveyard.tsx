/*apps/desktop/src/components/board/Graveyard.tsx*/

import type { PieceSymbol } from 'chess.js';
import styles from './Graveyard.module.css';

// one side's captured pieces, Lichess style: grouped by type, with the material lead after them

const GLYPH: Record<PieceSymbol, string> = { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟', k: '♚' };

interface GraveyardProps {
  pieces: PieceSymbol[];
  // colour of the captured pieces (the opponent of whoever took them)
  pieceColor: 'w' | 'b';
  // material lead of the capturing side, shown only when positive
  lead: number;
}

export function Graveyard({ pieces, pieceColor, lead }: GraveyardProps) {
  return (
    <div className={styles.graveyard}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`${styles.piece} ${pieceColor === 'w' ? styles.white : styles.black} ${pieces[i - 1] === p ? styles.stacked : ''}`}
        >
          {GLYPH[p]}
        </span>
      ))}
      {lead > 0 && <span className={styles.lead}>+{lead}</span>}
    </div>
  );
}
