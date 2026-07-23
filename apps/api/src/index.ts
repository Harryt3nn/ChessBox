/*apps/api/src/index.ts*/


import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/appRouter';
import { createContext } from './trpc';


const fastify = Fastify({
  logger: true
});

fastify.get('/', async function handler (request, reply) {
  return { hello: 'world' };
});

fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

try {
  await fastify.listen({ port: 3001 }); 
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}