/*apps/desktop/src/engine/stockfishWorker.ts*/

import liteScript from 'stockfish/bin/stockfish-18-lite-single.js?url';
import liteWasm from 'stockfish/bin/stockfish-18-lite-single.wasm?url';

// Stockfish 18 lite (single-threaded WASM, D14). The engine script reads the URL of its .wasm
// from the part after "#", so both files can be served from wherever the build puts them.
export function createLiteWorker(): Worker {
  return new Worker(`${liteScript}#${encodeURIComponent(liteWasm)}`);
}
