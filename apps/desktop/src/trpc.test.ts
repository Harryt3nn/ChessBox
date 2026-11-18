import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreAuthToken } from './trpc';

const user = { id: 'u1', username: 'harry', email: 'h@example.com', lichessName: null, chesscomName: null };

// tRPC batch responses, as the server sends them
const ok = () => new Response(JSON.stringify([{ result: { data: user } }]), { status: 200 });
const rejected = () => new Response(
  JSON.stringify([{ error: { message: 'UNAUTHORIZED', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'auth.me' } } }]),
  { status: 401 },
);
const serverError = () => new Response(
  JSON.stringify([{ error: { message: 'Something went wrong.', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: 'auth.me' } } }]),
  { status: 500 },
);

const storage = { loadAuthToken: vi.fn(), clearAuthToken: vi.fn() };

beforeEach(() => {
  storage.loadAuthToken.mockResolvedValue('saved-token');
  storage.clearAuthToken.mockReset();
  vi.stubGlobal('window', { storage });
});
afterEach(() => vi.unstubAllGlobals());

describe('restoreAuthToken', () => {
  it('signs in with a saved token the server accepts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok()));
    expect(await restoreAuthToken()).toEqual({ status: 'signedIn', user });
  });

  it('is signed out when there is no saved token', async () => {
    storage.loadAuthToken.mockResolvedValue(null);
    expect(await restoreAuthToken()).toEqual({ status: 'signedOut' });
  });

  it('forgets the token when the server rejects it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => rejected()));
    expect(await restoreAuthToken()).toEqual({ status: 'signedOut' });
    expect(storage.clearAuthToken).toHaveBeenCalled();
  });

  it('keeps the token when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    expect(await restoreAuthToken()).toEqual({ status: 'unverified' });
    expect(storage.clearAuthToken).not.toHaveBeenCalled();
  });

  it('keeps the token when the server errors for some other reason', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => serverError()));
    expect(await restoreAuthToken()).toEqual({ status: 'unverified' });
    expect(storage.clearAuthToken).not.toHaveBeenCalled();
  });
});
