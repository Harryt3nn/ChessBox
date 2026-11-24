/* apps/desktop/src/pages/NoveltyFinder.tsx */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_POSITION } from 'chess.js';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import styles from './NoveltyFinder.module.css';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';
import type { Repertoire } from '../types/Repertoire';
import type { Finding, GameRecord, NoveltyFile } from '../novelty/results';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';
import { numberedLine } from '../chess/analysisTree';
import type { BoardFocus } from './BoardView';
import { findingPositions } from '../novelty/positions';
import { Engine } from '../engine/Engine';
import { createFullWorker } from '../engine/stockfishWorker';
import { formatScore, sideCentipawns, uciToSan, whiteScore, type EngineLine } from '../engine/uci';

import noveltyIcon from '../assets/icons/020-chess.png';
import deviationsIcon from '../assets/icons/204-folder-6.png';
import ideaIcon from '../assets/icons/009-idea.png';
import downloadGlyph from '../assets/icons/007-download.png';

interface NoveltyFinderProps {
  page: Page;
  currentUser: any; // or your inferred User type
  onOpenInBoard: (repertoire: Repertoire, focus: BoardFocus) => void;
  onOpenInGraph: (repertoire: Repertoire, nodeId: string) => void;
}

// rows shown per table; the rest are counted in the header
const SHOWN = 50;

const describeLine = (line: string[]) => (line.length ? numberedLine(DEFAULT_POSITION, line) : 'Start position');
const formatDateTime = (ms: number) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unknown');
// games listed under an opened row
const GAMES_SHOWN = 20;
// dismissed findings sink to the bottom; otherwise the most frequent first
const byCount = (a: Finding, b: Finding) =>
  Number(a.status === 'dismissed') - Number(b.status === 'dismissed') || b.count - a.count || b.lastSeen - a.lastSeen;
const keyOf = (f: Finding) => `${f.nodeId}|${f.move}|${f.kind}`;
// (TUNE) full Stockfish, single-threaded: a few seconds per position
const VERDICT_DEPTH = 18;

const NoveltyFinder = ({ currentUser, onOpenInBoard, onOpenInGraph }: NoveltyFinderProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [repertoireId, setRepertoireId] = useState('');
  const [results, setResults] = useState<NoveltyFile | null>(null);
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    storage.loadRepertoires().then(reps => {
      setRepertoires(reps);
      setRepertoireId(id => id || reps[0]?.id || '');
    });
  }, [storage]);

  useEffect(() => {
    window.api.listAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    setResults(null);
    setSummary(null);
    if (!repertoireId) return;
    window.api.loadNovelty(repertoireId).then(file => {
      setResults(file);
      setPicked(file?.accounts ?? accounts);
    });
  }, [repertoireId, accounts]);

  const togglePicked = (account: string) =>
    setPicked(prev => (prev.includes(account) ? prev.filter(a => a !== account) : [...prev, account]));

  async function check(mode: 'latest' | 'all') {
    setRunning({ done: 0, total: 0 });
    setSummary(null);
    const stop = window.api.onNoveltyProgress((done, total) => setRunning({ done, total }));
    try {
      const s = await window.api.runNovelty(repertoireId, mode, picked);
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

  // the full engine is loaded when the first deviation needs checking, and closed with the page
  const engine = useRef<Engine | null>(null);
  const repertoire = repertoires.find(r => r.id === repertoireId);

  const refresh = async () => setResults(await window.api.loadNovelty(repertoireId));

  // the verdict: the engine's score after the move played, its own best move in the position before,
  // and for a deviation the score after your prepared move, so WeakPoints can skip near-equal ones (D23, D31)
  async function verdict(repId: string, side: 'white' | 'black', f: Finding): Promise<boolean> {
    const positions = findingPositions(f.line, f.move);
    const prepared = f.expected ? findingPositions(f.line, f.expected) : null;
    if (!positions || !prepared) return false;
    const stockfish = (engine.current ??= new Engine(createFullWorker()));
    const topLine = async (fen: string) => {
      let lines: EngineLine[] = [];
      await stockfish.analyse(fen, { depth: VERDICT_DEPTH }, l => { lines = l; });
      return lines[0];
    };
    const bestUci = await stockfish.analyse(positions.before, { depth: VERDICT_DEPTH }, () => undefined);
    const after = await topLine(positions.after);
    const afterPrepared = await topLine(prepared.after);
    await window.api.updateFinding(repId, keyOf(f), {
      eval: {
        score: after ? formatScore(whiteScore(after.score, positions.after)) : '?',
        depth: after?.depth ?? 0,
        best: bestUci ? uciToSan(positions.before, [bestUci])[0] ?? '?' : '—',
        ...(after ? { playedCp: sideCentipawns(after.score, positions.after, side) } : {}),
        ...(afterPrepared ? { preparedCp: sideCentipawns(afterPrepared.score, prepared.after, side) } : {}),
      },
    });
    return true;
  }

  // D38: deviations without a prepared-move score are checked one at a time in the background, most
  // frequent first. Each verdict is saved as it lands, so leaving and coming back carries on where it
  // stopped. One loop at a time; it follows whichever repertoire is shown and pauses during a run.
  const [checking, setChecking] = useState<{ done: number; total: number } | null>(null);
  const shownRepertoire = useRef<Repertoire | undefined>(undefined);
  shownRepertoire.current = repertoire;
  const walking = useRef(false);
  walking.current = !!running;
  const checkLoop = useRef(false);
  const unreplayable = useRef(new Set<string>());

  async function checkDeviations() {
    if (checkLoop.current) return;
    checkLoop.current = true;
    let done = 0;
    try {
      for (;;) {
        const rep = shownRepertoire.current;
        if (!rep || walking.current) break;
        const file = await window.api.loadNovelty(rep.id);
        const todo = Object.values(file?.findings ?? {})
          .filter(f => f.kind === 'deviation' && f.eval?.preparedCp === undefined && !unreplayable.current.has(`${rep.id}|${keyOf(f)}`))
          .sort(byCount);
        if (todo.length === 0) break;
        setChecking({ done, total: done + todo.length });
        if (!(await verdict(rep.id, rep.side, todo[0]))) unreplayable.current.add(`${rep.id}|${keyOf(todo[0])}`);
        done++;
        if (shownRepertoire.current?.id === rep.id) setResults(await window.api.loadNovelty(rep.id));
      }
    } catch (err) {
      // the engine was closed with the page, or a save failed: stop, and try again next time
      console.error('Stopped checking deviations:', err);
    } finally {
      checkLoop.current = false;
      setChecking(null);
    }
  }

  useEffect(() => {
    if (results && !running) checkDeviations();
  }, [results?.updatedAt, repertoireId, running]);

  useEffect(() => () => {
    shownRepertoire.current = undefined;
    engine.current?.quit();
  }, []);

  async function toggleDismissed(f: Finding) {
    await window.api.updateFinding(repertoireId, keyOf(f), { status: f.status === 'dismissed' ? 'new' : 'dismissed' });
    await refresh();
  }

  const actions = (f: Finding) => (
    <td className={styles.rowActions}>
      <button className={styles.rowBtn} onClick={() => repertoire && onOpenInBoard(repertoire, { nodeId: f.nodeId, move: f.move })} title="Show this position in the analysis board">Board</button>
      <button className={styles.rowBtn} onClick={() => repertoire && onOpenInGraph(repertoire, f.nodeId)} title="Show where this happens in the repertoire graph">Graph</button>
      {f.eval && <span className={styles.verdict} title={`Stockfish depth ${f.eval.depth}: score after ${f.move}, and its own best move`}>{f.eval.score}, best {f.eval.best}</span>}
      <button className={styles.rowBtn} onClick={() => toggleDismissed(f)}>{f.status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
    </td>
  );

  // the games behind a finding, newest first, shown under its row
  const [openRow, setOpenRow] = useState<string | null>(null);
  // deviations first: they're what WeakPoints drills
  const [tab, setTab] = useState<'deviations' | 'novelties'>('deviations');
  // long lines are cut short; the whole line is in the tooltip
  const lineCell = (f: Finding) => {
    const line = describeLine(f.line);
    return <td className={styles.lineCell} title={line}>{line}</td>;
  };
  const timesCell = (f: Finding) => (
    <td>
      <button className={styles.linkBtn} onClick={() => setOpenRow(r => (r === keyOf(f) ? null : keyOf(f)))} title="Show the games">
        {f.count} {openRow === keyOf(f) ? '▾' : '▸'}
      </button>
    </td>
  );
  const gamesRow = (f: Finding) => openRow === keyOf(f) && (
    <tr className={styles.gamesRow}>
      <td colSpan={6}>
        <ul className={styles.gameList}>
          {f.games
            .map(key => ({ key, game: results?.games[key] }))
            .filter((g): g is { key: string; game: GameRecord } => !!g.game)
            .sort((a, b) => b.game.playedAt - a.game.playedAt)
            .slice(0, GAMES_SHOWN)
            .map(({ key, game }) => (
              <li key={key}>
                <span className={styles.gameWhen}>{formatDateTime(game.playedAt)}</span>
                {game.white} vs {game.black}, {game.result}, {key.startsWith('lichess:') ? 'Lichess' : 'Chess.com'}
              </li>
            ))}
          {f.games.length > GAMES_SHOWN && <li className={styles.importHint}>and {f.games.length - GAMES_SHOWN} older</li>}
        </ul>
      </td>
    </tr>
  );

  const findings = Object.values(results?.findings ?? {});
  const deviations = findings.filter(f => f.kind === 'deviation').sort(byCount);
  const novelties = findings.filter(f => f.kind === 'novelty').sort(byCount);
  const shown = tab === 'deviations' ? deviations : novelties;
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
            <button className={shared.btnPrimary} onClick={() => check('latest')} disabled={!repertoireId || !picked.length || !!running}>Check latest game</button>
            <button className={shared.btnOutline} onClick={() => check('all')} disabled={!repertoireId || !picked.length || !!running}>Check all games</button>
          </div>
          {accounts.length > 0 && (
            <div className={styles.accounts}>
              <span className={styles.importHint}>Games from:</span>
              {accounts.map(a => (
                <label key={a} className={styles.account}>
                  <input type="checkbox" checked={picked.includes(a)} onChange={() => togglePicked(a)} disabled={!!running} />
                  {a}
                </label>
              ))}
            </div>
          )}
          {running && (
            <p className={styles.importHint}>
              Checking{running.total ? ` ${running.done} / ${running.total}` : '…'}
            </p>
          )}
          {summary && <p className={styles.importHint}>{summary}</p>}
        </section>

        {/* Deviations and novelties share one full-width panel, so the long lines and row buttons fit */}
        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <div className={shared.toggle}>
              {(['deviations', 'novelties'] as const).map(t => (
                <button
                  key={t}
                  className={`${shared.toggleBtn} ${tab === t ? shared.toggleActive : ''}`}
                  onClick={() => { setTab(t); setOpenRow(null); }}
                >
                  {t === 'deviations' ? `Deviations (${deviations.length})` : `Novelties (${novelties.length})`}
                </button>
              ))}
            </div>
            {/* shown on both tabs, so the background check never looks stalled */}
            {checking && <span className={styles.importHint}>Stockfish checking {checking.done + 1} of {checking.total}…</span>}
            {shown.length > SHOWN && <span className={styles.importHint}>top {SHOWN} of {shown.length}</span>}
          </div>

          {tab === 'deviations' && (deviations.length > 0 ? (
            <table className={shared.table}>
              <thead><tr><th>After</th><th>You played</th><th>Prepared</th><th>Times</th><th>Last</th><th /></tr></thead>
              <tbody>
                {deviations.slice(0, SHOWN).map(f => (
                  <Fragment key={keyOf(f)}>
                    <tr className={f.status === 'dismissed' ? styles.dismissed : undefined}>
                      {lineCell(f)}<td>{f.move}</td><td>{f.expected}</td>{timesCell(f)}<td>{formatDateTime(f.lastSeen)}</td>
                      {actions(f)}
                    </tr>
                    {gamesRow(f)}
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={shared.emptyState}>
              <img alt="" src={deviationsIcon} className={shared.emptyIcon} />
              <span className={shared.emptyTitle}>No deviations found yet</span>
              <span className={shared.emptyHint}>
                Moves where you left a prepared line will be collected
                here, so you can drill them later.
              </span>
            </div>
          ))}

          {tab === 'novelties' && (novelties.length > 0 ? (
            <table className={shared.table}>
              <thead><tr><th>After</th><th>Move</th><th>Why new</th><th>Times</th><th>Last</th><th /></tr></thead>
              <tbody>
                {novelties.slice(0, SHOWN).map(f => (
                  <Fragment key={keyOf(f)}>
                    <tr className={f.status === 'dismissed' ? styles.dismissed : undefined}>
                      {lineCell(f)}<td>{f.move}</td>
                      <td>{f.reason === 'opponent-move' ? "opponent's move" : 'line ended'}</td>
                      {timesCell(f)}<td>{formatDateTime(f.lastSeen)}</td>
                      {actions(f)}
                    </tr>
                    {gamesRow(f)}
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={shared.emptyState}>
              <img alt="" src={ideaIcon} className={shared.emptyIcon} />
              <span className={shared.emptyTitle}>No novelties found yet</span>
              <span className={shared.emptyHint}>
                Opponent moves your repertoire doesn't cover, and the next move after a line
                ends, are saved here as candidates to add.
              </span>
            </div>
          ))}
        </section>
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