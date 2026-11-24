/* apps/desktop/src/trpc.ts */

import type { AppRouter } from '@chessbox/shared/router';
import type { ChangePasswordInput } from '@chessbox/shared';
import type { inferRouterOutputs } from '@trpc/server';
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';

type User = inferRouterOutputs<AppRouter>['auth']['me'];

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://100.79.222.16:3001/trpc',
      headers: () => (authToken ? { authorization: `Bearer ${authToken}` } : {}),
    }),
  ],
});

// D43: the change revokes every token, this one included, so the fresh token replaces it in
// memory and on disk; otherwise the next request (or the next start) would sign this device out
export async function changePassword(input: ChangePasswordInput) {
  const { token } = await trpc.user.changePassword.mutate(input);
  setAuthToken(token);
  await window.storage.saveAuthToken(token);
}

export type RestoredSession =
  | { status: 'signedIn'; user: User }
  | { status: 'signedOut' }
  // a saved token we couldn't check (server unreachable or erroring); kept for next time
  | { status: 'unverified' };

export async function restoreAuthToken(): Promise<RestoredSession> {
  const token = await window.storage.loadAuthToken();
  if (!token) return { status: 'signedOut' };

  setAuthToken(token);

  try {
    return { status: 'signedIn', user: await trpc.auth.me.query() };
  } catch (err) {
    // only the server rejecting the token (or its account being gone) ends the session;
    // the Pi being off says nothing about it
    const code = err instanceof TRPCClientError ? err.data?.code : undefined;
    if (code === 'UNAUTHORIZED' || code === 'NOT_FOUND') {
      setAuthToken(null);
      await window.storage.clearAuthToken();
      return { status: 'signedOut' };
    }
    return { status: 'unverified' };
  }
}
