/*apps/desktop/src/engine/useEngine.ts*/

import { useEffect, useRef, useState } from 'react';
import { Engine } from './Engine';
import { createLiteWorker } from './stockfishWorker';
import type { EngineLine } from './uci';

// (TUNE) lite Stockfish reaches this in a few seconds on a laptop
const ANALYSIS_DEPTH = 20;
const LINES = 2;

/** live engine lines for `fen` while `enabled`; the worker starts on first use and stops on unmount */
export function useEngine(fen: string, enabled: boolean): EngineLine[] {
  const engine = useRef<Engine | null>(null);
  const [lines, setLines] = useState<EngineLine[]>([]);

  useEffect(() => () => engine.current?.quit(), []);

  useEffect(() => {
    setLines([]);
    if (!enabled) {
      engine.current?.stop();
      return;
    }
    engine.current ??= new Engine(createLiteWorker());
    void engine.current.analyse(fen, { depth: ANALYSIS_DEPTH, multiPv: LINES }, setLines);
  }, [fen, enabled]);

  return lines;
}
