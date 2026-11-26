/* apps/desktop/src/pages/WeakPoints.tsx */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chess, DEFAULT_POSITION, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { BOARD_SQUARES } from '../components/board/boardSquares';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import styles from './WeakPoints.module.css';
import type { Page } from '../types/Page';
import type { BoardFocus } from './BoardView';
import type { Repertoire } from '../types/Repertoire';
import type { Node } from '../types/Node';
import { branches, randomDrills, type Drill, type DrillSource } from '../weakpoints/lines';
import type { WeakPointsQueue } from '../Storage/WeakPoints';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';
import { numberedLine } from '../chess/analysisTree';


interface WeakPointsProps {
  setPage: (page: Page) => void;
  onOpenInBoard: (repertoire: Repertoire, focus: BoardFocus) => void;
}

type Mode = 'focused' | 'mistakes' | 'random';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'focused', label: 'Focused', hint: 'Your mistakes, lines you rarely reach, and now and then a strong one. Scheduled.' },
  { id: 'mistakes', label: 'Mistakes only', hint: 'Only the positions where your games left your prep. Scheduled.' },
  { id: 'random', label: 'Random', hint: 'Random stretches of your repertoire. Practice only: nothing is saved.' },
];

// opponent moves are played after a short pause so you can see them land
const OPPONENT_DELAY_MS = 450;
const SHOW_ANSWER_MS = 900;
// a card you got wrong comes back in this session if FSRS wants it again within this window
const SAME_SESSION_MS = 30 * 60_000;
// (TUNE) D41: drills per Random session, and the length you can pick
const RANDOM_SESSION = 10;
const RANDOM_LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SOURCE_LABEL: Record<DrillSource, string> = {
  deviation: 'You went wrong here',
  rare: 'A line you rarely reach',
  strong: 'Keeping a strong line fresh',
  random: 'Random line',
};

interface Session { drills: Drill[]; index: number; right: number; scored: number }

const WeakPoints = ({ setPage, onOpenInBoard }: WeakPointsProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  // nothing is picked for you: the drills are for the repertoire you choose
  const [repertoireId, setRepertoireId] = useState('');
  const [mode, setMode] = useState<Mode>('focused');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [randomLength, setRandomLength] = useState(5);
  const [queue, setQueue] = useState<WeakPointsQueue | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const repertoire = repertoires.find(r => r.id === repertoireId);

  useEffect(() => {
    storage.loadRepertoires().then(setRepertoires);
    storage.loadNodes().then(setNodes);
  }, [storage]);

  const branchList = useMemo(() => {
    if (!repertoire) return [];
    const startFen = nodes[repertoire.rootNodeId]?.fen ?? DEFAULT_POSITION;
    return branches(repertoire, nodes).map(b => ({ nodeId: b.nodeId, label: numberedLine(startFen, b.moves) }));
  }, [repertoire, nodes]);

  // changing repertoire, mode and branch together can fire several loads; only the latest one counts
  const latestLoad = useRef(0);

  async function loadQueue() {
    const load = ++latestLoad.current;
    setQueue(null);
    if (!repertoireId || mode === 'random') return;
    try {
      const q = await window.api.weakpointsQueue(repertoireId, mode, branchId);
      if (load !== latestLoad.current) return;
      if (q.recovered) toast.error("Your WeakPoints file couldn't be read. It was set aside and a fresh schedule started.", { duration: 8000 });
      // no game data yet: Random still works, so switch to it rather than leave an empty page
      if (q.noNovelty) setMode('random');
      setQueue(q);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load your drills.");
    }
  }

  useEffect(() => {
    setSession(null);
    setBranchId(null);
  }, [repertoireId]);

  useEffect(() => {
    if (!session) loadQueue();
  }, [repertoireId, mode, branchId, session === null]);

  function start() {
    if (!repertoire) return;
    const drills = mode === 'random'
      ? randomDrills(repertoire, nodes, { count: RANDOM_SESSION, yourMoves: randomLength, branchId })
      : queue?.drills ?? [];
    if (drills.length === 0) return toast.error('Nothing to drill in this part of the repertoire.');
    setSession({ drills, index: 0, right: 0, scored: 0 });
  }

  // a scored move: Random only counts it; a card's move is graded and saved (D34, D37)
  async function onScored(drill: Drill, correct: boolean, played: string) {
    setSession(s => s && { ...s, right: s.right + Number(correct), scored: s.scored + 1 });
    if (!drill.nodeId) return;
    try {
      const due = await window.api.weakpointsGrade(repertoireId, drill.nodeId, correct, played);
      // a copy, so the board resets even when it's the very next drill
      if (due - Date.now() < SAME_SESSION_MS) setSession(s => s && { ...s, drills: [...s.drills, { ...drill }] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that drill.");
    }
  }

  const next = () => setSession(s => s && { ...s, index: s.index + 1 });
  // D46: leaves the session with no confirm; grades are already saved and Random saves nothing
  const openInBoard = (nodeId: string) => repertoire && onOpenInBoard(repertoire, { nodeId });
  const current = session?.drills[session.index] ?? null;
  const drill = useDrill(current, onScored);
  const modeInfo = MODES.find(m => m.id === mode);

  return (
    <main className="main-content">
      <div className={shared.page}>
        <PageHeader
          title="WeakPoints"
          subtitle="Drill the lines you get wrong, revisit the ones you rarely reach, keep the strong ones fresh."
        />

        <div className={styles.layout}>
          <section className={`${shared.panel} ${styles.controls}`}>
            {!session && (
              <>
                <h2 className={shared.sectionTitle}>Drills</h2>
                <select className={styles.select} value={repertoireId} onChange={e => setRepertoireId(e.target.value)}>
                  <option value="" disabled>Choose a repertoire…</option>
                  {repertoires.map(r => <option key={r.id} value={r.id}>{r.name} ({r.side})</option>)}
                </select>
                {repertoires.length === 0 && <p className={styles.hint}>Make a repertoire first.</p>}

                {repertoire && (
                  <>
                    <div className={shared.toggle}>
                      {MODES.map(m => (
                        <button
                          key={m.id}
                          className={`${shared.toggleBtn} ${mode === m.id ? shared.toggleActive : ''}`}
                          onClick={() => setMode(m.id)}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <p className={styles.hint}>{modeInfo?.hint}</p>

                    <label className={styles.field}>
                      <span>Opening</span>
                      <select className={styles.select} value={branchId ?? ''} onChange={e => setBranchId(e.target.value || null)}>
                        <option value="">Everything</option>
                        {branchList.map(b => <option key={b.nodeId} value={b.nodeId}>{b.label}</option>)}
                      </select>
                    </label>

                    {mode === 'random' && (
                      <label className={styles.field}>
                        <span>Your moves per drill</span>
                        <select className={styles.select} value={randomLength} onChange={e => setRandomLength(Number(e.target.value))}>
                          {RANDOM_LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </label>
                    )}

                    {mode !== 'random' && queue && !queue.noNovelty && (
                      <p className={styles.hint}>
                        {queue.drills.length > 0
                          ? `${queue.drills.length} due now, ${queue.cards} card${queue.cards === 1 ? '' : 's'} in total`
                          : queue.cards > 0
                            ? `Nothing due here. ${queue.cards} card${queue.cards === 1 ? '' : 's'} scheduled; come back later.`
                            : 'No drills yet: none of your games reached a position worth drilling.'}
                      </p>
                    )}
                    {queue?.noNovelty && (
                      <>
                        <p className={styles.hint}>No game data for this repertoire yet, so Random is on. Run the Novelty Finder for Focused drills.</p>
                        <button className={shared.btnOutline} onClick={() => setPage('novelty')}>Open Novelty Finder</button>
                      </>
                    )}

                    <button
                      className={shared.btnPrimary}
                      disabled={mode !== 'random' && !queue?.drills.length}
                      onClick={start}
                    >
                      Start
                    </button>
                  </>
                )}
              </>
            )}

            {current && drill && session && (
              <DrillPanel
                session={session}
                current={current}
                drill={drill}
                onOpenInBoard={openInBoard}
                onNext={next}
                onStop={() => setSession(null)}
              />
            )}

            {session && !current && (
              <>
                <h2 className={shared.sectionTitle}>Done</h2>
                <p className={styles.hint}>{session.right} of {session.scored} right first time.</p>
                <button className={shared.btnPrimary} onClick={() => setSession(null)}>Back</button>
              </>
            )}
          </section>

          <FittedBoard
            fen={drill?.fen ?? nodes[repertoire?.rootNodeId ?? '']?.fen ?? DEFAULT_POSITION}
            orientation={current?.userSide ?? repertoire?.side ?? 'white'}
            onPieceDrop={drill?.onPieceDrop}
            draggable={drill?.draggable ?? false}
            squareStyles={drill?.squareStyles ?? {}}
          />
        </div>
      </div>
    </main>
  );
};

/** the side panel during a drill; the board link only appears once the line is over, so it can't give the move away, and then waits for Next (D46) */
export function DrillPanel({ session, current, drill, onOpenInBoard, onNext, onStop }: {
  session: Session;
  current: Drill;
  drill: Pick<DrillView, 'prompt' | 'feedback' | 'done'>;
  onOpenInBoard: (nodeId: string) => void;
  onNext: () => void;
  onStop: () => void;
}) {
  return (
    <>
      <span className={styles.progress}>
        Drill {session.index + 1} of {session.drills.length}, {session.right} of {session.scored} right first time
      </span>
      <span className={styles.source}>{SOURCE_LABEL[current.source]}</span>
      <p className={styles.prompt}>{drill.prompt}</p>
      {drill.feedback && <p className={drill.feedback.kind === 'right' ? styles.right : styles.wrong}>{drill.feedback.text}</p>}
      {drill.done && (
        <div className={styles.drillActions}>
          <button className={shared.btnOutline} onClick={() => onOpenInBoard(current.boardNodeId)}>Open in board</button>
          <button className={shared.btnPrimary} onClick={onNext} autoFocus>Next</button>
        </div>
      )}
      <button className={shared.btnOutline} onClick={onStop}>Stop</button>
    </>
  );
}

/** the board fills the right-hand column without pushing the page past the bottom of the window */
function FittedBoard({ fen, orientation, onPieceDrop, draggable, squareStyles }: {
  fen: string;
  orientation: 'white' | 'black';
  onPieceDrop?: (from: Square, to: Square, piece: string) => boolean;
  draggable: boolean;
  squareStyles: Record<string, CSSProperties>;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const fit = () => {
      const room = window.innerHeight - el.getBoundingClientRect().top - 32;
      setWidth(Math.max(280, Math.floor(Math.min(el.clientWidth, room))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <div ref={area} className={styles.boardArea}>
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={onPieceDrop}
        arePiecesDraggable={draggable}
        customSquareStyles={squareStyles}
        {...BOARD_SQUARES}
        boardWidth={width}
      />
    </div>
  );
}

type Feedback = { kind: 'right' | 'wrong'; text: string } | null;
type DrillView = NonNullable<ReturnType<typeof useDrill>>;

/**
 * plays a drill out: the moves before `from` are set up silently, opponent moves are played for you,
 * your moves before `scoredFrom` are a forgiven lead-in, and each later one is reported to `onScored`.
 * A wrong move shows the right one, which is then played. When the line ends it reports `done` and waits.
 */
function useDrill(drill: Drill | null, onScored: (drill: Drill, correct: boolean, played: string) => void) {
  const [state, setState] = useState<{ drill: Drill; chess: Chess; ply: number } | null>(null);
  const [fen, setFen] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!drill) return setState(null);
    const chess = new Chess(drill.startFen);
    for (const san of drill.line.slice(0, drill.from)) chess.move(san);
    setState({ drill, chess, ply: drill.from });
    setFen(chess.fen());
    setFeedback(null);
    setLastMove(null);
    setBusy(false);
  }, [drill]);

  // until the effect above has set the new drill up, there's nothing to show
  const ready = state && state.drill === drill ? state : null;
  const done = !!ready && ready.ply >= ready.drill.line.length;
  const yourTurn = !!ready && !done && ready.chess.turn() === ready.drill.userSide[0];
  const scored = !!ready && ready.ply >= ready.drill.scoredFrom;
  const expected = ready && !done ? ready.drill.line[ready.ply] : '';

  const play = (chess: Chess, san: string) => {
    const move = chess.move(san);
    setLastMove({ from: move.from, to: move.to });
    setFen(chess.fen());
    setState(s => s && { ...s, ply: s.ply + 1 });
  };

  // the opponent's moves play themselves
  useEffect(() => {
    if (!ready || done || yourTurn || busy) return;
    const timer = setTimeout(() => play(ready.chess, ready.drill.line[ready.ply]), OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, done, yourTurn, busy]);

  if (!ready) return null;

  function onPieceDrop(from: Square, to: Square, piece: string): boolean {
    if (!ready || busy || !yourTurn) return false;
    let san: string;
    try {
      san = ready.chess.move({ from, to, promotion: piece[1]?.toLowerCase() ?? 'q' }).san;
      ready.chess.undo();
    } catch {
      return false;
    }

    if (san === expected) {
      if (scored) onScored(ready.drill, true, san);
      setFeedback(scored ? { kind: 'right', text: `${san}: right.` } : null);
      play(ready.chess, san);
      return true;
    }

    // wrong: show the prepared move, then carry on from it
    if (scored) onScored(ready.drill, false, san);
    setFeedback({ kind: 'wrong', text: `Not ${san}. Your prepared move is ${expected}.` });
    setBusy(true);
    const { chess } = ready;
    setTimeout(() => {
      play(chess, expected);
      setBusy(false);
    }, SHOW_ANSWER_MS);
    return false;
  }

  return {
    fen,
    feedback,
    done,
    onPieceDrop,
    draggable: yourTurn && !busy,
    prompt: done ? 'Drill complete.' : yourTurn ? (scored ? 'Your move: this one counts.' : 'Your move (warm-up).') : 'Opponent to move…',
    squareStyles: lastMove
      ? { [lastMove.from]: { background: 'rgba(var(--color-amber-rgb), 0.35)' }, [lastMove.to]: { background: 'rgba(var(--color-amber-rgb), 0.5)' } }
      : {},
  };
}

export default WeakPoints;
