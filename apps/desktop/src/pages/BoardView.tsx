/*apps/desktop/src/pages/BoardView.tsx */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import type { Page } from '../types/Page';
import type { GameTree } from '../types/gameTree';
import {
  createTree,
  getNodeAtPath,
  mainLineFrom,
  playMove,
  isPromotionMove,
  positionStatus,
  moveSquares,
  checkedKingSquare,
  exportPgn,
  importPgn,
  importFen,
  importAny,
  BoardImportError,
} from '../chess/analysisTree';
import { MoveList } from '../components/board/MoveList';
import styles from './BoardView.module.css';
import Sidebar from '../components/SidebarModule';
import leftArrow from '../assets/icons/033-left arrow.png';
import rightArrow from '../assets/icons/034-right arrow.png';
import farRightArrow from '../assets/icons/029-forward.png';
import farLeftArrow from '../assets/icons/030-backward.png';
import exportIcon from '../assets/icons/015-download.png';
import importIcon from '../assets/icons/038-upload.png';
import flipIcon from '../assets/icons/019-refresh.png';
import resetIcon from '../assets/icons/031-remove.png';
import copyIcon from '../assets/icons/011-copy.png';
import iconStyles from "../components/buttons/iconRules.module.css";

interface BoardViewProps {
    page: Page;
    setPage: (page: Page) => void;
}

// The board, move list and PGN all read the same GameTree. Tree logic, PGN/FEN import and
// export live in chess/analysisTree.ts; this component only handles input and layout.

type Message = { kind: 'error' | 'info'; text: string } | null;

const errorText = (err: unknown) =>
  err instanceof BoardImportError ? err.message : 'That could not be imported.';

// "White-vs-Black-2026.10.05.pgn", or "analysis.pgn" when the players are unknown
function pgnFileName(tree: GameTree) {
  const h = tree.headers ?? {};
  const parts = [h.White, h.Black].filter(p => p && p !== '?');
  const name = parts.length === 2 ? `${parts[0]}-vs-${parts[1]}${h.Date ? `-${h.Date}` : ''}` : 'analysis';
  return `${name.replace(/[^A-Za-z0-9._-]+/g, '_')}.pgn`;
}

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-chess-pgn' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const BoardView = ({ setPage }: BoardViewProps) => {

  // The full game tree. All state lives here.
  const [tree, setTree] = useState<GameTree>(() => createTree());

  // click-to-move: the selected piece and its legal destinations
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  // right-click square highlights (cleared by any left click, as on Lichess)
  const [rightClickHighlights, setRightClickHighlights] = useState<Record<string, string>>({});

  // a click-move that needs a promotion piece chosen first
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Which panel view is active, and any unsaved text typed into it (null = showing the live value)
  const [viewMode, setViewMode] = useState<'fen' | 'pgn'>('pgn');
  const [fenDraft, setFenDraft] = useState<string | null>(null);
  const [pgnDraft, setPgnDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  // Ref for the move history container so we can auto-scroll to the active move
  const moveListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentNode = getNodeAtPath(tree.root, tree.currentPath);
  const currentFen = currentNode.fen;
  const activeNodeId = tree.currentPath[tree.currentPath.length - 1] ?? null;

  // Full PGN (headers + every variation). Memoised: only rebuilds when the tree changes.
  const pgnText = useMemo(() => exportPgn(tree), [tree]);
  const status = useMemo(() => positionStatus(currentFen), [currentFen]);

  const clearSelection = () => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  };

  // replaces the whole analysis (import, FEN load, reset)
  const loadTree = (next: GameTree, note?: string) => {
    setTree(next);
    clearSelection();
    setRightClickHighlights({});
    setFenDraft(null);
    setPgnDraft(null);
    setMessage(note ? { kind: 'info', text: note } : null);
  };

  const confirmDiscard = () =>
    tree.root.children.length === 0 || window.confirm('Replace the current analysis? Its moves will be lost.');

  // -------------------------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------------------------

  // Jump to any node by providing the full path to it
  const goToPath = useCallback((newPath: string[]) => {
    setTree(prev => ({ ...prev, currentPath: newPath }));
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  // Step back one move (pop the last id from the path)
  const goBack = useCallback(() => {
    setTree(prev => (prev.currentPath.length === 0 ? prev : { ...prev, currentPath: prev.currentPath.slice(0, -1) }));
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  // Step forward one move along the main line (first child) of the current node
  const goForward = useCallback(() => {
    setTree(prev => {
      const node = getNodeAtPath(prev.root, prev.currentPath);
      if (node.children.length === 0) return prev;
      return { ...prev, currentPath: [...prev.currentPath, node.children[0].id] };
    });
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  const goToStart = useCallback(() => goToPath([]), [goToPath]);

  // End of the line you're on (not the game's main line), as on Lichess
  const goToEnd = useCallback(() => {
    setTree(prev => ({ ...prev, currentPath: mainLineFrom(prev.root, prev.currentPath) }));
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  // -------------------------------------------------------------------------
  // ARROW KEY NAVIGATION
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ignore keys while typing in the FEN / PGN boxes
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault(); // prevent page scroll
        goBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToStart();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToEnd();
      } else if (e.key === 'f') {
        setOrientation(o => (o === 'white' ? 'black' : 'white'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Clean up the listener when the component unmounts or dependencies change
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  // -------------------------------------------------------------------------
  // AUTO-SCROLL move list to keep the active move visible
  // -------------------------------------------------------------------------

  // a data attribute rather than a class: CSS Modules rename classes, so '.move-active' never matched
  useEffect(() => {
    const activeEl = moveListRef.current?.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [tree.currentPath]);

  // -------------------------------------------------------------------------
  // MAKING MOVES
  // -------------------------------------------------------------------------

  const makeMove = (from: Square, to: Square, promotion?: string): boolean => {
    const next = playMove(tree, { from, to, promotion });
    if (!next) return false;
    setTree(next);
    clearSelection();
    setRightClickHighlights({});
    return true;
  };

  // drag and drop; promotions don't arrive here — the board asks for the piece first
  const onPieceDrop = (source: Square, target: Square) => makeMove(source, target);

  // only offer the promotion picker for a move that is actually a legal promotion
  const onPromotionCheck = (source: Square, target: Square) => isPromotionMove(currentFen, source, target);

  // called with the chosen piece (e.g. "wN"), or with nothing if the picker was closed
  const onPromotionPieceSelect = (piece?: string, from?: Square, to?: Square): boolean => {
    const move = from && to ? { from, to } : pendingPromotion;
    setPendingPromotion(null);
    if (!piece || !move) return false;
    return makeMove(move.from, move.to, piece[1].toLowerCase());
  };

  const onSquareClick = (square: Square) => {
    // any left click clears right-click highlights
    setRightClickHighlights({});

    // If a piece is already selected, try to move it to the clicked square
    if (selectedSquare && selectedSquare !== square) {
      if (isPromotionMove(currentFen, selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      if (makeMove(selectedSquare, square)) return;
    }

    // otherwise select the clicked piece, if it can move
    const canMove = new Chess(currentFen).moves({ square, verbose: true }).length > 0;
    setSelectedSquare(canMove && square !== selectedSquare ? square : null);
  };

  const onSquareRightClick = (square: Square) => {
    setRightClickHighlights(prev => {
      // Toggle — right-clicking an already-highlighted square clears it
      if (prev[square]) {
        const next = { ...prev };
        delete next[square];
        return next;
      }
      return { ...prev, [square]: 'rgba(var(--color-coral-rgb), 0.5)' };
    });
  };

  // -------------------------------------------------------------------------
  // IMPORT / EXPORT
  // -------------------------------------------------------------------------

  const applyFen = () => {
    if (fenDraft === null) return;
    try {
      const next = importFen(fenDraft);
      if (!confirmDiscard()) return;
      loadTree(next);
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    }
  };

  const applyPgn = () => {
    if (pgnDraft === null) return;
    try {
      const { tree: next, gameCount } = importPgn(pgnDraft);
      if (!confirmDiscard()) return;
      loadTree(next, gameCount > 1 ? `That PGN had ${gameCount} games — the first one was imported.` : undefined);
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    }
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still triggers a change
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage({ kind: 'error', text: 'That file is too large to import.' });
      return;
    }
    file.text().then(text => {
      try {
        const { tree: next, note } = importAny(text, file.name);
        if (!confirmDiscard()) return;
        loadTree(next, note);
      } catch (err) {
        setMessage({ kind: 'error', text: errorText(err) });
      }
    });
  };

  const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text).then(
      () => setMessage({ kind: 'info', text: `${what} copied.` }),
      () => setMessage({ kind: 'error', text: `Couldn't copy the ${what}.` }),
    );
  };

  const resetBoard = () => {
    if (!confirmDiscard()) return;
    loadTree(createTree());
  };

  // -------------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------------

  // last move, check, selection + legal-move dots, then right-click marks on top
  const customSquareStyles = useMemo(() => {
    const out: Record<string, React.CSSProperties> = {};

    if (tree.currentPath.length > 0) {
      const parent = getNodeAtPath(tree.root, tree.currentPath.slice(0, -1));
      const last = moveSquares(parent.fen, currentNode.move);
      if (last) {
        out[last.from] = { backgroundColor: 'rgba(var(--color-amber-rgb), 0.28)' };
        out[last.to] = { backgroundColor: 'rgba(var(--color-amber-rgb), 0.4)' };
      }
    }

    const king = checkedKingSquare(currentFen);
    if (king) out[king] = { ...out[king], backgroundImage: 'radial-gradient(circle, rgba(220, 40, 40, 0.85) 0%, rgba(220, 40, 40, 0.35) 45%, transparent 75%)' };

    // colours go in backgroundColor and dots / glows in backgroundImage, so they layer instead of overwriting
    if (selectedSquare) {
      out[selectedSquare] = { ...out[selectedSquare], backgroundColor: 'var(--highlight-selected)' };
      for (const m of new Chess(currentFen).moves({ square: selectedSquare, verbose: true })) {
        out[m.to] = { ...out[m.to], backgroundImage: 'var(--highlight-dot)' };
      }
    }

    for (const [sq, colour] of Object.entries(rightClickHighlights)) out[sq] = { ...out[sq], backgroundColor: colour };
    return out;
  }, [tree, currentNode, currentFen, selectedSquare, rightClickHighlights]);

  const canGoBack = tree.currentPath.length > 0;
  const canGoForward = currentNode.children.length > 0;

  const players = tree.headers && (tree.headers.White || tree.headers.Black)
    ? `${tree.headers.White ?? '?'} vs ${tree.headers.Black ?? '?'}`
    : null;

return (
  <div className="app-layout">
    <Sidebar setPage={setPage} />

    {/* ----------------------------- BOARD ----------------------------- */}
    <main className={styles.boardViewMain}>
      <div className={styles.boardContainer}>
        <Chessboard
          position={currentFen}
          boardOrientation={orientation}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          onSquareRightClick={onSquareRightClick}
          onPromotionCheck={onPromotionCheck}
          onPromotionPieceSelect={onPromotionPieceSelect}
          showPromotionDialog={pendingPromotion !== null}
          promotionToSquare={pendingPromotion?.to ?? null}
          customSquareStyles={customSquareStyles}
          boardWidth={560}/>
      </div>

    {/* ----------------------------- PANEL ----------------------------- */}
      <div className={styles.boardPanel}>
        {/* whose move / game result, and the players of an imported game */}
        <div className={styles.statusBar}>
          <span className={status.over ? styles.statusOver : undefined}>{status.text}</span>
          {players && <span className={styles.players}>{players}</span>}
        </div>

        {/* Scrollable move list — grows/shrinks, own scrollbar */}
        <div className={styles.moveListScroll} ref={moveListRef}>
          <MoveList tree={tree} activeId={activeNodeId} onSelect={goToPath} />
        </div>

        {/* Navigation buttons — fixed, not part of the scroll */}
        <div className={styles.moveNav}>
          <button className={styles.navArrow} onClick={goToStart} disabled={!canGoBack} title="Start (↑)">
            <img src={farLeftArrow} className={iconStyles.icon} />
          </button>
          <button className={styles.navArrow} onClick={goBack} disabled={!canGoBack} title="Back (←)">
            <img src={leftArrow} className={iconStyles.icon} />
          </button>
          <button className={styles.navArrow} onClick={goForward} disabled={!canGoForward} title="Forward (→)">
            <img src={rightArrow} className={iconStyles.icon} />
          </button>
          <button className={styles.navArrow} onClick={goToEnd} disabled={!canGoForward} title="End of line (↓)">
            <img src={farRightArrow} className={iconStyles.icon} />
          </button>
        </div>

        {/* Import / Export / Flip / Reset — fixed, not part of the scroll */}
        <div className={styles.boardPanelActions}>
          <button className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()} title="Open a .pgn file (or a FEN / saved board)">
            <img src={importIcon} className={iconStyles.icon} /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".pgn,.txt,.fen,.json" style={{ display: 'none' }} onChange={importFile} />

          <button className={styles.btnSecondary} onClick={() => download(pgnFileName(tree), pgnText)} title="Download the game as a .pgn file">
            <img src={exportIcon} className={iconStyles.icon} /> Export
          </button>

          <button className={styles.btnSecondary} onClick={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))} title="Flip board (F)">
            <img src={flipIcon} className={iconStyles.icon} /> Flip
          </button>

          <button className={styles.btnReset} onClick={resetBoard}>
            <img src={resetIcon} className={iconStyles.icon} /> Reset
          </button>
        </div>

        {/* FEN / PGN toggle */}
        <div className={styles.toggleWrapper}>
          <button
            className={`${styles.fenToggleBtn} ${viewMode === 'fen' ? styles.toggleActive : ''}`}
            onClick={() => { setViewMode('fen'); setMessage(null); }}>
            FEN
          </button>
          <button
            className={`${styles.pgnToggleBtn} ${viewMode === 'pgn' ? styles.toggleActive : ''}`}
            onClick={() => { setViewMode('pgn'); setMessage(null); }}>
            PGN
          </button>
        </div>

        {/* FEN / PGN box — always pinned at the bottom. Shows the live value; typing creates a draft you load */}
        <div className={styles.dataPanel}>
          {viewMode === 'fen' && (
            <>
              <div className={styles.fenDisplay}>
                <textarea
                  className={styles.fenDisplayInput}
                  value={fenDraft ?? currentFen}
                  onChange={e => { setFenDraft(e.target.value); setMessage(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); applyFen(); }
                    if (e.key === 'Escape') { setFenDraft(null); setMessage(null); }
                  }}
                  placeholder="Paste a FEN and press Enter"
                  spellCheck={false}/>
              </div>

              <div className={styles.panelButtons}>
                {fenDraft !== null ? (
                  <>
                    <button className={`${styles.btnSecondary} ${styles.btnPrimarySmall}`} onClick={applyFen}>Load FEN</button>
                    <button className={styles.btnSecondary} onClick={() => { setFenDraft(null); setMessage(null); }}>Cancel</button>
                  </>
                ) : (
                  <button className={styles.btnSecondary} onClick={() => copy(currentFen, 'FEN')}>
                    <img src={copyIcon} className={iconStyles.icon} /> Copy FEN
                  </button>
                )}
              </div>
            </>
          )}

          {viewMode === 'pgn' && (
            <>
              <div className={styles.pgnDisplay}>
                <textarea
                  className={styles.pgnDisplayText}
                  value={pgnDraft ?? pgnText}
                  onChange={e => { setPgnDraft(e.target.value); setMessage(null); }}
                  onKeyDown={e => { if (e.key === 'Escape') { setPgnDraft(null); setMessage(null); } }}
                  placeholder="Paste a PGN, then Load PGN"
                  spellCheck={false}/>
              </div>

              <div className={styles.panelButtons}>
                {pgnDraft !== null ? (
                  <>
                    <button className={`${styles.btnSecondary} ${styles.btnPrimarySmall}`} onClick={applyPgn}>Load PGN</button>
                    <button className={styles.btnSecondary} onClick={() => { setPgnDraft(null); setMessage(null); }}>Cancel</button>
                  </>
                ) : (
                  <button className={styles.btnSecondary} onClick={() => copy(pgnText, 'PGN')}>
                    <img src={copyIcon} className={iconStyles.icon} /> Copy PGN
                  </button>
                )}
              </div>
            </>
          )}

          {message && (
            <p className={message.kind === 'error' ? styles.panelError : styles.panelInfo}>{message.text}</p>
          )}
        </div>
      </div>
    </main>
  </div>
  );}
export default BoardView
