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
    // blitz and rapid are fetched one after the other; once the test is over, every stream closes
    let finished = false;
    const open: ReadableStreamDefaultController<Uint8Array>[] = [];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        if (finished) return controller.close();
        open.push(controller);
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ id: 'game1', pgn: '1. e4 e5 *' }) + '\n'));
      },
    }), { status: 200 })));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    let result: Awaited<ReturnType<typeof importLichess>> | undefined;
    const run = importLichess('harry').then(r => { result = r; });
    try {
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(result).toMatchObject({ ok: false });
    } finally {
      // end the stream so the import finishes instead of leaking into later tests
      finished = true;
      open.forEach(c => c.close());
      await run;
    }
  });
});
