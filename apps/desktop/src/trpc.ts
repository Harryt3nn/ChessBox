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
      url: 'http://localhost:3000/trpc', // adjust to your Fastify server's port
      headers: () => (authToken ? { authorization: `Bearer ${authToken}` } : {}),
    }),
  ],
});