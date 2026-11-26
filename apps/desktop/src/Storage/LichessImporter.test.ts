import fs from 'fs';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

// MainStorage reads app.getPath at import time, so the temp folder must exist before the mock runs
const dataDir = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  return mkdtempSync(`${tmpdir()}/chessbox-test-`);
});

vi.mock('electron', () => ({ app: { getPath: () => dataDir }, safeStorage: {} }));

import { importLichess } from './LichessImporter';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('importLichess', () => {
  // T31 (b) / D48: Lichess sends one game and then nothing, without closing the stream.
  // One hour is only a ceiling for the test; the idle limit itself is checked below
  it('gives up on a stream that stops sending', async () => {
    // blitz and rapid are fetched one after the other; once the test is over, every stream still open
    // closes. A fixed importer may abort the fetch (a real fetch then errors the body) or cancel the
    // body, and either way the stream drops out of `open`, so finally never closes it twice
    let finished = false;
    const open = new Set<ReadableStreamDefaultController<Uint8Array>>();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      let own: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          if (finished) return controller.close();
          own = controller;
          open.add(controller);
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ id: 'game1', pgn: '1. e4 e5 *' }) + '\n'));
          init?.signal?.addEventListener('abort', () => {
            if (open.delete(controller)) controller.error(init.signal?.reason);
          });
        },
        cancel() { open.delete(own); },
      });
      return new Response(body, { status: 200 });
    }));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    let result: Awaited<ReturnType<typeof importLichess>> | undefined;
    const run = importLichess('harry').then(r => { result = r; });
    try {
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      // an aborted stream unwinds through the stream internals, not timers, so give it a real moment
      vi.useRealTimers();
      await Promise.race([run, new Promise(resolve => setTimeout(resolve, 500))]);
      expect(result).toMatchObject({ ok: false });
    } finally {
      // end the stream so the import finishes instead of leaking into later tests
      finished = true;
      open.forEach(c => c.close());
      await run;
    }
  });
});

const game = (id: string) => new TextEncoder().encode(JSON.stringify({ id, pgn: '1. e4 e5 *' }) + '\n');

/** a fetch whose body the test drives: `send` a game, `end` the stream; an abort errors the body like a real fetch */
function lichessStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
  return {
    respond(init?: RequestInit) {
      init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason));
      return new Response(body, { status: 200 });
    },
    send: (id: string) => controller.enqueue(game(id)),
    end: () => controller.close(),
  };
}

const settle = async (run: Promise<unknown>) => {
  // an aborted body unwinds through stream internals, not timers, so give it a real moment
  vi.useRealTimers();
  await Promise.race([run, new Promise(resolve => setTimeout(resolve, 500))]);
};

describe('importLichess timeouts (D48)', () => {
  it('gives up when Lichess never answers, after 30 s', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    let result: Awaited<ReturnType<typeof importLichess>> | undefined;
    const run = importLichess('neverAnswers').then(r => { result = r; });
    await vi.advanceTimersByTimeAsync(29_000);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_000);
    await settle(run);

    expect(result).toEqual({ ok: false, error: "Lichess didn't answer within 30 seconds", gamesImported: 0 });
  });

  it('waits 60 s from the last chunk, keeps the games that arrived, and says how many', async () => {
    const stream = lichessStream();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => stream.respond(init)));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    let result: Awaited<ReturnType<typeof importLichess>> | undefined;
    const run = importLichess('goesQuiet').then(r => { result = r; });
    await vi.advanceTimersByTimeAsync(0);
    stream.send('quiet1');
    await vi.advanceTimersByTimeAsync(50_000);
    stream.send('quiet2');
    // 109 s in, but only 59 s since the last chunk
    await vi.advanceTimersByTimeAsync(59_000);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_000);
    await settle(run);

    expect(result).toEqual({
      ok: false,
      error: 'Lichess stopped responding after 2 games; run it again to fetch the rest',
      gamesImported: 2,
    });
    expect(fs.readdirSync(`${dataDir}/ChessBox-data/games/lichess/goesQuiet`).sort()).toEqual(['quiet1.pgn', 'quiet2.pgn']);
  });

  it('says so when the stream goes quiet before the first game', async () => {
    const stream = lichessStream();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => stream.respond(init)));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    let result: Awaited<ReturnType<typeof importLichess>> | undefined;
    const run = importLichess('neverSends').then(r => { result = r; });
    await vi.advanceTimersByTimeAsync(60_000);
    await settle(run);

    expect(result).toEqual({ ok: false, error: 'Lichess stopped sending before the first game arrived; run it again', gamesImported: 0 });
  });

  it('reports the blitz games it saved when rapid then fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('perfType=blitz')
      ? new Response(new Blob([game('blitz1')]).stream(), { status: 200 })
      : new Response(null, { status: 500 })));

    expect(await importLichess('rapidFails')).toEqual({
      ok: false,
      error: 'Lichess had an error (500) fetching rapid games, after saving 1 game; run it again to fetch the rest',
      gamesImported: 1,
    });
  });
});
