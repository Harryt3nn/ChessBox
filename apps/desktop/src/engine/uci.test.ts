import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import { evalBarPercent, formatScore, parseBestMove, parseInfo, shortScore, uciToSan, whiteScore } from './uci';

describe('parseInfo', () => {
  it('reads depth, line number, centipawn score and the principal variation', () => {
    const line = 'info depth 18 seldepth 25 multipv 2 score cp -34 nodes 123 nps 456 time 7 pv e7e5 g1f3 b8c6';
    expect(parseInfo(line)).toEqual({ depth: 18, multipv: 2, score: { type: 'cp', value: -34 }, pv: ['e7e5', 'g1f3', 'b8c6'] });
  });

  it('reads a mate score and defaults multipv to 1', () => {
    expect(parseInfo('info depth 5 score mate -2 pv d8h4')).toEqual({ depth: 5, multipv: 1, score: { type: 'mate', value: -2 }, pv: ['d8h4'] });
  });

  it('ignores bound scores, strings, currmove updates and lines without a pv', () => {
    expect(parseInfo('info depth 10 score cp 20 lowerbound pv e2e4')).toBeNull();
    expect(parseInfo('info string NNUE evaluation enabled')).toBeNull();
    expect(parseInfo('info depth 12 currmove e2e4 currmovenumber 1')).toBeNull();
    expect(parseInfo('info depth 1 score cp 10')).toBeNull();
    expect(parseInfo('bestmove e2e4')).toBeNull();
  });
});

describe('parseBestMove', () => {
  it('reads the move, or null when there is none', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 1')).toBeNull();
  });
});

describe('whiteScore', () => {
  it('flips the score when Black is to move', () => {
    const black = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(whiteScore({ type: 'cp', value: 30 }, black)).toEqual({ type: 'cp', value: -30 });
    expect(whiteScore({ type: 'mate', value: 3 }, DEFAULT_POSITION)).toEqual({ type: 'mate', value: 3 });
  });
});

describe('formatScore', () => {
  it('shows pawns with a sign, and mates as #', () => {
    expect(formatScore({ type: 'cp', value: 34 })).toBe('+0.34');
    expect(formatScore({ type: 'cp', value: -150 })).toBe('-1.50');
    expect(formatScore({ type: 'cp', value: 0 })).toBe('0.00');
    expect(formatScore({ type: 'mate', value: 3 })).toBe('#3');
    expect(formatScore({ type: 'mate', value: -2 })).toBe('#-2');
  });
});

describe('shortScore', () => {
  it('fits the eval bar: one decimal without a sign, mates as M', () => {
    expect(shortScore({ type: 'cp', value: 38 })).toBe('0.4');
    expect(shortScore({ type: 'cp', value: -1234 })).toBe('12.3');
    expect(shortScore({ type: 'mate', value: -3 })).toBe('M3');
  });
});

describe('evalBarPercent', () => {
  it('is 50 for an equal position and moves towards the side that is better', () => {
    expect(evalBarPercent({ type: 'cp', value: 0 })).toBe(50);
    expect(evalBarPercent({ type: 'cp', value: 300 })).toBeGreaterThan(70);
    expect(evalBarPercent({ type: 'cp', value: -300 })).toBeLessThan(30);
  });

  it('fills the bar for a forced mate', () => {
    expect(evalBarPercent({ type: 'mate', value: 4 })).toBe(100);
    expect(evalBarPercent({ type: 'mate', value: -1 })).toBe(0);
  });
});

describe('uciToSan', () => {
  it('turns engine moves into SAN, including castling and promotion', () => {
    expect(uciToSan(DEFAULT_POSITION, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
    expect(uciToSan('4k3/1P6/8/8/8/8/8/4K2R w K - 0 1', ['b7b8q', 'e8d7', 'e1g1'])).toEqual(['b8=Q+', 'Kd7', 'O-O']);
  });

  it('stops at the first move that does not fit the position', () => {
    expect(uciToSan(DEFAULT_POSITION, ['e2e4', 'e2e4'])).toEqual(['e4']);
  });
});
