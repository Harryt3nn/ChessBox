import { describe, expect, it } from 'vitest';
import type { MoveNode } from '../types/moveNode';
import { pgnToJson } from './PGNtoJSON';

const mainLine = (first: MoveNode) => {
  const line = [first];
  while (line[line.length - 1].children.length) line.push(line[line.length - 1].children[0]);
  return line;
};
const placement = (fen: string) => fen.split(' ')[0];

const parse = (pgn: string) => {
  const game = pgnToJson(pgn, 'lichess', 'harry');
  if (!game) throw new Error('expected the PGN to parse');
  return game;
};

describe('pgnToJson', () => {
  it('turns a standard game into linked nodes and a move tree', () => {
    const game = parse('[White "a"]\n[Black "b"]\n\n1. e4 e5 2. Nf3 *');

    expect(game.tags.White).toBe('a');
    expect(game.nodes.map(n => n.move)).toEqual(['e4', 'e5', 'Nf3']);
    expect(game.nodes[1].parentId).toBe(game.nodes[0].id);
    expect(game.nodes[0].childIDs).toEqual([game.nodes[1].id]);
    expect(mainLine(game.moveTree).map(n => n.move)).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('replays a from-position game from its FEN tag', () => {
    const pgn = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 Kd7 2. Ke2 *';
    const line = mainLine(parse(pgn).moveTree);
    expect(line.map(n => n.move)).toEqual(['e4', 'Kd7', 'Ke2']);
    expect(placement(line[2].fen)).toBe('8/3k4/8/8/4P3/8/4K3/8');
  });

  it('returns null for a PGN that cannot be parsed', () => {
    expect(pgnToJson('1. e4 e5 2. Ke3 Qh4 3. Zz9', 'chesscom', 'harry')).toBeNull();
  });
});
