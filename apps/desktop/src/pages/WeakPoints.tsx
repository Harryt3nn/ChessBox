/* apps/desktop/src/pages/WeakPoints.tsx */

import { useEffect, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import styles from './WeakPoints.module.css';
import type { Page } from '../types/Page';
import type { Repertoire } from '../types/Repertoire';
import type { Drill } from '../weakpoints/cards';
import type { WeakPointsQueue } from '../Storage/WeakPoints';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';

import weakPointsIcon from '../assets/icons/041-checkmate.png';

interface WeakPointsProps {
  setPage: (page: Page) => void;
}

// opponent moves are played after a short pause so you can see them land
const OPPONENT_DELAY_MS = 450;
const SHOW_ANSWER_MS = 900;
// a card you got wrong comes back in this session if FSRS wants it again within this window
const SAME_SESSION_MS = 30 * 60_000;

const SOURCE_LABEL: Record<Drill['source'], string> = {
  deviation: 'You went wrong here',
  rare: 'A line you rarely reach',
  strong: 'Keeping a strong line fresh',
};

const WeakPoints = ({ setPage }: WeakPointsProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [repertoireId, setRepertoireId] = useState('');
  const [queue, setQueue] = useState<WeakPointsQueue | null>(null);
  const [session, setSession] = useState<{ drills: Drill[]; index: number; right: number; graded: number } | null>(null);

  useEffect(() => {
    storage.loadRepertoires().then(reps => {
      setRepertoires(reps);
      setRepertoireId(id => id || reps[0]?.id || '');
    });
  }, [storage]);

  async function loadQueue(id: string) {
    setQueue(null);
    try {
      const q = await window.api.weakpointsQueue(id);
      if (q.recovered) toast.error("Your WeakPoints file couldn't be read. It was set aside and a fresh schedule started.", { duration: 8000 });
      setQueue(q);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load your drills.");
    }
  }

  useEffect(() => {
    setSession(null);
    if (repertoireId) loadQueue(repertoireId);
  }, [repertoireId]);

  async function onGraded(drill: Drill, correct: boolean) {
    let due = Infinity;
    try {
      due = await window.api.weakpointsGrade(repertoireId, drill.nodeId, correct);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that drill.");
    }
    setSession(s => s && {
      ...s,
      drills: due - Date.now() < SAME_SESSION_MS ? [...s.drills, drill] : s.drills,
      right: s.right + Number(correct),
      graded: s.graded + 1,
    });
  }

  const next = () => setSession(s => s && { ...s, index: s.index + 1 });
  const finish = () => {
    setSession(null);
    loadQueue(repertoireId);
  };

  const current = session?.drills[session.index];

  return (
    <main className="main-content">
      <div className={shared.page}>
        <PageHeader
          icon={weakPointsIcon}
          title="WeakPoints"
          subtitle="Drill the lines you get wrong, revisit the ones you rarely reach, keep the strong ones fresh."
        />

        {!session && (
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Today's Drills</h2>
            </div>
            <div className={styles.row}>
              <select className={styles.select} value={repertoireId} onChange={e => setRepertoireId(e.target.value)}>
                {repertoires.map(r => <option key={r.id} value={r.id}>{r.name} ({r.side})</option>)}
              </select>
              {queue && !queue.noNovelty && (
                <button
                  className={shared.btnPrimary}
                  disabled={queue.drills.length === 0}
                  onClick={() => setSession({ drills: queue.drills, index: 0, right: 0, graded: 0 })}
                >
                  Start
                </button>
              )}
            </div>

            {!repertoireId && <p className={styles.hint}>Make a repertoire first.</p>}
            {queue?.noNovelty && (
              <div className={styles.row}>
                <p className={styles.hint}>Drills come from your games. Run the Novelty Finder on this repertoire first.</p>
                <button className={shared.btnOutline} onClick={() => setPage('novelty')}>Open Novelty Finder</button>
              </div>
            )}
            {queue && !queue.noNovelty && (
              <p className={styles.hint}>
                {queue.drills.length > 0
                  ? `${queue.drills.length} due now · ${queue.cards} card${queue.cards === 1 ? '' : 's'} in total`
                  : queue.cards > 0
                    ? `Nothing due. ${queue.cards} card${queue.cards === 1 ? '' : 's'} scheduled; come back later.`
                    : 'No drills yet: none of your games reached a position worth drilling.'}
              </p>
            )}
          </section>
        )}

        {session && current && (
          <DrillBoard key={`${session.index}-${current.nodeId}`} drill={current} onGraded={c => onGraded(current, c)} onNext={next} />
        )}

        {session && !current && (
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Done</h2>
            </div>
            <p className={styles.hint}>{session.right} of {session.graded} right first time.</p>
            <button className={shared.btnPrimary} onClick={finish}>Back</button>
          </section>
        )}
      </div>
    </main>
  );
};

type Feedback = { kind: 'right' | 'wrong'; text: string } | null;

/**
 * plays a drill out (D34): the moves before `from` are set up silently, opponent moves are played
 * for you, lead-in mistakes are corrected and forgiven, and only the final move is graded
 */
function DrillBoard({ drill, onGraded, onNext }: { drill: Drill; onGraded: (correct: boolean) => void; onNext: () => void }) {
  // the board starts set up at `from`; the parent remounts this component for every drill
  const [chess] = useState(() => {
    const board = new Chess(drill.startFen);
    for (const san of drill.moves.slice(0, drill.from)) board.move(san);
    return board;
  });
  const [ply, setPly] = useState(drill.from);
  const [fen, setFen] = useState(() => chess.fen());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const yourTurn = chess.turn() === drill.userSide[0];
  // the move expected at this ply: a lead-in move from the line, or the card's prepared reply
  const expected = ply < drill.moves.length ? drill.moves[ply] : drill.answer;
  const isTarget = ply === drill.moves.length;

  const play = (san: string) => {
    const move = chess.move(san);
    setLastMove({ from: move.from, to: move.to });
    setFen(chess.fen());
    setPly(p => p + 1);
  };

  // the opponent's moves play themselves
  useEffect(() => {
    if (done || yourTurn || ply >= drill.moves.length) return;
    const timer = setTimeout(() => play(drill.moves[ply]), OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ply, done, yourTurn]);

  function onPieceDrop(from: Square, to: Square, piece: string): boolean {
    if (done || busy || !yourTurn) return false;
    let san: string;
    try {
      san = chess.move({ from, to, promotion: piece[1]?.toLowerCase() ?? 'q' }).san;
      chess.undo();
    } catch {
      return false;
    }

    if (san === expected) {
      play(san);
      if (isTarget) {
        setFeedback({ kind: 'right', text: `${san}: right.` });
        setDone(true);
        onGraded(true);
      } else {
        setFeedback(null);
      }
      return true;
    }

    // wrong: show the prepared move, then carry on from it
    setFeedback({ kind: 'wrong', text: `Not ${san}. Your prepared move is ${expected}.` });
    setBusy(true);
    if (isTarget) onGraded(false);
    setTimeout(() => {
      play(expected);
      setBusy(false);
      if (isTarget) setDone(true);
    }, SHOW_ANSWER_MS);
    return false;
  }

  const squareStyles = lastMove
    ? { [lastMove.from]: { background: 'rgba(var(--color-amber-rgb), 0.35)' }, [lastMove.to]: { background: 'rgba(var(--color-amber-rgb), 0.5)' } }
    : {};

  return (
    <section className={`${shared.panel} ${styles.drill}`}>
      <div className={styles.board}>
        <Chessboard
          position={fen}
          boardOrientation={drill.userSide}
          onPieceDrop={onPieceDrop}
          arePiecesDraggable={!done && !busy && yourTurn}
          customSquareStyles={squareStyles}
          boardWidth={480}
        />
      </div>
      <div className={styles.side}>
        <span className={styles.source}>{SOURCE_LABEL[drill.source]}</span>
        <p className={styles.prompt}>
          {done ? 'Drill complete.' : yourTurn ? (isTarget ? 'Your move: this one counts.' : 'Your move.') : 'Opponent to move…'}
        </p>
        {feedback && <p className={feedback.kind === 'right' ? styles.right : styles.wrong}>{feedback.text}</p>}
        {done && <button className={shared.btnPrimary} onClick={onNext}>Next</button>}
      </div>
    </section>
  );
}

export default WeakPoints;
