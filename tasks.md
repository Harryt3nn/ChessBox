# ChessBox: tasks

Work **▶ Now** top to bottom. Tags: `[🟠 your call: …]` = a design decision for the builder (CLAUDE.md §1) · `[⏸ waits on: …]` = blocked.

## 📊 Latest (the only home of volatile facts)
- **Updated:** 2026-11-18 18:10
- **`main` at:** 5dca4dd (local, 9 commits ahead of origin, not pushed) · **open branches:** none
- **Tests:** 46 passing (6 files) · **Key numbers:** `tsc` 0 errors · lint 0 errors / 5 warnings · `electron-forge package` OK

## ▶ Now (ranked)
- [ ] **T3 · Novelty-finder walk (pure logic)** `[⏸ waits on: Harry's feature md]` · Done when: tests show a game walked against same-side repertoires returns the deepest match, the first deviation (`prep-miss` / `opponent-gap`), and follows transpositions.
- [ ] **T4 · Single-response constraint** `[⏸ waits on: Harry's feature md]` · Done when: the editor blocks a second child on a user-to-move node, and an import flags the violating nodes for resolution.
- [ ] **T6 · Check B8 in the app:** in EditRepertoires, click New Folder, then press Escape. Does a "New Folder" still get created (because `onBlur={createFolder}` fires)? · Done when: confirmed by hand. If yes → failing test + fix (a test needs jsdom + Testing Library: 🟠 new deps).
- [ ] **T5 · Server: rate-limit `auth.login` + `auth.register`, then deploy to the Pi** · Done when: repeated bad logins from one IP are refused after the limit, and the Pi runs the new build (server first, desktop second).

## 🅿️ Parked (ideas, not agreed work; offered when ▶ Now is empty)
*From the 2026-11-18 bug sweep (not bugs that need fixing now):*
- Lichess requests have no timeout (Chess.com uses 30 s); a total timeout would cut long game streams, so it needs an idle timeout.
- An import always brings in every node, even for repertoires you didn't select, so orphan nodes pile up in `nodes.json`.
- The server URL is hard-coded in `trpc.ts` (tailnet IP).
- Component tests (jsdom + Testing Library) for UI bugs like B8.
*Migrated from `documentation/TODO.md` and `CHESSBOX_MASTER.md` §5 on 2026-11-18.*
- Analytics page: Lichess / Chess.com stats, opening success vs. repertoires, per-platform + combined views, time filters (latest / today / week / all time).
- Novelty analyser: evaluate novelties with Stockfish (maybe AI feedback), then add one to a repertoire. Each repertoire gets an "original" view and a "with novelties" view.
- Stockfish on the analysis board; board extras (toggle legal-move highlights, highlight legal captures, board cosmetics).
- Repertoire export in the chessgraph format.
- A visual black / white indicator on EditRepertoires.
- Native graph creation (deferred: Harry wants a more original approach than a chessgraph clone).
- Training tools page.
- Presaved / shared repertoires, maybe a community platform (needs password reset + email verification first).
- Email verification, password reset, change password, sign out everywhere (D9: rebuild with the server deployed first).
- Tighten the CSP before packaging: drop `unsafe-eval` and `ws://localhost:3000` (`index.html`, `forge.config.ts`).
- Case-insensitive usernames (`Harry` and `harry` can both exist).
- Graceful "server unreachable" UI.
- Style `ImportModal.tsx` (it uses unstyled global class names).
- Integration tests on server `auth.ts`.
- Fix `docker-compose.yml` `Dockerfile` vs. tracked `dockerfile` case.
- Server `.gitignore`: `apps/api/src/generated/`, `packages/shared/dist/`.
- Security headers (helmet) on Fastify; a JWT refresh-token flow.
- Theme switching (cream / noir variables are scaffolded in `index.css`).
- Piece sounds, a final logo, coloured folders.
- Mobile companion app (training only, thin client, no AI).
- Infra: Pi SSD reliability (JMicron enclosure), two-node Pi 5 + Pi 2 load balancer, multi-stage Docker build (the image is ~2.4 GB), Redis rate-limit store if there's ever more than one API instance.

## ── Archived (superseded, do NOT action) ──

## ✅ Done log (newest first)
- 2026-11-18 18:10 · B4 Pi offline at startup no longer signs you out (D13) · `main@5dca4dd` · 5 tests
- 2026-11-18 18:00 · B3 Chess.com import skips variant games (`rules` ≠ `chess`) · `main@6c357a3` · 3 tests
- 2026-11-18 17:50 · B5/B6 Uncategorised folder: shown on first load, can't be deleted or renamed, never saved to disk · `main@6b35228` · 4 tests (UI wiring not clicked through in the app)
- 2026-11-18 17:40 · B7 board import: a PGN starting with a `{ comment }` was read as broken JSON · `main@cedcd59` · 8 board tests
- 2026-11-18 17:35 · B2 `pgnToJson` crashed on games with a FEN tag · `main@9fc2e16` · 3 tests
- 2026-11-18 17:30 · B1 sanitiser crash / bad links on prototype-key ids (`constructor`, `toString`, `__proto__`) · `main@d1c75a1` · 5 tests
- 2026-11-18 17:20 · T2 Vitest harness + 18 sanitiser tests for existing behaviour · `main@2d2aa3c`
- 2026-11-18 17:20 · T1 Cleanup: removed dead files (importANB, RepList, unused buttons, stale type stubs), removed unused deps (@electron/remote, dagre, reactflow, electron-squirrel-startup) and the old 928 MB root `node_modules`; declared react, react-dom, @trpc/server and forge shared-types; untracked `.vscode/settings.json` · `main@f7335b2` · tsc 0 errors, package build OK
- 2026-11-18 · Baseline: committed BoardView rework + auth revert WIP · `main@f317609`
