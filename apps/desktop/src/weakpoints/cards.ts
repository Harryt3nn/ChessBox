/*apps/desktop/src/weakpoints/cards.ts*/

import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import type { NoveltyFile } from '../novelty/results';
import { cardDrill, has, inBranch, isEarly, lineReader, type Drill, type DrillSource } from './lines';

// WeakPoints (D21, D30–D36): which repertoire positions become drill cards, and FSRS scheduling.
// The lines themselves are in lines.ts. Pure, so main can run it (D32) and tests can pin the clock.

// (TUNE) D23, D33
export const EQUAL_WITHIN_CP = 30;
export const RARE_MAX_HITS = 2;
export const STRONG_MIN_HITS = 5;
export const NEW_PER_DAY = 10;

export type CardSource = Exclude<DrillSource, 'random'>;

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

// defaults: 90% desired retention, no fuzz (D21)
const scheduler = fsrs();

export const emptyFile = (repertoireId: string, now: number): WeakPointsFile =>
  ({ version: 1, repertoireId, updatedAt: now, cards: {} });

/** a deviation the engine rates as about as good as the prepared move, or better, isn't a mistake (D23, D31) */
function isFine(e: { playedCp?: number; preparedCp?: number } | undefined): boolean {
  const played = e?.playedCp;
  const prepared = e?.preparedCp;
  return typeof played === 'number' && typeof prepared === 'number' && played >= prepared - EQUAL_WITHIN_CP;
}

interface Candidate { nodeId: string; source: CardSource; answer: string; lastSeen: number; hits: number }

/** the positions that should be cards (D33), deviations first, then rare, then strong */
export function candidates(rep: Repertoire, nodes: Record<string, Node>, novelty: NoveltyFile): Candidate[] {
  const { position } = lineReader(rep, nodes);
  const deviated = new Set<string>();
  const deviations = new Map<string, Candidate>();
  for (const f of Object.values(novelty.findings)) {
    if (f.kind !== 'deviation') continue;
    deviated.add(f.nodeId);
    if (f.status === 'dismissed' || isFine(f.eval)) continue;
    const pos = position(f.nodeId);
    if (!pos || isEarly(pos.moves)) continue;
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
  const { position } = lineReader(rep, nodes);
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

export type FocusMode = 'focused' | 'mistakes';

/**
 * the cards due now, soonest first, as drills (D34). Mistakes only keeps the deviation cards (D36);
 * a branch keeps the positions under it (D40); a deviation on your first moves isn't drilled (D39)
 */
export function dueDrills(
  file: WeakPointsFile, rep: Repertoire, nodes: Record<string, Node>, now: number,
  { mode, branchId }: { mode: FocusMode; branchId: string | null },
): Drill[] {
  const { position } = lineReader(rep, nodes);
  return Object.entries(file.cards)
    .filter(([nodeId, c]) => c.fsrs.due <= now && (mode === 'focused' || c.source === 'deviation') && inBranch(nodes, nodeId, branchId))
    .sort(([, a], [, b]) => a.fsrs.due - b.fsrs.due)
    .flatMap(([nodeId, card]) => {
      const pos = position(nodeId);
      if (!pos || (card.source === 'deviation' && isEarly(pos.moves))) return [];
      return [cardDrill(nodeId, card.source, pos, rep.side)];
    });
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
