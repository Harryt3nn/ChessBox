import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import { Rating, State } from 'ts-fsrs';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import type { Finding, NoveltyFile } from '../novelty/results';
import { candidates, dueDrills, emptyFile, gradeCard, NEW_PER_DAY, syncCards } from './cards';

const n = (id: string, parentId: string | null, move: string | null, kids: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id, parentId, move, childIDs: kids, ...extra });
const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));

// white: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3, and 1...c5 2.Nf3
// your-move positions: root (e4), e5 (Nf3), Nc6 (Bc4), Bc5 (c3), c5 (Nf3)
const nodes = graph(
  n('root', null, null, ['e4'], { fen: DEFAULT_POSITION }),
  n('e4', 'root', 'e4', ['e5', 'c5']),
  n('e5', 'e4', 'e5', ['Nf3']), n('Nf3', 'e5', 'Nf3', ['Nc6']), n('Nc6', 'Nf3', 'Nc6', ['Bc4']),
  n('Bc4', 'Nc6', 'Bc4', ['Bc5']), n('Bc5', 'Bc4', 'Bc5', ['c3']), n('c3', 'Bc5', 'c3'),
  n('c5', 'e4', 'c5', ['Nf3b']), n('Nf3b', 'c5', 'Nf3'),
);
const rep: Repertoire = { id: 'r1', name: 'Italian', side: 'white', rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 };

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 20, 12);

const deviation = (nodeId: string, extra: Partial<Finding> = {}): Finding =>
  ({ kind: 'deviation', nodeId, move: 'x', expected: '?', line: [], count: 1, lastSeen: NOW - DAY, games: ['g'], status: 'new', ...extra });
const novelty = (findings: Finding[] = [], hits: Record<string, number> = {}): NoveltyFile => ({
  repertoireId: 'r1',
  updatedAt: NOW,
  games: {},
  findings: Object.fromEntries(findings.map(f => [`${f.nodeId}|${f.move}|${f.kind}`, f])),
  nodeHits: Object.fromEntries(Object.entries(hits).map(([id, count]) => [id, { count, lastSeen: NOW - DAY }])),
});

const sources = (nov: NoveltyFile, ns = nodes) => candidates(rep, ns, nov).map(c => [c.nodeId, c.source]);

describe('candidates', () => {
  it('makes deviations, rarely hit and strong positions into cards, deviations first', () => {
    const nov = novelty([deviation('Bc5')], { e5: 6, Nc6: 1, c5: 2 });
    expect(sources(nov)).toEqual([['Bc5', 'deviation'], ['Nc6', 'rare'], ['c5', 'rare'], ['e5', 'strong']]);
  });

  it('skips dismissed deviations and ones the engine rates within 0.3 of the prepared move', () => {
    const nov = novelty([
      deviation('e5', { status: 'dismissed' }),
      deviation('Nc6', { eval: { score: '+0.2', depth: 18, best: 'Bc4', playedCp: 20, preparedCp: 45 } }),
      deviation('Bc5', { eval: { score: '-0.5', depth: 18, best: 'c3', playedCp: -50, preparedCp: 40 } }),
    ]);
    expect(sources(nov)).toEqual([['Bc5', 'deviation']]);
  });

  it('drills a deviation that was better than the prepared move as fine, and an old verdict without scores as not', () => {
    const nov = novelty([
      deviation('Nc6', { eval: { score: '+1.0', depth: 18, best: 'Bb5', playedCp: 100, preparedCp: 30 } }),
      deviation('Bc5', { eval: { score: '+0.3', depth: 18, best: 'c3' } }),
    ]);
    expect(sources(nov)).toEqual([['Bc5', 'deviation']]);
  });

  it('never counts a position as strong if you ever deviated there, even dismissed', () => {
    expect(sources(novelty([deviation('e5', { status: 'dismissed' })], { e5: 9 }))).toEqual([]);
  });

  it('ignores never-reached positions, positions on the opponent\'s move and the end of a line', () => {
    expect(sources(novelty([], { e4: 1, Nf3: 6, c3: 1, Nf3b: 2, Bc5: 0 }))).toEqual([]);
  });

  it('ignores nodes that are missing or whose parent chain is broken', () => {
    const broken = { ...nodes, Nc6: { ...nodes.Nc6, parentId: 'gone' } };
    expect(sources(novelty([deviation('ghost')], { Nc6: 1 }), broken)).toEqual([]);
  });

  it('follows a transposition link as the prepared reply', () => {
    const linked = { ...nodes, Bc5: { ...nodes.Bc5, childIDs: [], transpositionEdges: [{ targetId: 'c3', move: 'c3' }] } };
    expect(candidates(rep, linked, novelty([deviation('Bc5')]))[0].answer).toBe('c3');
  });
});

describe('syncCards', () => {
  it('adds deviations due now, and rare then strong cards', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')], { Nc6: 1, c5: 2, e5: 7 }), NOW);
    expect(Object.keys(file.cards).sort()).toEqual(['Bc5', 'Nc6', 'c5', 'e5']);
    expect(file.cards.Bc5).toMatchObject({ source: 'deviation', answer: 'c3', added: NOW, log: [] });
    expect(file.cards.Bc5.fsrs.due).toBe(NOW);
  });

  it("stops adding rare / strong cards once today's allowance is used, and adds them the next day", () => {
    // NEW_PER_DAY copies of the 1...e5 position, all carded today
    const many = { ...nodes };
    const hits: Record<string, number> = {};
    for (let i = 0; i < NEW_PER_DAY; i++) {
      many[`e5_${i}`] = { ...nodes.e5, id: `e5_${i}` };
      hits[`e5_${i}`] = 1;
    }
    const today = syncCards(emptyFile('r1', NOW), rep, many, novelty([], hits), NOW);
    expect(Object.keys(today.cards)).toHaveLength(NEW_PER_DAY);

    expect(syncCards(today, rep, many, novelty([], { ...hits, Nc6: 1 }), NOW).cards.Nc6).toBeUndefined();
    expect(syncCards(today, rep, many, novelty([], { ...hits, Nc6: 1 }), NOW + DAY).cards.Nc6?.source).toBe('rare');
  });

  it('drops a card whose node is deleted and resets one whose prepared reply changed, keeping its log', () => {
    let file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5'), deviation('Nc6')]), NOW);
    file = gradeCard(file, 'Nc6', true, 'c3', NOW);
    const edited = graph(...Object.values(nodes).filter(x => !['Bc5', 'c3'].includes(x.id)),
      { ...nodes.Bc4, childIDs: [] }, n('Bb5', 'Nc6', 'Bb5'));
    edited.Nc6 = { ...nodes.Nc6, childIDs: ['Bb5'] };

    const later = syncCards(file, rep, edited, novelty(), NOW + DAY);
    expect(later.cards.Bc5).toBeUndefined();
    expect(later.cards.Nc6.answer).toBe('Bb5');
    expect(later.cards.Nc6.fsrs.state).toBe(State.New);
    expect(later.cards.Nc6.log).toHaveLength(1);
  });

  it('makes a card due again when you deviate there after its last drill', () => {
    let file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')]), NOW);
    file = gradeCard(file, 'Bc5', true, 'c3', NOW);
    expect(file.cards.Bc5.fsrs.due).toBeGreaterThan(NOW);

    const sameGames = syncCards(file, rep, nodes, novelty([deviation('Bc5')]), NOW + 1000);
    expect(sameGames.cards.Bc5.fsrs.due).toBeGreaterThan(NOW + 1000);
    const newGame = syncCards(file, rep, nodes, novelty([deviation('Bc5', { lastSeen: NOW + 500 })]), NOW + 1000);
    expect(newGame.cards.Bc5.fsrs.due).toBe(NOW + 1000);
  });
});

describe('dueDrills', () => {
  const everything = { mode: 'focused', branchId: null } as const;

  it('returns due cards as drills: the line from the start, a lead-in of two of your moves, only the last move scored', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')]), NOW);
    const [drill] = dueDrills(file, rep, nodes, NOW, everything);
    expect(drill).toMatchObject({ nodeId: 'Bc5', source: 'deviation', userSide: 'white', startFen: DEFAULT_POSITION });
    expect(drill.line).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3']);
    // starts on 1...e5 being played, then you play 2.Nf3 and 3.Bc4 before the card's 4.c3
    expect(drill.from).toBe(1);
    expect(drill.scoredFrom).toBe(6);
  });

  it('starts at the beginning when the card is near the root', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([], { e5: 1 }), NOW);
    expect(dueDrills(file, rep, nodes, NOW, everything)[0].from).toBe(0);
  });

  it("leaves out cards that aren't due yet", () => {
    let file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')]), NOW);
    file = gradeCard(file, 'Bc5', true, 'c3', NOW);
    expect(dueDrills(file, rep, nodes, NOW + 1000, everything)).toEqual([]);
  });

  it('lead-in works for a black repertoire too', () => {
    const black = { ...rep, side: 'black' as const };
    const file = syncCards(emptyFile('r1', NOW), black, nodes, novelty([deviation('Bc4')]), NOW);
    const [drill] = dueDrills(file, black, nodes, NOW, everything);
    expect(drill).toMatchObject({ from: 0, scoredFrom: 5, userSide: 'black' });
    expect(drill.line[drill.line.length - 1]).toBe('Bc5');
  });

  it('Mistakes only keeps just the deviation cards', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')], { Nc6: 1, c5: 6 }), NOW);
    expect(dueDrills(file, rep, nodes, NOW, everything).map(d => d.nodeId).sort()).toEqual(['Bc5', 'Nc6', 'c5']);
    expect(dueDrills(file, rep, nodes, NOW, { mode: 'mistakes', branchId: null }).map(d => d.nodeId)).toEqual(['Bc5']);
  });

  it('a branch keeps only the positions under it', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')], { c5: 6 }), NOW);
    expect(dueDrills(file, rep, nodes, NOW, { mode: 'focused', branchId: 'c5' }).map(d => d.nodeId)).toEqual(['c5']);
    expect(dueDrills(file, rep, nodes, NOW, { mode: 'focused', branchId: 'e5' }).map(d => d.nodeId)).toEqual(['Bc5']);
  });

  it("doesn't drill a deviation on your first two moves (another opening), even from an older card", () => {
    expect(sources(novelty([deviation('root'), deviation('e5'), deviation('Nc6')]))).toEqual([['Nc6', 'deviation']]);
    const old = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Nc6')]), NOW);
    old.cards.e5 = { ...old.cards.Nc6, answer: 'Nf3' };
    const synced = syncCards(old, rep, nodes, novelty(), NOW);
    expect(synced.cards.e5).toBeDefined(); // kept (D35)
    expect(dueDrills(synced, rep, nodes, NOW, everything).map(d => d.nodeId)).toEqual(['Nc6']);
  });
});

describe('gradeCard', () => {
  it('schedules a correct answer later than a wrong one and logs both', () => {
    const file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')]), NOW);
    const good = gradeCard(file, 'Bc5', true, 'c3', NOW);
    const again = gradeCard(file, 'Bc5', false, 'd4', NOW);
    expect(good.cards.Bc5.fsrs.due).toBeGreaterThan(again.cards.Bc5.fsrs.due);
    expect(good.cards.Bc5.log).toEqual([{ at: NOW, rating: Rating.Good, played: 'c3' }]);
    expect(again.cards.Bc5.log).toEqual([{ at: NOW, rating: Rating.Again, played: 'd4' }]);
    expect(file.cards.Bc5.log).toEqual([]); // the input isn't changed
  });

  it('stretches the interval as you keep getting it right', () => {
    let file = syncCards(emptyFile('r1', NOW), rep, nodes, novelty([deviation('Bc5')]), NOW);
    let at = NOW;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      file = gradeCard(file, 'Bc5', true, 'c3', at);
      gaps.push(file.cards.Bc5.fsrs.due - at);
      at = file.cards.Bc5.fsrs.due;
    }
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(gaps[3]).toBeGreaterThan(DAY);
  });

  it('refuses a card that doesn\'t exist', () => {
    expect(() => gradeCard(emptyFile('r1', NOW), 'nope', true, 'c3', NOW)).toThrow("doesn't exist");
  });
});
