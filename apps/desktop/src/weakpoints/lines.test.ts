import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION, Chess } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { branches, inBranch, randomDrills } from './lines';

const n = (id: string, parentId: string | null, move: string | null, kids: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id, parentId, move, childIDs: kids, ...extra });
const graph = (...list: Node[]) => Object.fromEntries(list.map(x => [x.id, x]));

// white: 1.e4 e5 2.Nf3 Nc6 3.Bc4 (Nf6 4.d3 | Bc5 4.c3), and 1...c5 2.Nf3 d6 3.d4
const nodes = graph(
  n('root', null, null, ['e4'], { fen: DEFAULT_POSITION }),
  n('e4', 'root', 'e4', ['e5', 'c5']),
  n('e5', 'e4', 'e5', ['Nf3']), n('Nf3', 'e5', 'Nf3', ['Nc6']), n('Nc6', 'Nf3', 'Nc6', ['Bc4']),
  n('Bc4', 'Nc6', 'Bc4', ['Nf6', 'Bc5']), n('Nf6', 'Bc4', 'Nf6', ['d3']), n('d3', 'Nf6', 'd3'),
  n('Bc5', 'Bc4', 'Bc5', ['c3']), n('c3', 'Bc5', 'c3'),
  n('c5', 'e4', 'c5', ['Nf3b']), n('Nf3b', 'c5', 'Nf3', ['d6']), n('d6', 'Nf3b', 'd6', ['d4']), n('d4', 'd6', 'd4'),
);
const rep: Repertoire = { id: 'r1', name: 'Italian', side: 'white', rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 };

// a fixed sequence instead of Math.random, so the picks are known
const seq = (...values: number[]) => () => values.length > 1 ? values.shift() as number : values[0];

describe('branches', () => {
  it('lists the moves at the first point where the line splits', () => {
    expect(branches(rep, nodes)).toEqual([{ nodeId: 'e5', moves: ['e4', 'e5'] }, { nodeId: 'c5', moves: ['e4', 'c5'] }]);
  });

  it('is empty for a single line or a missing root', () => {
    const single = graph(n('root', null, null, ['e4']), n('e4', 'root', 'e4'));
    expect(branches(rep, single)).toEqual([]);
    expect(branches({ ...rep, rootNodeId: 'gone' }, nodes)).toEqual([]);
  });
});

describe('inBranch', () => {
  it('follows main parents up to the branch', () => {
    expect(inBranch(nodes, 'c3', 'e5')).toBe(true);
    expect(inBranch(nodes, 'c3', 'c5')).toBe(false);
    expect(inBranch(nodes, 'c5', 'c5')).toBe(true);
    expect(inBranch(nodes, 'c3', null)).toBe(true);
  });

  it('stops on a parent loop', () => {
    const loop = { ...nodes, a: n('a', 'b', 'x'), b: n('b', 'a', 'y') };
    expect(inBranch(loop, 'a', 'e5')).toBe(false);
  });
});

describe('randomDrills', () => {
  it('starts at a random position on your move and plays your next moves forward, all of them scored', () => {
    // which start comes first depends on the search order, so check the drill's shape, not the start
    const [drill] = randomDrills(rep, nodes, { count: 1, yourMoves: 5, branchId: null }, seq(0));
    expect(drill.nodeId).toBeNull();
    expect(drill.source).toBe('random');
    expect(drill.scoredFrom).toBeGreaterThanOrEqual(drill.from);
    // every move in the line is legal from the start, and the played-out part starts on your move
    const board = new Chess(drill.startFen);
    drill.line.forEach((san, i) => {
      if (i === drill.scoredFrom) expect(board.turn()).toBe('w');
      board.move(san);
    });
  });

  it('plays only as many of your moves as asked, and stops early where the line ends', () => {
    const fromRoot = randomDrills(rep, nodes, { count: 7, yourMoves: 2, branchId: null }, seq(0));
    for (const d of fromRoot) {
      const yours = d.line.slice(d.scoredFrom).filter((_, i) => i % 2 === 0);
      expect(yours.length).toBeLessThanOrEqual(2);
      expect(yours.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('picks the opponent replies at random from the repertoire', () => {
    // in the e5 branch, starting at 1.e4 e5: Nf3, Nc6, Bc4, then the opponent picks Nf6 (0) or Bc5 (0.99)
    const startAtE5 = (pick: number) => randomDrills(rep, nodes, { count: 1, yourMoves: 4, branchId: 'e5' }, seq(0, pick))[0];
    const a = startAtE5(0);
    const b = startAtE5(0.99);
    expect(a.line).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3']);
    expect(b.line).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3']);
    expect(a.from).toBe(1); // 1...e5 is seen being played
    expect(a.scoredFrom).toBe(2);
  });

  it('keeps to the chosen branch, never repeats a start, and gives fewer drills when there are fewer starts', () => {
    const drills = randomDrills(rep, nodes, { count: 10, yourMoves: 1, branchId: 'c5' }, Math.random);
    expect(drills).toHaveLength(2); // c5 and d6 are the only positions on your move under 1...c5
    expect(drills.every(d => d.line[1] === 'c5')).toBe(true);
    expect(new Set(drills.map(d => d.scoredFrom)).size).toBe(2);
  });

  it('gives nothing for an empty repertoire', () => {
    expect(randomDrills(rep, {}, { count: 5, yourMoves: 5, branchId: null })).toEqual([]);
  });
});
