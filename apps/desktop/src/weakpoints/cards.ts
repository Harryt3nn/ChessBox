/*apps/desktop/src/weakpoints/cards.ts*/

import { Chess, DEFAULT_POSITION } from 'chess.js';
import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import type { NoveltyFile } from '../novelty/results';
import { childrenOf } from '../chess/repertoireTree';

// WeakPoints (D21, D30–D35): which repertoire positions become drill cards, the line that leads into
// each one, and FSRS scheduling. Pure, so main can run it (D32) and tests can pin the clock.

// (TUNE) D23, D33, D34
export const EQUAL_WITHIN_CP = 30;
export const RARE_MAX_HITS = 2;
export const STRONG_MIN_HITS = 5;
export const NEW_PER_DAY = 10;
export const LEAD_IN_MOVES = 2;

export type CardSource = 'deviation' | 'rare' | 'strong';

// ts-fsrs's Card with its dates as ms, so the file is plain JSON
export type StoredFsrs = Omit<Card, 'due' | 'last_review'> & { due: number; last_review?: number };

export interface WeakCard {
  source: CardSource;
  answer: string; // the prepared reply the card was made for; a changed reply resets the card (D35)
  added: number;
  fsrs: StoredFsrs;
  log: { at: number; rating: Rating.Again | Rating.Good; played: string }[]; // played: your first try, in SAN (D30)
}

export interface WeakPointsFile {
  version: 1;
  repertoireId: string;
  updatedAt: number;
  cards: Record<string, WeakCard>; // keyed by the repertoire node where it's your move
}

export interface Drill {
  nodeId: string;
  source: CardSource;
  startFen: string;
  moves: string[]; // SAN from the repertoire's start to the card's position
  from: number; // moves before this index are set up silently; the drill plays out the rest
  answer: string;
  userSide: 'white' | 'black';
}

// defaults: 90% desired retention, no fuzz (D21)
const scheduler = fsrs();

const has = (record: Record<string, unknown>, id: string) => Object.prototype.hasOwnProperty.call(record, id);

export const emptyFile = (repertoireId: string, now: number): WeakPointsFile =>
  ({ version: 1, repertoireId, updatedAt: now, cards: {} });

type YourPosition = { startFen: string; moves: string[]; answer: string };

/**
 * reads positions you must answer: the standard-SAN line from the root and your prepared reply, or null
 * if it isn't your move, has no reply, or its parent chain is broken. Each node's line is built from its
 * parent's and kept, so every node is replayed once however many cards share its path.
 */
function positionReader(rep: Repertoire, nodes: Record<string, Node>): (nodeId: string) => YourPosition | null {
  const startFen = (has(nodes, rep.rootNodeId) ? nodes[rep.rootNodeId].fen : undefined) ?? DEFAULT_POSITION;
  const lines = new Map<string, { fen: string; moves: string[] } | null>();
  const visiting = new Set<string>();

  const lineTo = (id: string | null): { fen: string; moves: string[] } | null => {
    if (id === null || !has(nodes, id)) return null;
    if (id === rep.rootNodeId) return { fen: startFen, moves: [] };
    const cached = lines.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return null; // a parent loop never reaches the root
    visiting.add(id);
    const node = nodes[id];
    const parent = node.move ? lineTo(node.parentId) : null;
    let line = null;
    if (parent && node.move) {
      const board = new Chess(parent.fen);
      try {
        const san = board.move(node.move).san;
        line = { fen: board.fen(), moves: [...parent.moves, san] };
      } catch {
        // an illegal move in the repertoire: nothing below it can be drilled
      }
    }
    lines.set(id, line);
    return line;
  };

  return nodeId => {
    const line = lineTo(nodeId);
    if (!line) return null;
    const board = new Chess(line.fen);
    if (board.turn() !== rep.side[0]) return null;

    // the same order the walk uses: children first, then transposition links
    const node = nodes[nodeId];
    const reply = [...childrenOf(node).map(id => (has(nodes, id) ? nodes[id].move : null)), ...(node.transpositionEdges ?? []).map(e => e.move)]
      .find((m): m is string => !!m);
    if (!reply) return null;
    try {
      return { startFen, moves: line.moves, answer: board.move(reply).san };
    } catch {
      return null;
    }
  };
}

/** a deviation the engine rates as about as good as the prepared move, or better, isn't a mistake (D23, D31) */
function isFine(e: { playedCp?: number; preparedCp?: number } | undefined): boolean {
  const played = e?.playedCp;
  const prepared = e?.preparedCp;
  return typeof played === 'number' && typeof prepared === 'number' && played >= prepared - EQUAL_WITHIN_CP;
}

interface Candidate { nodeId: string; source: CardSource; answer: string; lastSeen: number; hits: number }

/** the positions that should be cards (D33), deviations first, then rare, then strong */
export function candidates(rep: Repertoire, nodes: Record<string, Node>, novelty: NoveltyFile): Candidate[] {
  const position = positionReader(rep, nodes);
  const deviated = new Set<string>();
  const deviations = new Map<string, Candidate>();
  for (const f of Object.values(novelty.findings)) {
    if (f.kind !== 'deviation') continue;
    deviated.add(f.nodeId);
    if (f.status === 'dismissed' || isFine(f.eval)) continue;
    const pos = position(f.nodeId);
    if (!pos) continue;
    const prev = deviations.get(f.nodeId);
    if (!prev || f.lastSeen > prev.lastSeen) {
      deviations.set(f.nodeId, { nodeId: f.nodeId, source: 'deviation', answer: pos.answer, lastSeen: f.lastSeen, hits: 0 });
    }
  }

  const rare: Candidate[] = [];
  const strong: Candidate[] = [];
  for (const [nodeId, hit] of Object.entries(novelty.nodeHits)) {
    if (deviations.has(nodeId)) continue;
    const isRare = hit.count >= 1 && hit.count <= RARE_MAX_HITS;
    const isStrong = hit.count >= STRONG_MIN_HITS && !deviated.has(nodeId);
    if (!isRare && !isStrong) continue;
    const pos = position(nodeId);
    if (!pos) continue;
    const c = { nodeId, source: isRare ? 'rare' : 'strong', answer: pos.answer, lastSeen: hit.lastSeen, hits: hit.count } as const;
    (isRare ? rare : strong).push(c);
  }
  // the rarest first; the strong ones you've gone longest without seeing first
  rare.sort((a, b) => a.hits - b.hits || a.nodeId.localeCompare(b.nodeId));
  strong.sort((a, b) => a.lastSeen - b.lastSeen || a.nodeId.localeCompare(b.nodeId));
  return [...deviations.values(), ...rare, ...strong];
}

const toStored = (c: Card): StoredFsrs => {
  const { due, last_review, ...rest } = c;
  return { ...rest, due: due.getTime(), ...(last_review ? { last_review: last_review.getTime() } : {}) };
};
const fromStored = (s: StoredFsrs): Card => {
  const { due, last_review, ...rest } = s;
  return { ...rest, due: new Date(due), ...(last_review !== undefined ? { last_review: new Date(last_review) } : {}) };
};

const newCard = (c: Candidate, now: number): WeakCard =>
  ({ source: c.source, answer: c.answer, added: now, fsrs: toStored(createEmptyCard(new Date(now))), log: [] });

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** brings the cards in line with the repertoire and the latest novelty run (D33, D35); returns a new file */
export function syncCards(file: WeakPointsFile, rep: Repertoire, nodes: Record<string, Node>, novelty: NoveltyFile, now: number): WeakPointsFile {
  const position = positionReader(rep, nodes);
  const cards: Record<string, WeakCard> = {};

  for (const [nodeId, card] of Object.entries(file.cards)) {
    const pos = position(nodeId);
    if (!pos) continue; // node deleted, or no longer a position you answer
    cards[nodeId] = pos.answer === card.answer
      ? card
      : { ...card, answer: pos.answer, fsrs: toStored(createEmptyCard(new Date(now))) };
  }

  let introducedToday = Object.values(cards).filter(c => c.source !== 'deviation' && sameDay(c.added, now)).length;
  for (const c of candidates(rep, nodes, novelty)) {
    const card = cards[c.nodeId];
    if (c.source === 'deviation') {
      if (!card) {
        cards[c.nodeId] = newCard(c, now);
      } else if (c.lastSeen > (card.fsrs.last_review ?? card.added)) {
        // you went wrong here again since the last drill: it's due now
        cards[c.nodeId] = { ...card, source: 'deviation', fsrs: { ...card.fsrs, due: Math.min(card.fsrs.due, now) } };
      }
    } else if (!card && introducedToday < NEW_PER_DAY) {
      cards[c.nodeId] = newCard(c, now);
      introducedToday++;
    }
  }

  return { ...file, updatedAt: now, cards };
}

/** the cards due now, soonest first, each with the line that leads into it (D34) */
export function dueDrills(file: WeakPointsFile, rep: Repertoire, nodes: Record<string, Node>, now: number): Drill[] {
  const position = positionReader(rep, nodes);
  return Object.entries(file.cards)
    .filter(([, c]) => c.fsrs.due <= now)
    .sort(([, a], [, b]) => a.fsrs.due - b.fsrs.due)
    .flatMap(([nodeId, card]) => {
      const pos = position(nodeId);
      return pos ? [{ nodeId, source: card.source, ...pos, from: leadInStart(pos.moves), userSide: rep.side }] : [];
    });
}

/**
 * where the drill starts: LEAD_IN_MOVES of your moves before the card, one ply earlier so the
 * opponent's move is seen being played. The card's position is always your move, so your moves sit
 * at indices with the same parity as moves.length.
 */
function leadInStart(moves: string[]): number {
  const firstYours = moves.length - 2 * LEAD_IN_MOVES;
  return Math.max(0, firstYours - 1);
}

/** grades the card's target move (D34): wrong → Again, right first time → Good (D21) */
export function gradeCard(file: WeakPointsFile, nodeId: string, correct: boolean, played: string, now: number): WeakPointsFile {
  if (!has(file.cards, nodeId)) throw new Error("That card doesn't exist any more.");
  const card = file.cards[nodeId];
  const rating = correct ? Rating.Good : Rating.Again;
  const next = scheduler.next(fromStored(card.fsrs), new Date(now), rating).card;
  return {
    ...file,
    updatedAt: now,
    cards: { ...file.cards, [nodeId]: { ...card, fsrs: toStored(next), log: [...card.log, { at: now, rating, played }] } },
  };
}
