/* src/pages/BoardView.tsx */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Settings from './Settings';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';

type Page = 'home' | 'settings';

// ---------------------------------------------------------------------------
// GAME TREE TYPES
// ---------------------------------------------------------------------------
// The game is stored as a tree of MoveNodes rather than a flat list, allowing
// for variations. The root is a virtual "before any moves" node — its FEN is
// the starting position and its move is an empty string. currentPath is the
// list of node IDs from root down to whatever position is currently displayed.
// An empty path means we're at the root.

type MoveNode = {
  id: string;
  move: string;         // SAN, e.g. "Nf3"
  fen: string;           // board position AFTER this move
  children: MoveNode[];  // possible continuations from this position
};

type GameTree = {
  root: MoveNode;
  currentPath: string[];
};

// ---------------------------------------------------------------------------
// TREE HELPERS
// ---------------------------------------------------------------------------

// id generator
let nodeCounter = 0;
const newNodeId = () => `node-${++nodeCounter}`;

// generate new game tree, with just a root node
const createInitialTree = (): GameTree => ({
  root: {
    id: 'root',
    move: '',
    fen: new Chess().fen(),
    children: [],
  },
  currentPath: [],
});

// Walks the tree following the given path and returns the node at the end.
// Returns root if path is empty.
const getNodeAtPath = (root: MoveNode, path: string[]): MoveNode => {
  let node = root;
  for (const id of path) {
    const next = node.children.find(c => c.id === id);
    if (!next) break; // should never happen if path is valid
    node = next;
  }
  return node;
};

// Returns the FEN at the end of the current path (the position to display)
const getCurrentFen = (tree: GameTree): string => getNodeAtPath(tree.root, tree.currentPath).fen;

// Returns the flat move list along the current path, paired with their node IDs.
// Used to render the move history panel.
const getPathMoves = (root: MoveNode, path: string[]):
 { id: string; move: string }[] => {
  const result: { id: string; move: string }[] = [];
  let node = root;
  for (const id of path) {
    const next = node.children.find(c => c.id === id);
    if (!next) break;
    result.push({ id: next.id, move: next.move });
    node = next;
  }
  return result;
};

// Deep-clones a MoveNode tree so React state updates are immutable
const cloneNode = (node: MoveNode): MoveNode => ({
  ...node,
  children: node.children.map(cloneNode),
});

// Inserts a new child node under the node with the given parentId.
// Returns a new root with the insertion applied (immutable update).
const insertChild = (root: MoveNode, parentId: string, child: MoveNode): MoveNode => {
  if (root.id === parentId) {
    return { ...root, children: [...root.children, child] };
  }
  return {
    ...root,
    children: root.children.map(c => insertChild(c, parentId, child)),
  };
};

// ---------------------------------------------------------------------------
// PGN HELPERS
// ---------------------------------------------------------------------------
// Unlike getPathMoves (which only follows the single line you're currently
// viewing), generateMoves walks the WHOLE tree, since a proper PGN needs to
// include every variation, not just the active line.

// Recursively walks the tree, emitting SAN with variations in parentheses.
// `isWhite` tracks whose move it is; `needsMoveNum` forces a "12..." prefix
// when resuming the main line right after a variation closes.
const generateMoves = (
  node: MoveNode,
  moveNum: number,
  isWhite: boolean,
  needsMoveNum: boolean = false
): string => {
  if (node.children.length === 0) return '';

  const main = node.children[0];
  const variations = node.children.slice(1);

  let result = '';

  if (isWhite) {
    result += `${moveNum}. `;
  } else if (needsMoveNum) {
    result += `${moveNum}... `;
  }

  result += main.move + ' ';

  for (const v of variations) {
    const prefix = isWhite ? `${moveNum}.` : `${moveNum}...`;
    result += `( ${prefix} ${v.move} `;
    result += generateMoves(v, isWhite ? moveNum : moveNum + 1, !isWhite, false);
    result += ') ';
  }

  result += generateMoves(
    main,
    isWhite ? moveNum : moveNum + 1,
    !isWhite,
    variations.length > 0
  );

  return result;
};

// Builds a full PGN string (headers + movetext) for the given tree.
const buildPgn = (tree: GameTree): string => {
  const parts = tree.root.fen.split(' ');
  const startMoveNum = parseInt(parts[5], 10) || 1;
  const startIsWhite = parts[1] === 'w';
  const isStartPos = tree.root.fen === new Chess().fen();

  const headers = [
    '[Event "?"]',
    '[Site "?"]',
    '[Date "????.??.??"]',
    '[Round "?"]',
    '[White "?"]',
    '[Black "?"]',
    '[Result "*"]',
    ...(!isStartPos ? [`[FEN "${tree.root.fen}"]`, '[SetUp "1"]'] : []),
  ].join('\n');

  const moves = generateMoves(tree.root, startMoveNum, startIsWhite);
  return `${headers}\n\n${moves}*`;
};

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

const BoardView = ({ onBack }: { onBack: () => void }) => {
  const [page, setPage] = useState<Page>('home');

  // The full game tree. All state lives here.
  const [tree, setTree] = useState<GameTree>(createInitialTree);

  // Square highlight state for legal move dots and selected piece
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, string>>({});
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Right-click highlight state (separate from legal-move highlights so the
  // two never clobber each other when merged into customSquareStyles)
  const [rightClickHighlights, setRightClickHighlights] = useState<Record<string, string>>({});

  // Which panel view is active: move list, FEN editor, or PGN viewer
  const [viewMode, setViewMode] = useState<'san' | 'fen' | 'pgn'>('san');

  // Ref for the move history container so we can auto-scroll to the active move
  const moveListRef = useRef<HTMLDivElement>(null);

  if (page === 'settings') return <Settings onBack={onBack} />;

  // -------------------------------------------------------------------------
  // RIGHT-CLICK SQUARE HIGHLIGHTING
  // -------------------------------------------------------------------------

  const onSquareRightClick = (square: Square) => {
    const sq = square as string;
    setRightClickHighlights(prev => {
      // Toggle — right-clicking an already-highlighted square clears it
      if (prev[sq]) {
        const next = { ...prev };
        delete next[sq];
        return next;
      }
      return { ...prev, [sq]: `rgba(var(--color-coral-rgb), 0.5)` };
    });
  };

  // -------------------------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------------------------

  // Jump to any node by providing the full path to it
  const goToPath = useCallback((newPath: string[]) => {
    setTree(prev => ({ ...prev, currentPath: newPath }));
    setHighlightedSquares({});
    setSelectedSquare(null);
  }, []);

  // Step back one move (pop the last id from the path)
  const goBack = useCallback(() => {
    setTree(prev => {
      if (prev.currentPath.length === 0) return prev;
      return { ...prev, currentPath: prev.currentPath.slice(0, -1) };
    });
    setHighlightedSquares({});
    setSelectedSquare(null);
  }, []);

  // Step forward one move along the FIRST (main) child of the current node.
  // If there are multiple children (variations), this follows the first one.
  const goForward = useCallback(() => {
    setTree(prev => {
      const currentNode = getNodeAtPath(prev.root, prev.currentPath);
      if (currentNode.children.length === 0) return prev;
      const nextId = currentNode.children[0].id;
      return { ...prev, currentPath: [...prev.currentPath, nextId] };
    });
    setHighlightedSquares({});
    setSelectedSquare(null);
  }, []);

  const goToStart = useCallback(() => goToPath([]), [goToPath]);

  const goToEnd = useCallback(() => {
    // Follow the first child at each level until we reach a leaf
    setTree(prev => {
      const path: string[] = [];
      let node = prev.root;
      while (node.children.length > 0) {
        const next = node.children[0];
        path.push(next.id);
        node = next;
      }
      return { ...prev, currentPath: path };
    });
    setHighlightedSquares({});
    setSelectedSquare(null);
  }, []);

  // -------------------------------------------------------------------------
  // ARROW KEY NAVIGATION
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys; ignore if user is typing in an input
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Clean up the listener when the component unmounts or dependencies change
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  // -------------------------------------------------------------------------
  // AUTO-SCROLL move list to keep the active move visible
  // -------------------------------------------------------------------------

  useEffect(() => {
    const activeEl = moveListRef.current?.querySelector('.move-active');
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [tree.currentPath]);

  // -------------------------------------------------------------------------
  // MAKING MOVES
  // -------------------------------------------------------------------------

  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      // Build a Chess instance at the current position so chess.js can validate
      const chess = new Chess(getCurrentFen(tree));

      let move;
      try {
        move = chess.move({ from, to, promotion: 'q' });
        if (!move) return false;
      } catch {
        return false;
      }

      // The SAN of the move just played, e.g. "Nf3"
      const san = move.san;
      const newFen = chess.fen();

      setTree(prev => {
        const currentNode = getNodeAtPath(prev.root, prev.currentPath);

        // Check if this move already exists as a child of the current node.
        // If it does, we just navigate to it rather than creating a duplicate.
        const existingChild = currentNode.children.find(c => c.move === san);
        if (existingChild) {
          return {
            ...prev,
            currentPath: [...prev.currentPath, existingChild.id],
          };
        }

        // Otherwise, create a new child node and insert it into the tree.
        // If other children already exist, this new move becomes a variation.
        const newNode: MoveNode = {
          id: newNodeId(),
          move: san,
          fen: newFen,
          children: [],
        };

        const newRoot = insertChild(cloneNode(prev.root), currentNode.id, newNode);
        return {
          root: newRoot,
          currentPath: [...prev.currentPath, newNode.id],
        };
      });

      setHighlightedSquares({});
      setSelectedSquare(null);
      return true;
    },
    [tree]
  );

  const onPieceDrop = (source: Square, target: Square) => makeMove(source, target);

  const onSquareClick = (square: Square) => {
    const sq = square as string;

    // If a piece is already selected, try to move it to the clicked square
    if (selectedSquare) {
      const moved = makeMove(selectedSquare as Square, square);
      if (moved) return;
    }

    // Show legal move dots for the piece on the clicked square
    const chess = new Chess(getCurrentFen(tree));
    const moves = chess.moves({ square, verbose: true });

    if (moves.length === 0) {
      setHighlightedSquares({});
      setSelectedSquare(null);
      return;
    }

    const newHighlights: Record<string, string> = {};
    moves.forEach(m => {
      newHighlights[m.to as string] = 'var(--highlight-dot)';
    });
    newHighlights[sq] = 'var(--highlight-selected)';

    setHighlightedSquares(newHighlights);
    setSelectedSquare(sq);
  };

  // -------------------------------------------------------------------------
  // SAVE / LOAD / RESET
  // -------------------------------------------------------------------------

  // Export the full game tree as a JSON file.
  // The chess graph page can import this same JSON and render the tree as a graph.
  const saveGame = () => {
    const json = JSON.stringify(tree, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load a previously saved game tree JSON file
  const loadGame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded: GameTree = JSON.parse(ev.target?.result as string);
        setTree(loaded);
        setHighlightedSquares({});
        setSelectedSquare(null);
      } catch {
        alert('Invalid game file.');
      }
    };
    reader.readAsText(file);
  };

  const resetBoard = () => {
    nodeCounter = 0;
    setTree(createInitialTree());
    setHighlightedSquares({});
    setSelectedSquare(null);
  };

  // -------------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------------

  // Merge legal-move dots and right-click highlights into one style map
  const customSquareStyles = Object.fromEntries([
    ...Object.entries(highlightedSquares).map(([sq, cssVar]) => [sq, { background: cssVar }]),
    ...Object.entries(rightClickHighlights).map(([sq, color]) => [sq, { background: color }]),
  ]);

  // Get the flat move list for the current path, for rendering in the SAN panel
  const pathMoves = getPathMoves(tree.root, tree.currentPath);

  // Full PGN (headers + movetext, ALL variations included) for the PGN panel.
  // Memoised so it only rebuilds when the tree itself changes — not on every
  // render (e.g. clicking around to highlight squares doesn't touch `tree`).
  const pgnText = useMemo(() => buildPgn(tree), [tree]);

  // The ID of the node currently at the END of the path (the active move)
  const activeNodeId = tree.currentPath[tree.currentPath.length - 1] ?? null;

  // Group moves into pairs for "1. e4 e5" row layout.
  // startMoveNumber comes from the loaded FEN's fullmove field, so a position
  // loaded mid-game (e.g. move 23) continues numbering from there instead of
  // restarting at move 1.
  const startMoveNumber = parseInt(tree.root.fen.split(' ')[5], 10) || 1;

  const movePairs: Array<{
    num: number;
    white: { id: string; move: string };
    black?: { id: string; move: string };
  }> = [];
  for (let i = 0; i < pathMoves.length; i += 2) {
    movePairs.push({
      num: startMoveNumber + Math.floor(i / 2),
      white: pathMoves[i],
      black: pathMoves[i + 1],
    });
  }

  // Variations: siblings of the currently active node (other moves available at this depth)
  const getCurrentNodeVariations = (): MoveNode[] => {
    if (tree.currentPath.length === 0) return tree.root.children;
    const parentPath = tree.currentPath.slice(0, -1);
    const parent = getNodeAtPath(tree.root, parentPath);
    return parent.children;
  };
  const variations = getCurrentNodeVariations();
  const hasVariations = variations.length > 1;

  const canGoBack = tree.currentPath.length > 0;
  const canGoForward = getNodeAtPath(tree.root, tree.currentPath).children.length > 0;

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <div className="app-layout">
      {/* ----------------------------- SIDEBAR ----------------------------- */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <i className="fa-solid fa-chess-queen"></i>
          <span>CTT</span>
        </div>
        <nav className="sidebar-nav"></nav>
        <div className="sidebar-bottom">
          <button className="nav-btn" onClick={onBack}>
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </button>
          <button className="nav-btn" onClick={() => setPage('settings')}>
            <i className="fa-solid fa-gear"></i>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="board-view-main">
        {/* ----------------------------- BOARD ----------------------------- */}
        <div className="board-container">
          <Chessboard
            onSquareRightClick={onSquareRightClick}
            position={getCurrentFen(tree)}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            customSquareStyles={customSquareStyles}
            boardWidth={560}
          />
        </div>

        {/* ----------------------------- PANEL ----------------------------- */}
        <div className="board-panel">
          {/* View toggle: SAN / FEN / PGN */}
          <div className="toggle-wrapper">
            <button
              className={`san-toggle-btn ${viewMode === 'san' ? 'toggle-active' : ''}`}
              onClick={() => setViewMode('san')}
            >
              SAN
            </button>
            <button
              className={`fen-toggle-btn ${viewMode === 'fen' ? 'toggle-active' : ''}`}
              onClick={() => setViewMode('fen')}
            >
              FEN
            </button>
            <button
              className={`pgn-toggle-btn ${viewMode === 'pgn' ? 'toggle-active' : ''}`}
              onClick={() => setViewMode('pgn')}
            >
              PGN
            </button>
          </div>

          {/* ---------------------- SAN VIEW ---------------------- */}
          {viewMode === 'san' && (
            <>
              {/* Move list — one pair per row: "1. e4 e5" */}
              <div className="move-history" ref={moveListRef}>
                {movePairs.length === 0 ? (
                  <span className="move-history-empty">No moves yet</span>
                ) : (
                  movePairs.map(({ num, white, black }) => (
                    <div key={num} className="move-row">
                      <span className="move-number">{num}.</span>

                      <span
                        className={`move-text ${white.id === activeNodeId ? 'move-active' : ''}`}
                        onClick={() => {
                          const idx = pathMoves.findIndex(m => m.id === white.id);
                          goToPath(pathMoves.slice(0, idx + 1).map(m => m.id));
                        }}
                      >
                        {white.move}
                      </span>

                      {black && (
                        <span
                          className={`move-text ${black.id === activeNodeId ? 'move-active' : ''}`}
                          onClick={() => {
                            const idx = pathMoves.findIndex(m => m.id === black.id);
                            goToPath(pathMoves.slice(0, idx + 1).map(m => m.id));
                          }}
                        >
                          {black.move}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Variation switcher — only visible when multiple moves exist at this depth */}
              {hasVariations && (
                <div className="variation-list">
                  <span className="variation-label">Variations:</span>
                  {variations.map((v, i) => {
                    const parentPath = tree.currentPath.slice(0, -1);
                    const varPath = [...parentPath, v.id];
                    const isActive = v.id === tree.currentPath[tree.currentPath.length - 1];
                    return (
                      <span
                        key={v.id}
                        className={`variation-item ${isActive ? 'variation-active' : ''}`}
                        onClick={() => goToPath(varPath)}
                      >
                        {i === 0 ? 'Main' : `Var ${i}`}: {v.move}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Navigation buttons — arrow keys also work (←→↑↓) */}
              <div className="move-nav">
                <button className="nav-arrow" onClick={goToStart} disabled={!canGoBack} title="Start (↑)">
                  <i className="fa-solid fa-backward-fast"></i>
                </button>
                <button className="nav-arrow" onClick={goBack} disabled={!canGoBack} title="Back (←)">
                  <i className="fa-solid fa-backward-step"></i>
                </button>
                <button className="nav-arrow" onClick={goForward} disabled={!canGoForward} title="Forward (→)">
                  <i className="fa-solid fa-forward-step"></i>
                </button>
                <button className="nav-arrow" onClick={goToEnd} disabled={!canGoForward} title="End (↓)">
                  <i className="fa-solid fa-forward-fast"></i>
                </button>
              </div>

              {/* Save / Load / Reset */}
              <div className="board-panel-actions">
                <button className="btn-secondary" onClick={saveGame}>
                  <i className="fa-solid fa-floppy-disk"></i> Save
                </button>

                {/* File input is hidden; the label acts as the visible button */}
                <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                  <i className="fa-solid fa-folder-open"></i> Load
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadGame} />
                </label>

                <button className="btn-reset" onClick={resetBoard}>
                  <i className="fa-solid fa-rotate-left"></i> Reset
                </button>
              </div>
            </>
          )}

          {/* ---------------------- FEN VIEW ---------------------- */}
          {viewMode === 'fen' && (
            <>
              <div className="fen-display">
                <textarea
                  className="fen-display-input"
                  value={getCurrentFen(tree)}
                  onChange={e => {
                    try {
                      const chess = new Chess(e.target.value);
                      setTree({
                        root: { id: 'root', move: '', fen: chess.fen(), children: [] },
                        currentPath: [],
                      });
                      setHighlightedSquares({});
                      setSelectedSquare(null);
                    } catch {
                      // Invalid or incomplete FEN mid-type — silently ignore
                    }
                  }}
                  spellCheck={false}
                />
              </div>

              <div className="board-panel-actions">
                <button
                  className="btn-secondary panel-copy-btn"
                  onClick={() => navigator.clipboard.writeText(getCurrentFen(tree))}
                >
                  <i className="fa-regular fa-copy"></i> Copy FEN
                </button>
              </div>
            </>
          )}

          {/* ---------------------- PGN VIEW ---------------------- */}
          {viewMode === 'pgn' && (
            <>
              <div className="pgn-display">
                <textarea
                  className="pgn-display-text"
                  value={pgnText}
                  readOnly
                  spellCheck={false}
                />
              </div>

              <div className="board-panel-actions">
                <button
                  className="btn-secondary panel-copy-btn"
                  onClick={() => navigator.clipboard.writeText(pgnText)}
                >
                  <i className="fa-regular fa-copy"></i> Copy PGN
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BoardView;