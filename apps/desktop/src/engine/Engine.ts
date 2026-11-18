/*apps/desktop/src/engine/Engine.ts*/

import { parseBestMove, parseInfo, type EngineLine } from './uci';

// talks UCI to a Stockfish worker. One search runs at a time: asking for a new position stops
// the old search and waits for its "bestmove" first, because UCI ignores commands mid-search.

export interface WorkerLike {
  postMessage(message: string): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  terminate(): void;
}

export interface SearchOptions {
  depth?: number;
  movetime?: number; // ms
  multiPv?: number;
}

interface Search {
  fen: string;
  options: SearchOptions;
  onUpdate: (lines: EngineLine[]) => void;
  resolve: (bestMove: string | null) => void;
  lines: Map<number, EngineLine>;
  stopping: boolean;
}

export class Engine {
  private readonly ready: Promise<void>;
  private waiting: { token: string; resolve: () => void } | null = null;
  private running: Search | null = null;
  private queued: Search | null = null;
  private multiPv = 1;

  constructor(private readonly worker: WorkerLike) {
    worker.addEventListener('message', e => this.receive(String(e.data)));
    this.ready = this.handshake();
  }

  /** searches `fen`; `onUpdate` gets every line so far, best first. Resolves with the best move, or null if replaced */
  analyse(fen: string, options: SearchOptions, onUpdate: (lines: EngineLine[]) => void): Promise<string | null> {
    return new Promise(resolve => {
      this.queued?.resolve(null);
      this.queued = { fen, options, onUpdate, resolve, lines: new Map(), stopping: false };
      void this.ready.then(() => this.startNext());
    });
  }

  stop(): void {
    this.queued?.resolve(null);
    this.queued = null;
    this.halt();
  }

  quit(): void {
    this.stop();
    this.worker.postMessage('quit');
    this.worker.terminate();
  }

  private async handshake() {
    await this.send('uci', 'uciok');
    await this.send('isready', 'readyok');
  }

  private send(command: string, reply: string): Promise<void> {
    return new Promise(resolve => {
      this.waiting = { token: reply, resolve };
      this.worker.postMessage(command);
    });
  }

  private halt() {
    if (this.running && !this.running.stopping) {
      this.running.stopping = true;
      this.worker.postMessage('stop');
    }
  }

  private startNext() {
    if (!this.queued) return;
    if (this.running) return this.halt();

    const search = this.queued;
    this.queued = null;
    this.running = search;

    const multiPv = search.options.multiPv ?? 1;
    if (multiPv !== this.multiPv) {
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
      this.multiPv = multiPv;
    }
    const { depth, movetime } = search.options;
    this.worker.postMessage(`position fen ${search.fen}`);
    this.worker.postMessage(movetime ? `go movetime ${movetime}` : depth ? `go depth ${depth}` : 'go infinite');
  }

  private receive(line: string) {
    if (this.waiting && line.trim() === this.waiting.token) {
      const { resolve } = this.waiting;
      this.waiting = null;
      return resolve();
    }

    const search = this.running;
    if (!search) return;

    if (line.startsWith('bestmove')) {
      this.running = null;
      search.resolve(parseBestMove(line));
      return this.startNext();
    }

    // output after "stop" belongs to a position the board has already left
    if (search.stopping) return;
    const info = parseInfo(line);
    if (!info) return;
    search.lines.set(info.multipv, info);
    search.onUpdate([...search.lines.values()].sort((a, b) => a.multipv - b.multipv));
  }
}
