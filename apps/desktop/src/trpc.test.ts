import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, restoreAuthToken, setAuthToken, trpc } from './trpc';

const user = { id: 'u1', username: 'harry', email: 'h@example.com', lichessName: null, chesscomName: null };

// tRPC batch responses, as the server sends them
const ok = () => new Response(JSON.stringify([{ result: { data: user } }]), { status: 200 });
const rejected = () => new Response(
  JSON.stringify([{ error: { message: 'UNAUTHORIZED', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'auth.me' } } }]),
  { status: 401 },
);
const deletedAccount = () => new Response(
  JSON.stringify([{ error: { message: 'NOT_FOUND', code: -32004, data: { code: 'NOT_FOUND', httpStatus: 404, path: 'auth.me' } } }]),
  { status: 404 },
);
const serverError = () => new Response(
  JSON.stringify([{ error: { message: 'Something went wrong.', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: 'auth.me' } } }]),
  { status: 500 },
);

const storage = { loadAuthToken: vi.fn(), clearAuthToken: vi.fn(), saveAuthToken: vi.fn() };

beforeEach(() => {
  storage.loadAuthToken.mockResolvedValue('saved-token');
  storage.clearAuthToken.mockReset();
  storage.saveAuthToken.mockReset();
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

  it('forgets the token when its account no longer exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => deletedAccount()));
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

describe('changePassword (D43)', () => {
  const input = { currentPassword: 'correct-horse', newPassword: 'battery-staple' };
  const changed = () => new Response(JSON.stringify([{ result: { data: { ok: true, token: 'fresh-token' } } }]), { status: 200 });
  const wrongPassword = () => new Response(
    JSON.stringify([{ error: { message: 'Current password is incorrect', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'user.changePassword' } } }]),
    { status: 401 },
  );
  const sentToken = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
    new Headers((fetchMock.mock.calls[call][1] as RequestInit).headers).get('authorization');

  it('swaps in the fresh token for the next request and saves it', async () => {
    setAuthToken('old-token');
    const fetchMock = vi.fn(async () => changed());
    vi.stubGlobal('fetch', fetchMock);
    await changePassword(input);
    expect(storage.saveAuthToken).toHaveBeenCalledWith('fresh-token');

    fetchMock.mockImplementation(async () => ok());
    await trpc.auth.me.query();
    expect(sentToken(fetchMock, 0)).toBe('Bearer old-token');
    expect(sentToken(fetchMock, 1)).toBe('Bearer fresh-token');
  });

  it('keeps the old token when the current password is wrong', async () => {
    setAuthToken('old-token');
    const fetchMock = vi.fn(async () => wrongPassword());
    vi.stubGlobal('fetch', fetchMock);
    await expect(changePassword(input)).rejects.toMatchObject({ message: 'Current password is incorrect' });
    expect(storage.saveAuthToken).not.toHaveBeenCalled();

    fetchMock.mockImplementation(async () => ok());
    await trpc.auth.me.query();
    expect(sentToken(fetchMock, 1)).toBe('Bearer old-token');
  });
});
