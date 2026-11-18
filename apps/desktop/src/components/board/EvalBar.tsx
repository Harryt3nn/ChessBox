/*apps/desktop/src/components/board/EvalBar.tsx*/

import styles from './EvalBar.module.css';

// vertical bar beside the board: White's share fills from White's side of the board

interface EvalBarProps {
  whitePercent: number; // 0–100
  label: string;
  flipped: boolean; // board shown from Black's side
  height: number;
}

export function EvalBar({ whitePercent, label, flipped, height }: EvalBarProps) {
  const whiteAhead = whitePercent >= 50;
  return (
    <div className={`${styles.bar} ${flipped ? styles.flipped : ''}`} style={{ height }} title={label}>
      <div className={styles.white} style={{ height: `${whitePercent}%` }} />
      <span className={`${styles.label} ${whiteAhead ? styles.labelWhite : styles.labelBlack}`}>{label}</span>
    </div>
  );
}
