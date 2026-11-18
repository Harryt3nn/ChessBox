import { describe, expect, it } from 'vitest';
import { buildResults, gameInfo, type GameRecord } from './results';

const game = (key: string, playedAt: number, outcome: GameRecord['outcome'], matched: string[] = [], line: string[] = []): [string, GameRecord] =>
  [key, { playedAt, white: 'a', black: 'b', result: '*', matched, line, outcome }];

describe('gameInfo', () => {
  it('reads players, result and the UTC time a game was played', () => {
    const info = gameInfo({ White: 'Harry_Tennant', Black: 'x', Result: '1-0', UTCDate: '2026.11.18', UTCTime: '20:15:00', Date: '2026.11.19' });
    expect(info).toEqual({ white: 'Harry_Tennant', black: 'x', result: '1-0', playedAt: Date.UTC(2026, 10, 18, 20, 15, 0) });
  });

  it('falls back to Date, then to 0, and to "?" for missing players', () => {
    expect(gameInfo({ Date: '2025.01.02' }).playedAt).toBe(Date.UTC(2025, 0, 2));
    expect(gameInfo({ Date: '????.??.??' })).toEqual({ white: '?', black: '?', result: '*', playedAt: 0 });
  });
});

describe('buildResults', () => {
  const deviation = { kind: 'deviation', ply: 3, san: 'Bc4', expected: 'Nf3', nodeId: 'e5' } as const;

  it('groups the same surprise across games into one finding with a count and the latest date', () => {
    const games = Object.fromEntries([
      game('chesscom:1', 100, deviation, ['e4', 'e5'], ['e4', 'e5']),
      game('chesscom:2', 300, deviation, ['e4', 'e5'], ['e4', 'e5']),
      game('lichess:3', 200, { kind: 'novelty', reason: 'opponent-move', ply: 2, san: 'd5', nodeId: 'e4' }, ['e4'], ['e4']),
      game('lichess:4', 50, { kind: 'complete' }, ['e4', 'e5']),
    ]);
    const { findings, nodeHits } = buildResults(games, {});

    expect(findings['e5|Bc4|deviation']).toEqual({
      kind: 'deviation', nodeId: 'e5', move: 'Bc4', expected: 'Nf3', line: ['e4', 'e5'],
      count: 2, lastSeen: 300, games: ['chesscom:1', 'chesscom:2'], status: 'new',
    });
    expect(findings['e4|d5|novelty']).toMatchObject({ kind: 'novelty', reason: 'opponent-move', count: 1, lastSeen: 200 });
    expect(Object.keys(findings)).toHaveLength(2);
    expect(nodeHits).toEqual({ e4: { count: 4, lastSeen: 300 }, e5: { count: 3, lastSeen: 300 } });
  });

  it('keeps the status and engine verdict the user already gave a finding', () => {
    const games = Object.fromEntries([game('chesscom:1', 100, deviation, ['e4', 'e5'], ['e4', 'e5'])]);
    const before = { 'e5|Bc4|deviation': { ...buildResults(games, {}).findings['e5|Bc4|deviation'], status: 'dismissed' as const, eval: { score: '-0.40', depth: 22, best: 'Nf3' } } };
    const after = buildResults(games, before).findings['e5|Bc4|deviation'];
    expect(after.status).toBe('dismissed');
    expect(after.eval).toEqual({ score: '-0.40', depth: 22, best: 'Nf3' });
  });

  it('drops findings no game produces any more (e.g. after the repertoire was edited)', () => {
    const before = buildResults(Object.fromEntries([game('chesscom:1', 1, deviation, [], ['e4', 'e5'])]), {}).findings;
    expect(buildResults({}, before).findings).toEqual({});
  });
});
