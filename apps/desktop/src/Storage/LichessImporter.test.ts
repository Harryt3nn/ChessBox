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
  // T31 (b): Lichess sends one game and then nothing, without closing the stream. The import should
  // give up and report it; today it waits forever. One hour is only a ceiling for the test, not the
  // idle limit, which is Harry's call. it.fails until he picks it.
  it.fails('gives up on a stream that stops sending', async () => {
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
