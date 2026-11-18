import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import { Engine, type WorkerLike } from './Engine';

// a stand-in for the Stockfish worker: records what was sent, lets the test reply
class FakeWorker implements WorkerLike {
  sent: string[] = [];
  private listener: ((e: { data: unknown }) => void) | null = null;
  terminated = false;
  addEventListener(_type: 'message', listener: (e: { data: unknown }) => void) { this.listener = listener; }
  postMessage(msg: string) { this.sent.push(msg); }
  terminate() { this.terminated = true; }
  reply(...lines: string[]) { for (const l of lines) this.listener?.({ data: l }); }
}

const flush = () => new Promise(r => setTimeout(r, 0));

async function readyEngine() {
  const worker = new FakeWorker();
  const engine = new Engine(worker);
  worker.reply('id name Stockfish 18', 'uciok');
  await flush();
  worker.reply('readyok');
  await flush();
  worker.sent = [];
  return { worker, engine };
}

describe('Engine', () => {
  it('does the UCI handshake before anything else', async () => {
    const worker = new FakeWorker();
    new Engine(worker);
    expect(worker.sent).toEqual(['uci']);
    worker.reply('uciok');
    await flush();
    expect(worker.sent).toEqual(['uci', 'isready']);
  });

  it('waits for the handshake before starting a search', async () => {
    const worker = new FakeWorker();
    const engine = new Engine(worker);
    void engine.analyse(DEFAULT_POSITION, { depth: 10 }, () => undefined);
    await flush();
    expect(worker.sent).toEqual(['uci']);
  });

  it('searches a position and reports lines, best first, then the best move', async () => {
    const { worker, engine } = await readyEngine();
    const updates = vi.fn();
    const done = engine.analyse(DEFAULT_POSITION, { depth: 12, multiPv: 2 }, updates);
    await flush();
    expect(worker.sent).toEqual(['setoption name MultiPV value 2', `position fen ${DEFAULT_POSITION}`, 'go depth 12']);

    worker.reply('info depth 12 multipv 2 score cp 20 pv d2d4', 'info depth 12 multipv 1 score cp 35 pv e2e4 e7e5');
    expect(updates).toHaveBeenLastCalledWith([
      { depth: 12, multipv: 1, score: { type: 'cp', value: 35 }, pv: ['e2e4', 'e7e5'] },
      { depth: 12, multipv: 2, score: { type: 'cp', value: 20 }, pv: ['d2d4'] },
    ]);

    worker.reply('bestmove e2e4 ponder e7e5');
    await expect(done).resolves.toBe('e2e4');
  });

  it('only sets MultiPV when it changes', async () => {
    const { worker, engine } = await readyEngine();
    const first = engine.analyse(DEFAULT_POSITION, { depth: 1 }, () => undefined);
    await flush();
    worker.reply('bestmove e2e4');
    await first;
    void engine.analyse(DEFAULT_POSITION, { movetime: 500 }, () => undefined);
    await flush();
    expect(worker.sent).toEqual([`position fen ${DEFAULT_POSITION}`, 'go depth 1', `position fen ${DEFAULT_POSITION}`, 'go movetime 500']);
  });

  it('stops the running search before starting a new one, and ignores its late output', async () => {
    const { worker, engine } = await readyEngine();
    const oldUpdates = vi.fn();
    const newUpdates = vi.fn();
    const old = engine.analyse(DEFAULT_POSITION, {}, oldUpdates);
    await flush();
    const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const next = engine.analyse(fen2, { depth: 8 }, newUpdates);
    await flush();
    expect(worker.sent).toEqual([`position fen ${DEFAULT_POSITION}`, 'go infinite', 'stop']);

    worker.reply('info depth 20 score cp 30 pv e2e4');
    expect(oldUpdates).not.toHaveBeenCalled();
    expect(newUpdates).not.toHaveBeenCalled();

    worker.reply('bestmove e2e4');
    await expect(old).resolves.toBe('e2e4');
    await flush();
    expect(worker.sent.slice(3)).toEqual([`position fen ${fen2}`, 'go depth 8']);
    worker.reply('info depth 8 score cp -25 pv e7e5');
    expect(newUpdates).toHaveBeenCalledTimes(1);
    worker.reply('bestmove e7e5');
    await expect(next).resolves.toBe('e7e5');
  });

  it('skips searches that were replaced before they started', async () => {
    const { worker, engine } = await readyEngine();
    void engine.analyse(DEFAULT_POSITION, {}, () => undefined);
    await flush();
    const skipped = engine.analyse('fen-a', {}, () => undefined);
    const last = engine.analyse('fen-b', { depth: 3 }, () => undefined);
    await expect(skipped).resolves.toBeNull();
    worker.reply('bestmove e2e4');
    await flush();
    expect(worker.sent.filter(m => m.startsWith('position'))).toEqual([`position fen ${DEFAULT_POSITION}`, 'position fen fen-b']);
    worker.reply('bestmove a2a3');
    await expect(last).resolves.toBe('a2a3');
  });

  it('stop() ends the search and drops anything queued; quit() closes the worker', async () => {
    const { worker, engine } = await readyEngine();
    const running = engine.analyse(DEFAULT_POSITION, {}, () => undefined);
    await flush();
    engine.stop();
    expect(worker.sent[worker.sent.length - 1]).toBe('stop');
    worker.reply('bestmove e2e4');
    await expect(running).resolves.toBe('e2e4');
    engine.quit();
    expect(worker.sent[worker.sent.length - 1]).toBe('quit');
    expect(worker.terminated).toBe(true);
  });
});
