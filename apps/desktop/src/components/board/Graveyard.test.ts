import { describe, expect, it } from 'vitest';
import { capturedLabel, groupCaptured } from './Graveyard';

describe('groupCaptured', () => {
  it('counts each piece type in the order it first appears', () => {
    expect(groupCaptured(['q', 'n', 'n', 'p', 'p', 'p'])).toEqual([
      { piece: 'q', count: 1 },
      { piece: 'n', count: 2 },
      { piece: 'p', count: 3 },
    ]);
  });

  it('groups a type that is not adjacent', () => {
    expect(groupCaptured(['p', 'n', 'p'])).toEqual([
      { piece: 'p', count: 2 },
      { piece: 'n', count: 1 },
    ]);
  });

  it('gives nothing for no captures', () => {
    expect(groupCaptured([])).toEqual([]);
  });
});

describe('capturedLabel', () => {
  it('names one piece in the singular and several in the plural', () => {
    expect(capturedLabel(groupCaptured(['q', 'n', 'n', 'p', 'p', 'p']))).toBe('Captured: queen, 2 knights, 3 pawns');
  });
});
