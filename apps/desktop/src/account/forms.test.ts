import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountError, newPasswordError, UNREACHABLE } from './forms';
import { trpc } from '../trpc';

describe('newPasswordError', () => {
  it('accepts a valid password typed the same twice', () => {
    expect(newPasswordError('battery-staple', 'battery-staple')).toBeNull();
  });

  it('applies the server password rules first', () => {
    expect(newPasswordError('short', 'short')).toBe('Password must be at least 8 characters');
    expect(newPasswordError('x'.repeat(65), 'x'.repeat(65))).toBe('Password must be at most 64 characters');
  });

  it('catches a mistyped confirmation', () => {
    expect(newPasswordError('battery-staple', 'battery-stapel')).toBe("The new passwords don't match.");
  });
});

describe('accountError', () => {
  afterEach(() => vi.unstubAllGlobals());

  // a real client call against a stubbed fetch, so the errors are shaped exactly as in the app
  const failWith = async (fetchImpl: () => Promise<Response>) => {
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
    return trpc.user.changePassword.mutate({ currentPassword: 'old-password', newPassword: 'new-password' }).catch(e => e);
  };

  it("shows the server's own message when it answered", async () => {
    const err = await failWith(async () => new Response(
      JSON.stringify([{ error: { message: 'Current password is incorrect', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'user.changePassword' } } }]),
      { status: 401 },
    ));
    expect(accountError(err, 'fallback')).toBe('Current password is incorrect');
  });

  it('says the server is unreachable when nothing answered', async () => {
    const err = await failWith(async () => { throw new TypeError('Failed to fetch'); });
    expect(accountError(err, 'fallback')).toBe(UNREACHABLE);
  });

  it('falls back for anything that is not a tRPC error', () => {
    expect(accountError(new Error('boom'), 'Could not save.')).toBe('Could not save.');
  });
});
