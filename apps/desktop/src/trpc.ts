/* apps/desktop/src/trpc.ts */


import type { AppRouter } from '@chessbox/shared/router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
      headers: () => (authToken ? { authorization: `Bearer ${authToken}` } : {}),
    }),
  ],
});

export async function restoreAuthToken(): Promise<boolean> {
  const token = await window.storage.loadAuthToken();
  if (!token) return false;

  setAuthToken(token);

  try {
    await trpc.auth.me.query();
    return true;
  } catch {
    // token invalid/expired — clear it so we don't keep retrying a dead token
    setAuthToken(null);
    await window.storage.clearAuthToken();
    return false;
  }
}