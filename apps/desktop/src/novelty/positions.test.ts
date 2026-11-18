import { describe, expect, it } from 'vitest';
import { findingPositions } from './positions';

describe('findingPositions', () => {
  it('gives the position before and after the surprising move', () => {
    expect(findingPositions(['e4', 'e5'], 'Nc3')).toEqual({
      before: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      after: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
    });
  });

  it('returns null if the moves do not replay', () => {
    expect(findingPositions(['e4', 'e4'], 'Nf3')).toBeNull();
    expect(findingPositions(['e4'], 'Ke3')).toBeNull();
  });
});
