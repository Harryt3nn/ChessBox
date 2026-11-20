/*apps/desktop/src/novelty/results.ts*/

import type { WalkOutcome } from './walk';

// the novelty file for one repertoire (D18): per-game results are the source; findings and node
// hits are rebuilt from them on every run, so a re-run never double-counts (D11)

export interface GameRecord {
  playedAt: number; // ms since epoch, 0 when unknown
  white: string;
  black: string;
  result: string;
  matched: string[]; // repertoire node ids the game followed, in order
  line: string[]; // SAN moves up to the surprise
  outcome: WalkOutcome;
}

export interface Finding {
  kind: 'deviation' | 'novelty';
  reason?: 'opponent-move' | 'end-of-line';
  nodeId: string; // the repertoire position it happened in
  move: string;
  expected?: string; // the prepared reply, for a deviation
  line: string[];
  count: number;
  lastSeen: number;
  games: string[];
  status: 'new' | 'dismissed' | 'added';
  // playedCp / preparedCp: centipawns from your side, mate = ±10000 (D31); older verdicts don't have them
  eval?: { score: string; depth: number; best: string; playedCp?: number; preparedCp?: number };
}

export interface NoveltyFile {
  repertoireId: string;
  updatedAt: number;
  games: Record<string, GameRecord>; // keyed "<site>:<gameId>"
  findings: Record<string, Finding>; // keyed "nodeId|move|kind"
  nodeHits: Record<string, { count: number; lastSeen: number }>;
  // the imported accounts ("<site>/<username>") whose games count (D19); missing means all
  accounts?: string[];
}

/** players, result and time from PGN tags; UTC tags first, as Lichess and Chess.com both write them */
export function gameInfo(tags: Record<string, string | undefined>): Pick<GameRecord, 'white' | 'black' | 'result' | 'playedAt'> {
  const date = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(tags.UTCDate ?? tags.Date ?? '');
  const time = /^(\d{2}):(\d{2}):(\d{2})$/.exec(tags.UTCTime ?? '');
  const playedAt = date
    ? Date.UTC(+date[1], +date[2] - 1, +date[3], time ? +time[1] : 0, time ? +time[2] : 0, time ? +time[3] : 0)
    : 0;
  return { white: tags.White || '?', black: tags.Black || '?', result: tags.Result || '*', playedAt };
}

export function buildResults(
  games: Record<string, GameRecord>,
  previous: Record<string, Finding>,
): Pick<NoveltyFile, 'findings' | 'nodeHits'> {
  const findings: Record<string, Finding> = {};
  const nodeHits: NoveltyFile['nodeHits'] = {};

  for (const [key, game] of Object.entries(games)) {
    for (const nodeId of new Set(game.matched)) {
      const hit = (nodeHits[nodeId] ??= { count: 0, lastSeen: 0 });
      hit.count++;
      hit.lastSeen = Math.max(hit.lastSeen, game.playedAt);
    }

    const o = game.outcome;
    if (o.kind !== 'deviation' && o.kind !== 'novelty') continue;
    const id = `${o.nodeId}|${o.san}|${o.kind}`;
    const finding = (findings[id] ??= {
      kind: o.kind,
      ...(o.kind === 'novelty' ? { reason: o.reason } : { expected: o.expected }),
      nodeId: o.nodeId,
      move: o.san,
      line: game.line,
      count: 0,
      lastSeen: 0,
      games: [],
      status: previous[id]?.status ?? 'new',
      ...(previous[id]?.eval ? { eval: previous[id].eval } : {}),
    });
    finding.count++;
    finding.games.push(key);
    if (game.playedAt >= finding.lastSeen) {
      finding.lastSeen = game.playedAt;
      finding.line = game.line;
    }
  }

  return { findings, nodeHits };
}
