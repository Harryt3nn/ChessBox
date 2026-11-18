/*apps/desktop/src/components/board/EngineLines.tsx*/

import { formatScore, uciToSan, whiteScore, type EngineLine } from '../../engine/uci';
import { numberedLine } from '../../chess/analysisTree';
import styles from './EngineLines.module.css';

// engine header (on/off, depth) and its best lines as numbered SAN, Lichess style

interface EngineLinesProps {
  fen: string;
  lines: EngineLine[];
  enabled: boolean;
  onToggle: () => void;
}

const SHOWN_MOVES = 12;

export function EngineLines({ fen, lines, enabled, onToggle }: EngineLinesProps) {
  const depth = lines[0]?.depth;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`} onClick={onToggle} title="Engine on/off">
          <span className={styles.knob} />
        </button>
        <span className={styles.name}>Stockfish 18 lite</span>
        {enabled && <span className={styles.depth}>{depth ? `depth ${depth}` : 'starting…'}</span>}
      </div>

      {enabled && lines.map(line => {
        const score = whiteScore(line.score, fen);
        return (
          <div key={line.multipv} className={styles.line}>
            <span className={`${styles.score} ${score.value < 0 ? styles.scoreBlack : ''}`}>{formatScore(score)}</span>
            <span className={styles.moves}>{numberedLine(fen, uciToSan(fen, line.pv.slice(0, SHOWN_MOVES)))}</span>
          </div>
        );
      })}
    </div>
  );
}
