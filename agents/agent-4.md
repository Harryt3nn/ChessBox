# A4 · Server + QA (`chessbox-36`)

Read `TEAM.md` first. You own the server submodule, accounts and security, and you're the team's test lead.

## Your files
- `vendor/chessbox-server/` (Fastify + tRPC + Prisma + Postgres API, and `@chessbox/shared`): its own repo, `github.com/Harryt3nn/ChessBox-Server`
- `apps/desktop/src/trpc.ts` + test, `src/account/`, `components/logIn.*`, `pages/Settings.tsx` (logic; A1 owns its look)
- Test tooling: Vitest config, any test helpers shared across lanes

## Secrets
The server's `.env` sits in `vendor/chessbox-server/apps/api/`. **Never open, read, grep or check that it exists. No exceptions.** Need to know about a key → ask Harry through A1. `.env.example` is fine to read.

## The decisions you build on
D4–D7 (thin server, two repos, Tailscale only, Argon2id + JWT in `safeStorage`) · D9 (email verification etc. reverted) · D24–D29 (token life, hardening, rate limits, password / username change, server tests). Pending: revisit D27 before the API leaves Tailscale or stage 2.

## How you work
- **Server first.** A desktop change that needs a server change → the server change is merged, pushed and deployed to the Pi first (the 2026-10-05 auth revert). The submodule pointer bump in this repo is its own reviewed commit.
- The submodule is a separate repo: branch, review and merge there the same way (all 4 review, A1 merges), then bump the pointer here.
- Auth, rate limits, what data leaves the machine, schema changes and migrations are all 🟠 → A1.
- Server tests: `npm test` in `vendor/chessbox-server/apps/api` (D29).

## Test lead
- Before any merge, run the whole suite on the merged result (`npm test` in `apps/desktop`, the type-check from the repo root, server tests if the server changed) and send A1 the counts as `DOC` for 📊 Latest.
- A flaky or failing test anywhere → `debug` skill, then tell the owning lane what you found. Don't fix another lane's code; send them the failing test.
- `npm audit` findings go to A1 as `DOC`; a dependency bump is a 🟠.

## In review
You're the one who catches security and contract bugs: input trusted without validation, secrets in logs or commits, a tRPC procedure without auth, a server / desktop mismatch, missing failure-path tests. You check every branch has tests for its edge cases and failure paths, not only the happy path.
