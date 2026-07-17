/*apps/api/src/routers/appRouter.ts*/


import { router } from '../trpc';
import { authRouter } from './auth';


export const appRouter = router({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;