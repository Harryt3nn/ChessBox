/*apps/desktop/src/engine/uci.ts*/

import { Chess } from 'chess.js';

// pure helpers for the UCI text protocol Stockfish speaks: parsing its output and
// turning scores and moves into what the board shows

export type Score = { type: 'cp' | 'mate'; value: number };

export interface EngineLine {
  depth: number;
  multipv: number;
  score: Score;
  pv: string[]; // UCI moves, e.g. "e2e4", "b7b8q"
}

/** an `info` line with a score and a pv, or null for anything else (strings, currmove, bound scores) */
export function parseInfo(line: string): EngineLine | null {
  const t = line.trim().split(/\s+/);
  if (t[0] !== 'info') return null;

  let depth: number | null = null;
  let multipv = 1;
  let score: Score | null = null;
  let pv: string[] = [];

  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': depth = Number(t[++i]); break;
      case 'multipv': multipv = Number(t[++i]); break;
      case 'score':
        score = { type: t[i + 1] === 'mate' ? 'mate' : 'cp', value: Number(t[i + 2]) };
        i += 2;
        // a bound is only a guess mid-search; the next exact score replaces it
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') return null;
        break;
      case 'pv': pv = t.slice(i + 1); i = t.length; break;
    }
  }

  if (depth === null || !score || pv.length === 0 || Number.isNaN(score.value)) return null;
  return { depth, multipv, score, pv };
}

/** the move from a `bestmove` line, or null (also for "bestmove (none)" in a finished game) */
export function parseBestMove(line: string): string | null {
  const t = line.trim().split(/\s+/);
  if (t[0] !== 'bestmove' || !t[1] || t[1] === '(none)') return null;
  return t[1];
}

/** UCI scores are from the side to move; the board shows them from White's side */
export function whiteScore(score: Score, fen: string): Score {
  return fen.split(' ')[1] === 'b' ? { type: score.type, value: -score.value } : score;
}

export function formatScore(score: Score): string {
  if (score.type === 'mate') return `#${score.value}`;
  const pawns = (score.value / 100).toFixed(2);
  return score.value > 0 ? `+${pawns}` : pawns;
}

/** the eval bar's label: which side is ahead is already shown by where the label sits */
export function shortScore(score: Score): string {
  if (score.type === 'mate') return `M${Math.abs(score.value)}`;
  return (Math.abs(score.value) / 100).toFixed(1);
}

/** how much of the eval bar is White's, 0–100. Lichess's win-chance curve, so +3 already looks winning */
export function evalBarPercent(score: Score): number {
  if (score.type === 'mate') return score.value > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score.value)) - 1);
}

/** engine moves as SAN from `fen`, stopping at the first one that doesn't fit */
export function uciToSan(fen: string, moves: string[]): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const m of moves) {
    try {
      out.push(chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san);
    } catch {
      break;
    }
  }
  return out;
}
