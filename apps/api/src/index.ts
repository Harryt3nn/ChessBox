/*apps/api/src/index.ts*/

import Fastify from 'fastify'


const fastify = Fastify({
  logger: true
})

// declared route for server
fastify.get('/', async function handler (request, reply) {
  return { hello: 'world' }
})

// running the server
try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}