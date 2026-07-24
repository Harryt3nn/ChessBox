/* apps/desktop/src/trpc.ts */


import type { AppRouter } from '@chessbox/shared/router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { loadAuthToken } from './Storage/MainStorage';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function restoreAuthToken(): Promise<boolean> {
  const token = await window.storage.loadAuthToken();
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/trpc',
      headers: () => (authToken ? { authorization: `Bearer ${authToken}` } : {}),
    }),
  ],
});