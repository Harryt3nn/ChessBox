import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import { capturedPieces, materialBalance } from './material';

describe('capturedPieces', () => {
  it('is empty before any capture', () => {
    expect(capturedPieces(DEFAULT_POSITION, ['e4', 'e5'])).toEqual({ byWhite: [], byBlack: [] });
  });

  it('records who took what, most valuable first', () => {
    // 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qxa2 4. Rxa2
    const result = capturedPieces(DEFAULT_POSITION, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxa2', 'Rxa2']);
    expect(result).toEqual({ byWhite: ['q', 'p'], byBlack: ['p', 'p'] });
  });

  it('counts an en passant capture as a pawn', () => {
    const result = capturedPieces(DEFAULT_POSITION, ['e4', 'a6', 'e5', 'd5', 'exd6']);
    expect(result.byWhite).toEqual(['p']);
  });

  it('records the promoted piece, not a pawn, when a promoted piece is taken', () => {
    // white promotes by taking the rook, then takes the knight; in the second game black takes the new queen
    const fen = 'rn2k3/1P6/8/8/8/8/8/4K3 w - - 0 1';
    const result = capturedPieces(fen, ['bxa8=Q', 'Kd7', 'Qxb8']);
    expect(result.byWhite).toEqual(['r', 'n']);
    const lost = capturedPieces('r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1', ['b8=Q', 'Rxb8']);
    expect(lost.byBlack).toEqual(['q']);
  });

  it('only counts captures made during the game, not pieces missing from a custom start', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    expect(capturedPieces(fen, ['e4'])).toEqual({ byWhite: [], byBlack: [] });
  });

  it('stops at the first illegal move instead of throwing', () => {
    expect(capturedPieces(DEFAULT_POSITION, ['e4', 'd5', 'exd5', 'Ke7??'])).toEqual({ byWhite: ['p'], byBlack: [] });
  });
});

describe('materialBalance', () => {
  it('is 0 at the start', () => {
    expect(materialBalance(DEFAULT_POSITION)).toBe(0);
  });

  it('is positive when White is ahead and counts promoted pieces', () => {
    expect(materialBalance('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1')).toBe(9);
    expect(materialBalance('4k3/8/8/8/8/8/8/R3K1q1 w - - 0 1')).toBe(-4);
  });
});
