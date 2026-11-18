/* apps/desktop/src/pages/NoveltyFinder.tsx */

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_POSITION } from 'chess.js';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import styles from './NoveltyFinder.module.css';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';
import type { Repertoire } from '../types/Repertoire';
import type { Finding, NoveltyFile } from '../novelty/results';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';
import { numberedLine } from '../chess/analysisTree';
import type { BoardFocus } from './BoardView';
import { findingPositions } from '../novelty/positions';
import { Engine } from '../engine/Engine';
import { createFullWorker } from '../engine/stockfishWorker';
import { formatScore, uciToSan, whiteScore, type EngineLine } from '../engine/uci';

import noveltyIcon from '../assets/icons/020-chess.png';
import deviationsIcon from '../assets/icons/204-folder-6.png';
import ideaIcon from '../assets/icons/009-idea.png';
import downloadGlyph from '../assets/icons/007-download.png';

interface NoveltyFinderProps {
  page: Page;
  currentUser: any; // or your inferred User type
  onOpenInBoard: (repertoire: Repertoire, focus: BoardFocus) => void;
}

// rows shown per table; the rest are counted in the header
const SHOWN = 50;

const describeLine = (line: string[]) => (line.length ? numberedLine(DEFAULT_POSITION, line) : 'Start position');
const formatDate = (ms: number) => (ms ? new Date(ms).toLocaleDateString() : '—');
// dismissed findings sink to the bottom; otherwise the most frequent first
const byCount = (a: Finding, b: Finding) =>
  Number(a.status === 'dismissed') - Number(b.status === 'dismissed') || b.count - a.count || b.lastSeen - a.lastSeen;
const keyOf = (f: Finding) => `${f.nodeId}|${f.move}|${f.kind}`;
// (TUNE) full Stockfish, single-threaded: a few seconds per position
const VERDICT_DEPTH = 18;

const NoveltyFinder = ({ currentUser, onOpenInBoard }: NoveltyFinderProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [repertoireId, setRepertoireId] = useState('');
  const [results, setResults] = useState<NoveltyFile | null>(null);
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    storage.loadRepertoires().then(reps => {
      setRepertoires(reps);
      setRepertoireId(id => id || reps[0]?.id || '');
    });
  }, [storage]);

  useEffect(() => {
    setResults(null);
    setSummary(null);
    if (repertoireId) window.api.loadNovelty(repertoireId).then(setResults);
  }, [repertoireId]);

  async function check(mode: 'latest' | 'all') {
    setRunning({ done: 0, total: 0 });
    setSummary(null);
    const stop = window.api.onNoveltyProgress((done, total) => setRunning({ done, total }));
    try {
      const s = await window.api.runNovelty(repertoireId, mode);
      setSummary(s.walked === 0
        ? 'No imported games where you played this repertoire\'s colour.'
        : `Checked ${s.walked} game${s.walked === 1 ? '' : 's'}: ${s.deviations} deviation${s.deviations === 1 ? '' : 's'}, ${s.novelties} novelt${s.novelties === 1 ? 'y' : 'ies'}, ${s.inPrep} stayed in prep.`);
      setResults(await window.api.loadNovelty(repertoireId));
    } catch (err) {
      setSummary(err instanceof Error ? err.message : 'The check failed.');
    } finally {
      stop();
      setRunning(null);
    }
  }

  // the full engine is loaded on the first Evaluate and closed with the page
  const engine = useRef<Engine | null>(null);
  useEffect(() => () => engine.current?.quit(), []);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const repertoire = repertoires.find(r => r.id === repertoireId);

  const refresh = async () => setResults(await window.api.loadNovelty(repertoireId));

  // the verdict: the engine's score after the move played, and its own best move in the position before
  async function evaluate(f: Finding) {
    const positions = findingPositions(f.line, f.move);
    if (!positions) return setSummary("That position couldn't be replayed.");
    setEvaluating(keyOf(f));
    try {
      engine.current ??= new Engine(createFullWorker());
      const bestUci = await engine.current.analyse(positions.before, { depth: VERDICT_DEPTH }, () => undefined);
      let after: EngineLine[] = [];
      await engine.current.analyse(positions.after, { depth: VERDICT_DEPTH }, lines => { after = lines; });
      await window.api.updateFinding(repertoireId, keyOf(f), {
        eval: {
          score: after[0] ? formatScore(whiteScore(after[0].score, positions.after)) : '?',
          depth: after[0]?.depth ?? 0,
          best: bestUci ? uciToSan(positions.before, [bestUci])[0] ?? '?' : '—',
        },
      });
      await refresh();
    } finally {
      setEvaluating(null);
    }
  }

  async function toggleDismissed(f: Finding) {
    await window.api.updateFinding(repertoireId, keyOf(f), { status: f.status === 'dismissed' ? 'new' : 'dismissed' });
    await refresh();
  }

  const actions = (f: Finding) => (
    <td className={styles.rowActions}>
      <button className={styles.rowBtn} onClick={() => repertoire && onOpenInBoard(repertoire, { nodeId: f.nodeId, move: f.move })} title="Show this position in the analysis board">Board</button>
      {f.eval
        ? <span className={styles.verdict} title={`Stockfish depth ${f.eval.depth}: score after ${f.move}, and its own best move`}>{f.eval.score} · best {f.eval.best}</span>
        : <button className={styles.rowBtn} onClick={() => evaluate(f)} disabled={!!evaluating}>{evaluating === keyOf(f) ? 'Evaluating…' : 'Evaluate'}</button>}
      <button className={styles.rowBtn} onClick={() => toggleDismissed(f)}>{f.status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
    </td>
  );

  const findings = Object.values(results?.findings ?? {});
  const deviations = findings.filter(f => f.kind === 'deviation').sort(byCount);
  const novelties = findings.filter(f => f.kind === 'novelty').sort(byCount);
  const gameCount = Object.keys(results?.games ?? {}).length;

  const [importing, setImporting] = useState(false);
  const [importingFrom, setImportingFrom] = useState<"lichess" | "chesscom" | null>(null);

  async function handleLichessImport() {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!currentUser.lichessName) {
      alert("You haven't linked your Lichess account yet. Go to Settings.");
      return;
    }

    setImporting(true);
    setImportingFrom("lichess");
    try {
      const res = await window.api.importLichess(currentUser.lichessName);

      if (res.ok) {
        alert("Lichess games imported!");
      } else {
        alert("Import failed: " + res.error);
      }
    } finally {
      setImporting(false);
      setImportingFrom(null);
    }
  }

  async function handleChesscomImport() {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!currentUser.chesscomName) {
      alert("You haven't linked your Chess.com account yet. Go to Settings.");
      return;
    }

    setImporting(true);
    setImportingFrom("chesscom");
    try {
      const res = await window.api.importChesscom(currentUser.chesscomName);

      if (res.ok) {
        alert("Chess.com games imported!");
      } else {
        alert("Import failed: " + res.error);
      }
    } finally {
      setImporting(false);
      setImportingFrom(null);
    }
  }

  return (
    <>
    <main className="main-content">
      <div className={shared.page}>
        <PageHeader
          icon={noveltyIcon}
          title="Novelty Finder"
          subtitle="Walk your games through your repertoires and catch where they leave your prep."
        />

        {/* Game import */}
        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2 className={shared.sectionTitle}>Import Games</h2>
          </div>

          <p className={styles.importHint}>
            Pulls your blitz and rapid games from the accounts linked in Settings.
          </p>

          <div className={styles.importActions}>
            <button
              className={`${styles.importBtn} ${styles.chesscomBtn}`}
              onClick={handleChesscomImport}
              disabled={importing}
            >
              <Icon src={downloadGlyph} size={16} />
              Import Chess.com
            </button>

            <button
              className={`${styles.importBtn} ${styles.lichessBtn}`}
              onClick={handleLichessImport}
              disabled={importing}
            >
              <Icon src={downloadGlyph} size={16} />
              Import Lichess
            </button>
          </div>
        </section>

        {/* Check games against a repertoire (D15: the user picks it) */}
        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2 className={shared.sectionTitle}>Check Games</h2>
            {gameCount > 0 && <span className={styles.importHint}>{gameCount} games checked so far</span>}
          </div>
          <div className={styles.checkRow}>
            <select className={styles.select} value={repertoireId} onChange={e => setRepertoireId(e.target.value)} disabled={!!running}>
              {repertoires.map(r => <option key={r.id} value={r.id}>{r.name} ({r.side})</option>)}
            </select>
            <button className={shared.btnPrimary} onClick={() => check('latest')} disabled={!repertoireId || !!running}>Check latest game</button>
            <button className={shared.btnOutline} onClick={() => check('all')} disabled={!repertoireId || !!running}>Check all games</button>
          </div>
          {running && (
            <p className={styles.importHint}>
              Checking{running.total ? ` ${running.done} / ${running.total}` : '…'}
            </p>
          )}
          {summary && <p className={styles.importHint}>{summary}</p>}
        </section>

        <div className={shared.panelGrid}>
          {/* Deviations: your move left the prepared line */}
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Deviations</h2>
              {deviations.length > SHOWN && <span className={styles.importHint}>top {SHOWN} of {deviations.length}</span>}
            </div>

            {deviations.length > 0 ? (
              <table className={shared.table}>
                <thead><tr><th>After</th><th>You played</th><th>Prepared</th><th>Times</th><th>Last</th><th /></tr></thead>
                <tbody>
                  {deviations.slice(0, SHOWN).map(f => (
                    <tr key={keyOf(f)} className={f.status === 'dismissed' ? styles.dismissed : undefined}>
                      <td>{describeLine(f.line)}</td><td>{f.move}</td><td>{f.expected}</td><td>{f.count}</td><td>{formatDate(f.lastSeen)}</td>
                      {actions(f)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            <div className={shared.emptyState}>
              <img src={deviationsIcon} className={shared.emptyIcon} />
              <span className={shared.emptyTitle}>No deviations found yet</span>
              <span className={shared.emptyHint}>
                Moves where you left a prepared line will be collected
                here, so you can drill them later.
              </span>
            </div>
            )}
          </section>

          {/* Novelties — game followed a line to its end, next move is new */}
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Novelties</h2>
              {novelties.length > SHOWN && <span className={styles.importHint}>top {SHOWN} of {novelties.length}</span>}
            </div>

            {novelties.length > 0 ? (
              <table className={shared.table}>
                <thead><tr><th>After</th><th>Move</th><th>Why new</th><th>Times</th><th>Last</th><th /></tr></thead>
                <tbody>
                  {novelties.slice(0, SHOWN).map(f => (
                    <tr key={keyOf(f)} className={f.status === 'dismissed' ? styles.dismissed : undefined}>
                      <td>{describeLine(f.line)}</td><td>{f.move}</td>
                      <td>{f.reason === 'opponent-move' ? "opponent's move" : 'line ended'}</td>
                      <td>{f.count}</td><td>{formatDate(f.lastSeen)}</td>
                      {actions(f)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            <div className={shared.emptyState}>
              <img src={ideaIcon} className={shared.emptyIcon} />
              <span className={shared.emptyTitle}>No novelties found yet</span>
              <span className={shared.emptyHint}>
                Opponent moves your repertoire doesn't cover, and the next move after a line
                ends, are saved here as candidates to add.
              </span>
            </div>
            )}
          </section>
        </div>
      </div>
    </main>

    {importing && (
      <div className={styles.modalBackdrop}>
        <div className={styles.modalWindow}>
          <h2>Importing Games</h2>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>
            Pulling your games from {importingFrom === "chesscom" ? "Chess.com" : "Lichess"}...
          </p>
        </div>
      </div>
    )}
    </>
  );
};

export default NoveltyFinder;