/*apps/desktop/src/engine/stockfishWorker.ts*/

import liteScript from 'stockfish/bin/stockfish-18-lite-single.js?url';
import liteWasm from 'stockfish/bin/stockfish-18-lite-single.wasm?url';
import fullScript from 'stockfish/bin/stockfish-18-single.js?url';
import fullWasm from 'stockfish/bin/stockfish-18-single.wasm?url';

// Stockfish 18 lite (single-threaded WASM, D14). The engine script reads the URL of its .wasm
// from the part after "#", so both files can be served from wherever the build puts them.
export function createLiteWorker(): Worker {
  return new Worker(`${liteScript}#${encodeURIComponent(liteWasm)}`);
}

// Stockfish 18 full (big NNUE net, ~113 MB) for verdicts on novelty-finder results (D14). Single-threaded:
// the multi-threaded build needs cross-origin isolation, which the packaged file:// page doesn't have yet.
export function createFullWorker(): Worker {
  return new Worker(`${fullScript}#${encodeURIComponent(fullWasm)}`);
}
