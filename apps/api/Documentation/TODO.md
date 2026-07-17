Build apps/api/src/index.ts, a minimal Fastify server with a /health route that does a prisma.$queryRaw (or similar) to confirm it can reach Postgres through Prisma Client end-to-end. Run natively with npx tsx src/index.ts, hit http://localhost:<port>/health, confirm a sane response. tRPC router/context wiring, auth.service.ts (hash-wasm + blacklist), packages/shared (zod schemas + blacklist.json), and connecting logIn.tsx all still queued behind that. Cleanup of stray backend deps (apify-client, bad-words, argon2id) in apps/desktop/package.json still outstanding — worth checking whether bad-words should move to packages/shared as the blacklist mechanism before deleting anything.


Stack decisions confirmed:

tRPC: @trpc/server in apps/api, @trpc/client in apps/desktop, connected via TS project references (type-only import of AppRouter, no runtime code crosses the boundary)
Prisma: newer prisma-client generator, output set to apps/api/src/generated/prisma (must be under rootDir), imported via './generated/prisma/client' (not the folder root — no package.json entry point in this generator)
Prisma now requires a driver adapter: @prisma/adapter-pg + pg, passed into new PrismaClient({ adapter }) — no longer works with zero arguments
tsconfig.base.json needed explicit "module": "esnext" to pair with "moduleResolution": "bundler"

Done:

✅ apps/api/src/auth/password.ts — Argon2id hashing via hash-wasm (hashPassword/verifyPassword)
✅ apps/api/src/trpc.ts — createContext (reads JWT from Authorization header), Context type, publicProcedure, protectedProcedure
✅ apps/api/src/index.ts — Fastify server boots cleanly, dotenv/config loaded, confirmed working end-to-end (server listens, handles requests)
✅ prisma/schema.prisma — User model with id, username (unique), email (unique), passwordHash, createdAt

Not started yet:

⬜ apps/api/src/routers/auth.ts — login/signup tRPC procedures
⬜ apps/api/src/routers/index.ts — combined appRouter
⬜ Mounting fastifyTRPCPlugin onto index.ts (currently just the bare Fastify skeleton)
⬜ apps/desktop/src/trpc.ts — client setup
⬜ Wiring logIn.tsx to call the mutation
⬜ JWT_SECRET startup validation (currently just ! asserted, not checked)
⬜ Token persistence in Electron (in-memory only so far — discussed but not built)