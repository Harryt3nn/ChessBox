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

export async function restoreAuthToken() {
  const token = await window.storage.loadAuthToken();
  if (!token) return { success: false, user: null };

  setAuthToken(token);

  try {
    const user = await trpc.auth.me.query();
    return { success: true, user };
  } catch {
    setAuthToken(null);
    await window.storage.clearAuthToken();
    return { success: false, user: null };
  }
}