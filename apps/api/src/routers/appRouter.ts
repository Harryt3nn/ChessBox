/*apps/api/src/routers/appRouter.ts*/


import { router } from '../trpc';
import { authRouter } from './auth';
import { connectionsRouter } from './connection';


export const appRouter = router({
  auth: authRouter,
  connections: connectionsRouter,
});

export type AppRouter = typeof appRouter;