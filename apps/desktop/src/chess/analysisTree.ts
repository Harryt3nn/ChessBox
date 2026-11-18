/*apps/desktop/src/chess/analysisTree.ts*/

import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js';
import { parse as parsePgn, split as splitPgn } from '@mliebelt/pgn-parser';
import type { MoveNode } from '../types/moveNode';
import type { GameTree } from '../types/gameTree';

// Pure helpers behind the analysis board: tree navigation and editing, move numbering,
// PGN / FEN import and export. No React in here, so it can be tested on its own.
//
// The move list and the PGN text are both built from the same token walk (gameTokens /
// variationTokens), so they can never disagree about numbering, variation order or comments.

export class BoardImportError extends Error {}

// keeps a pasted or opened file from freezing the app
const MAX_INPUT_CHARS = 1_000_000;
const MAX_NODES = 20_000;

const newId = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// TREE BASICS
// ---------------------------------------------------------------------------

export function createTree(fen: string = DEFAULT_POSITION, headers?: Record<string, string>): GameTree {
  return {
    root: { id: 'root', move: '', fen, children: [] },
    currentPath: [],
    headers,
  };
}

/** follows `path` from the root; stops early if an id isn't found */
export function getNodeAtPath(root: MoveNode, path: string[]): MoveNode {
  let node = root;
  for (const id of path) {
    const next = node.children.find(c => c.id === id);
    if (!next) break;
    node = next;
  }
  return node;
}

/** the SAN moves from the root to the node at `path`; stops early if an id isn't found */
export function movesAlongPath(root: MoveNode, path: string[]): string[] {
  const moves: string[] = [];
  let node = root;
  for (const id of path) {
    const next = node.children.find(c => c.id === id);
    if (!next) break;
    moves.push(next.move);
    node = next;
  }
  return moves;
}

/** `path` extended along the main line (children[0]) to its end */
export function mainLineFrom(root: MoveNode, path: string[]): string[] {
  const out = [...path];
  let node = getNodeAtPath(root, path);
  while (node.children.length > 0) {
    node = node.children[0];
    out.push(node.id);
  }
  return out;
}

/** a copy of `node` with `child` appended under the node at `parentPath` */
function withChild(node: MoveNode, parentPath: string[], child: MoveNode): MoveNode {
  if (parentPath.length === 0) return { ...node, children: [...node.children, child] };
  const [head, ...rest] = parentPath;
  return { ...node, children: node.children.map(c => (c.id === head ? withChild(c, rest, child) : c)) };
}

/**
 * plays a move from the current position; returns the new tree, or null if it's illegal.
 * If that move already exists from this position, it moves to it instead of duplicating it.
 */
export function playMove(tree: GameTree, move: { from: string; to: string; promotion?: string }): GameTree | null {
  const current = getNodeAtPath(tree.root, tree.currentPath);
  const chess = new Chess(current.fen);

  let result;
  try {
    result = chess.move(move);
  } catch {
    return null;
  }

  const existing = current.children.find(c => c.move === result.san);
  if (existing) return { ...tree, currentPath: [...tree.currentPath, existing.id] };

  const node: MoveNode = { id: newId(), move: result.san, fen: chess.fen(), children: [] };
  return {
    ...tree,
    root: withChild(tree.root, tree.currentPath, node),
    currentPath: [...tree.currentPath, node.id],
  };
}

/** true if moving `from` → `to` in `fen` is a legal pawn promotion */
export function isPromotionMove(fen: string, from: string, to: string): boolean {
  try {
    return new Chess(fen).moves({ verbose: true }).some(m => m.from === from && m.to === to && !!m.promotion);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// MOVE NUMBERING
// ---------------------------------------------------------------------------

/** move number and colour of the `ply`-th move after the root position (ply 1 = first move) */
export function plyInfo(rootFen: string, ply: number): { moveNumber: number; isWhite: boolean } {
  const parts = rootFen.split(' ');
  const startNumber = parseInt(parts[5], 10) || 1;
  const offset = parts[1] === 'b' ? 1 : 0; // a black-to-move start shifts every ply by one
  const index = ply - 1 + offset;
  return { moveNumber: startNumber + Math.floor(index / 2), isWhite: index % 2 === 0 };
}

/** "1. e4 e5 2. Nf3", or "2... Nc6 3. Bb5" when the line starts with Black */
export function numberedLine(rootFen: string, sans: string[], startPly = 1): string {
  return sans.map((san, i) => {
    const { moveNumber, isWhite } = plyInfo(rootFen, startPly + i);
    if (isWhite) return `${moveNumber}. ${san}`;
    return i === 0 ? `${moveNumber}... ${san}` : san;
  }).join(' ');
}

const NAG_SYMBOLS: Record<string, string> = {
  $1: '!', $2: '?', $3: '!!', $4: '??', $5: '!?', $6: '?!',
};

/** "$1" → "!" for display; unknown NAGs show nothing */
export function nagSymbol(nag: string): string {
  return NAG_SYMBOLS[nag] ?? '';
}

// ---------------------------------------------------------------------------
// TOKENS — the single source for the move list and the PGN export
// ---------------------------------------------------------------------------

export type MoveToken = { type: 'move'; node: MoveNode; path: string[]; prefix: string; ply: number };
export type LineToken = MoveToken | { type: 'comment'; text: string } | { type: 'open' } | { type: 'close' };

function moveToken(rootFen: string, node: MoveNode, path: string[], ply: number, forceNumber: boolean): MoveToken {
  const { moveNumber, isWhite } = plyInfo(rootFen, ply);
  const prefix = isWhite ? `${moveNumber}.` : forceNumber ? `${moveNumber}...` : '';
  return { type: 'move', node, path, prefix, ply };
}

/**
 * Everything after `parent`: its main reply, then alternatives to that reply in brackets,
 * then the rest of the main line — PGN order: 1. e4 (1. d4 d5) 1... e5
 * A black move is numbered ("1...") when it starts a line or follows a comment or variation.
 */
function continuationTokens(rootFen: string, parent: MoveNode, parentPath: string[], parentPly: number, forceNumber: boolean): LineToken[] {
  const tokens: LineToken[] = [];
  let node = parent;
  let path = parentPath;
  let ply = parentPly;
  let force = forceNumber;

  // the main line is walked in a loop (long games can't overflow the stack); only nested variations recurse
  while (node.children.length > 0) {
    const [main, ...alternatives] = node.children;
    const mainPath = [...path, main.id];

    tokens.push(moveToken(rootFen, main, mainPath, ply + 1, force));
    if (main.comment) tokens.push({ type: 'comment', text: main.comment });

    for (const alt of alternatives) {
      tokens.push({ type: 'open' }, ...variationTokens(rootFen, alt, path, ply), { type: 'close' });
    }

    force = alternatives.length > 0 || !!main.comment;
    node = main;
    path = mainPath;
    ply += 1;
  }

  return tokens;
}

/** a variation: the alternative move `first` (played from the node at `parentPath`) and everything after it */
export function variationTokens(rootFen: string, first: MoveNode, parentPath: string[], parentPly: number): LineToken[] {
  const path = [...parentPath, first.id];
  const tokens: LineToken[] = [moveToken(rootFen, first, path, parentPly + 1, true)];
  if (first.comment) tokens.push({ type: 'comment', text: first.comment });
  tokens.push(...continuationTokens(rootFen, first, path, parentPly + 1, !!first.comment));
  return tokens;
}

/** the whole game, from the starting position */
export function gameTokens(tree: GameTree): LineToken[] {
  return continuationTokens(tree.root.fen, tree.root, [], 0, true);
}

// ---------------------------------------------------------------------------
// GAME STATE
// ---------------------------------------------------------------------------

export interface PositionStatus {
  text: string;
  over: boolean;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
}

export function positionStatus(fen: string): PositionStatus {
  const chess = new Chess(fen);
  const toMove = chess.turn() === 'w' ? 'White' : 'Black';

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    return { text: `Checkmate — ${winner} wins`, over: true, result: winner === 'White' ? '1-0' : '0-1' };
  }
  if (chess.isStalemate()) return { text: 'Stalemate — draw', over: true, result: '1/2-1/2' };
  if (chess.isInsufficientMaterial()) return { text: 'Draw — insufficient material', over: true, result: '1/2-1/2' };

  // the fifty-move rule is a draw that can be *claimed*, not an automatic end, so the game carries on
  const fifty = chess.isDrawByFiftyMoves() ? ' — fifty-move draw can be claimed' : '';
  return { text: `${toMove} to move${chess.inCheck() ? ' — check' : ''}${fifty}`, over: false, result: '*' };
}

/** from/to squares of the move that led to `node` (for the last-move highlight) */
export function moveSquares(parentFen: string, san: string): { from: string; to: string } | null {
  try {
    const m = new Chess(parentFen).move(san);
    return { from: m.from, to: m.to };
  } catch {
    return null;
  }
}

/** square of the king that is in check in `fen`, if any */
export function checkedKingSquare(fen: string): string | null {
  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq && sq.type === 'k' && sq.color === chess.turn()) return sq.square;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const escapeTag = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
// "}" would end a PGN comment early
const escapeComment = (v: string) => v.replace(/}/g, ')');

/** movetext from tokens: 1. e4 { comment } 1... e5 (1... c5 2. Nf3) 2. Nf3 */
export function tokensToMovetext(tokens: LineToken[]): string {
  const parts: string[] = [];
  for (const t of tokens) {
    if (t.type === 'move') {
      const nags = (t.node.nags ?? []).join(' ');
      parts.push([t.prefix, t.node.move, nags].filter(Boolean).join(' '));
    } else if (t.type === 'comment') {
      parts.push(`{ ${escapeComment(t.text)} }`);
    } else {
      parts.push(t.type === 'open' ? '(' : ')');
    }
  }
  return parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
}

/** full PGN: the seven standard tags (plus FEN/SetUp for a custom start), then every move and variation */
export function exportPgn(tree: GameTree): string {
  const headers = { ...(tree.headers ?? {}) };
  delete headers.FEN;
  delete headers.SetUp;

  // a finished main line decides the result; otherwise keep an imported one
  const end = getNodeAtPath(tree.root, mainLineFrom(tree.root, []));
  const status = positionStatus(end.fen);
  const result = status.over ? status.result : headers.Result ?? '*';

  const roster: [string, string][] = [
    ['Event', headers.Event ?? 'ChessBox analysis'],
    ['Site', headers.Site ?? '?'],
    ['Date', headers.Date ?? today()],
    ['Round', headers.Round ?? '?'],
    ['White', headers.White ?? '?'],
    ['Black', headers.Black ?? '?'],
    ['Result', result],
  ];
  const rosterKeys = new Set(roster.map(([k]) => k));
  const extra = Object.entries(headers).filter(([k]) => !rosterKeys.has(k));
  if (tree.root.fen !== DEFAULT_POSITION) extra.push(['FEN', tree.root.fen], ['SetUp', '1']);

  const tagText = [...roster, ...extra].map(([k, v]) => `[${k} "${escapeTag(v)}"]`).join('\n');
  const movetext = tokensToMovetext(gameTokens(tree));
  return `${tagText}\n\n${movetext ? `${movetext} ` : ''}${result}\n`;
}

// ---------------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------------

/**
 * why `fen` can't be played from, or null if it can. chess.js checks the layout; on top of that
 * the side that just moved can't be in check, or the side to move could capture a king.
 */
export function fenProblem(fen: string): string | null {
  const check = validateFen(fen);
  // chess.js messages already start with "Invalid FEN:"
  if (!check.ok) return check.error ?? 'Invalid FEN.';

  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-'; // an en passant square is only valid for the real side to move
  if (new Chess(parts.join(' ')).inCheck()) return 'Invalid FEN: the side that just moved is in check.';
  return null;
}

/** a position: validates the FEN and starts a fresh analysis from it */
export function importFen(text: string): GameTree {
  const fen = text.trim().replace(/\s+/g, ' ');
  const problem = fenProblem(fen);
  if (problem) throw new BoardImportError(problem);
  return createTree(fen);
}

type ParsedMove = {
  moveNumber?: number | null;
  turn?: string;
  notation: { notation: string };
  variations?: ParsedMove[][];
  commentAfter?: string;
  nag?: string[] | null;
};

function tagValue(v: unknown): string | null {
  if (typeof v === 'string') return v;
  // the parser turns numeric tags (WhiteElo, PlyCount, ...) into numbers
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string') {
    return (v as { value: string }).value;
  }
  return null;
}

/**
 * a PGN game, including variations, comments and NAGs. Every move is replayed through chess.js,
 * so an illegal move is reported with its move number instead of producing a broken tree.
 * With several games in the text, the first is imported (`gameCount` says how many there were).
 */
export function importPgn(text: string): { tree: GameTree; gameCount: number } {
  if (text.length > MAX_INPUT_CHARS) throw new BoardImportError('That PGN is too large to import.');
  const trimmed = text.trim();
  if (!trimmed) throw new BoardImportError('Paste a PGN first.');

  let games: { all: string }[];
  try {
    games = splitPgn(trimmed, { startRule: 'games' }) as { all: string }[];
  } catch {
    games = [{ all: trimmed }];
  }
  if (games.length === 0) throw new BoardImportError('No game found in that PGN.');

  let parsed: { tags?: Record<string, unknown>; moves: ParsedMove[] };
  try {
    parsed = parsePgn(games[0].all, { startRule: 'game' }) as unknown as typeof parsed;
  } catch (err) {
    const loc = (err as { location?: { start?: { line: number; column: number } } }).location?.start;
    throw new BoardImportError(loc ? `Couldn't read the PGN near line ${loc.line}, column ${loc.column}.` : "Couldn't read the PGN.");
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.tags ?? {})) {
    const value = tagValue(v);
    if (k !== 'messages' && value !== null) headers[k] = value;
  }

  const startFen = headers.FEN?.trim() || DEFAULT_POSITION;
  const fenError = fenProblem(startFen);
  if (fenError) throw new BoardImportError(`The PGN's FEN tag is invalid: ${fenError}`);

  const tree = createTree(startFen, headers);
  let count = 0;

  // `moves` is a line played from `start`; each move's variations are alternatives to it
  const addLine = (moves: ParsedMove[], start: MoveNode, startPly: number) => {
    let parent = start;
    let ply = startPly;

    for (const m of moves) {
      const san = m.notation?.notation;
      const chess = new Chess(parent.fen);
      let played;
      try {
        played = chess.move(san);
      } catch {
        const { moveNumber, isWhite } = plyInfo(startFen, ply + 1);
        throw new BoardImportError(`Illegal move ${moveNumber}${isWhite ? '.' : '...'} ${san}`);
      }

      if (++count > MAX_NODES) throw new BoardImportError(`That PGN has more than ${MAX_NODES} moves.`);

      let child = parent.children.find(c => c.move === played.san);
      if (!child) {
        child = { id: newId(), move: played.san, fen: chess.fen(), children: [] };
        parent.children.push(child);
      }
      const comment = m.commentAfter?.trim();
      if (comment) child.comment = comment;
      const nags = (m.nag ?? []).filter(n => /^\$\d{1,3}$/.test(n));
      if (nags.length) child.nags = nags;

      // added after the main move, so the main move stays children[0]
      for (const variation of m.variations ?? []) addLine(variation, parent, ply);

      parent = child;
      ply += 1;
    }
  };

  addLine(parsed.moves ?? [], tree.root, 0);
  return { tree, gameCount: games.length };
}

/** a game tree saved by the old "Save" button (JSON); every move is replayed and re-validated */
export function importLegacyJson(text: string): GameTree {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BoardImportError('That file is not valid JSON.');
  }

  const root = (data as { root?: { fen?: unknown } })?.root;
  if (!root || typeof root.fen !== 'string' || fenProblem(root.fen) !== null) {
    throw new BoardImportError('That JSON file is not a saved analysis board.');
  }

  const tree = createTree(root.fen);
  let count = 0;
  const stack: [unknown, MoveNode][] = [[root, tree.root]];

  for (let item = stack.pop(); item; item = stack.pop()) {
    const [raw, node] = item;
    const children = (raw as { children?: unknown }).children;
    if (!Array.isArray(children)) continue;

    for (const c of children) {
      const san = (c as { move?: unknown })?.move;
      if (typeof san !== 'string') continue;
      const chess = new Chess(node.fen);
      let played;
      try {
        played = chess.move(san);
      } catch {
        continue; // skip anything that isn't a legal move from here
      }
      if (++count > MAX_NODES) throw new BoardImportError(`That file has more than ${MAX_NODES} moves.`);
      const child: MoveNode = { id: newId(), move: played.san, fen: chess.fen(), children: [] };
      node.children.push(child);
      stack.push([c, child]);
    }
  }

  return tree;
}

// a PGN may also start with "{" (a leading comment), so only real JSON counts
function isJsonObject(text: string): boolean {
  if (!text.startsWith('{')) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** works out what was pasted or opened: a saved JSON board, a FEN, or a PGN */
export function importAny(text: string, fileName = ''): { tree: GameTree; note?: string } {
  const trimmed = text.trim();
  if (fileName.toLowerCase().endsWith('.json') || isJsonObject(trimmed)) {
    return { tree: importLegacyJson(trimmed) };
  }
  if (!trimmed.includes('\n') && validateFen(trimmed.replace(/\s+/g, ' ')).ok) {
    return { tree: importFen(trimmed) };
  }
  const { tree, gameCount } = importPgn(trimmed);
  return { tree, note: gameCount > 1 ? `That file had ${gameCount} games — the first one was imported.` : undefined };
}
