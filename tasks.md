# ChessBox: tasks

Work **▶ Now** top to bottom. Tags: `[🟠 your call: …]` = a design decision for the builder (CLAUDE.md §1) · `[⏸ waits on: …]` = blocked.

## 📊 Latest (the only home of volatile facts)
- **Updated:** 2026-11-26 15:40
- **`main` at:** 8e30cfe (pushed) · **server `main`:** 0c25879 (pushed, **not deployed**; Pi on 1717269; brings T29 + pentest fixes) · **open branches:** readme-rewrite@52c332b (v1 status + roadmap, waits on Harry's OK), restyle-moodboard (A3, T37), reserved-ids-test (A4, waits on 🟠 9) · **Electron:** 42.11.18
- **Tests:** desktop 229 passing, 0 expected fails (26 files) · server 40 passing (4 files, server main@64abc39) · **Builder:** 888-node Italian renders in ~1.2 s · **Lite engine (live board, D14):** d15 0.2–0.8 s, d20 1.8–7.2 s by position (A3, 2026-11-24) · **Verdict:** full Stockfish (single-threaded) depth 18 in ~4 s per finding · **Novelty run:** "Check all games" on White Aggressive Italian = 4,396 games in 22 s in the dev app (2,627 deviations, 1,757 novelties, 12 in prep) · **Walk alone:** ~3 ms / game · **WeakPoints sync + queue:** Italian ~130 ms, 106 cards on first sync (D30, D33) · **npm audit (2026-11-24, A4):** desktop 47, build / dev only (0 with `--omit=dev`) · server 8, all in the image, none reachable from requests today (zod is the nearest) · server base image `node:20` is end-of-life

## ▶ Now (ranked): stage-1 MVP from `system.md` (2026-11-18)
**M1 · Layout**
- [x] **T7 · Home hub replaces the sidebar** (UI: Claude's call) · Done when: no page renders the sidebar; Home shows a card per section (Analysis board, Repertoires, Toolkit, Analytics, Settings); every page has a top bar back to Home; the app builds and `npm test` is green.
- [x] **T8 · Toolkit page lists its tools** · Done when: Novelty Finder and WeakPoints open from the Toolkit (Novelty Finder is a toolkit tool, D15).

**M2 · Analysis board**
- [x] **T9 · Captured-pieces graveyard** · Done when: a pure captured-pieces helper is tested for normal captures, promotions, en passant and custom-FEN starts, and is shown beside the board with the material difference.
- [x] **T10 · Borderline / invalid input tests** · Done when: tests cover a bad FEN (wrong ranks, missing king, side not to move in check), a PGN with an illegal move, an empty PGN, an oversized PGN, a multi-game PGN, promotion with check, castling through check; all pass (anything failing is fixed test-first).
- [x] **T11 · Engine service (D14)** · Done when: a Stockfish Web Worker wrapper speaks UCI (`isready`, `position`, `go depth/movetime`, `stop`), is tested with a fake worker, and runs lite on the board.
- [x] **T12 · Eval bar + engine lines** · Done when: the board shows an eval bar (cp / mate, from White's side), the best line(s) and an engine toggle; changing position stops the old search.

**M3 · Repertoire ↔ board**
- [x] **T13 · Open a repertoire in the analysis board** · Done when: a pure graph → tree conversion (transpositions shown, no infinite loops) is tested, and "Open in board" works from Repertoires (read-only).
- [x] **T14 · Edit a repertoire from the board** · Done when: moves added on the board can be saved back as nodes, respecting the single-response rule (D17).

**M4 · Novelty finder (toolkit tool)**
- [x] **T4 · Single-response constraint (D17)** · Done when: the editor blocks a second reply on your move, and an import flags violating nodes for you to resolve.
- [x] **T3 · The walk** · Done when: tests show a game walked against the chosen repertoire (D15) returns its matches, the first deviation (`prep-miss`) or novelty (`opponent-gap` / past a leaf), and follows transpositions.
- [x] **T15 · Single + bulk runs, results saved locally (D16)** · Done when: picking a repertoire and one game or all imported games writes results under `ChessBox-data/novelty/` (format shown to Harry first: a 🟠 schema decision).
- [x] **T16 · Stockfish verdict + add to repertoire + open in board** · Done when: each novelty / deviation gets a full-engine eval and can be added as a node or opened in the analysis board.

- [x] **T22 · Account picker (D19)** · Done when: the run only reads games from ticked `<site>/<username>` folders, tested; the choice is saved per repertoire.

**M5 · Repertoire builder**
- [x] **T17 · Visual graph builder (chessgraph style), CRUD, folders** (React Flow + dagre, D20) · Done when: create / rename / delete repertoires and nodes visually, saved to disk.

**M6 · Profile and settings**
- [x] **T23 · Builder polish (UI)** · Done when: React Flow controls match the theme; collapse/expand branches for big repertoires; promotion picker on the mini board (it always queens now).
- [x] **T18 · One settings page replaces the profile cards** (UI: Claude's call)
- [x] **T19 · Server: change password / username + rate-limit login and register (was T5)**

**M7 · WeakPoints trainer (toolkit tool)**
- [x] **T20 · Research pass: spaced repetition (Anki SM-2 / FSRS) + Aimchess** · Done when: `research.md` Pass 1 is graded and a recommendation is ready for Harry.
- [x] **T21 · WeakPoints drills (D21–D23)** · Done when: cards from deviations (minus ones within 0.3 pawns), rarely hit and strong lines are drilled as short sequences on a board without analysis, auto-graded and scheduled by FSRS, saved to `weakpoints/<id>.json`; verdict gains the prepared-move score; deleting a repertoire removes its weakpoints file.

- [x] **T24 · WeakPoints modes (D36, D37)** · Done when: the page offers Focused, Mistakes only and Random; Random works with no novelty data and saves nothing; tested.

- [x] **T25 · Board ↔ graph everywhere** · Done when: every position with a Board button also has Graph (opens the builder on that node, unfolded and centred), the builder's "Open in board" opens the selected node, and the board can jump to the graph.
- [x] **T26 · Branch filter for drills (D40)** · Done when: a branch picker (plus Everything) limits all three modes; tested.
- [x] **T27 · Skip early deviations (D39)** · Done when: deviations on your first 2 moves aren't queued; tested.
- [x] **T28 · Automatic deviation verdicts (D38)** · Done when: the Novelty Finder checks unchecked deviations in the background with progress, saves each, resumes; the Evaluate button is gone. Also shows game dates and times (UI).

**Loose ends**
- [x] **T6 · Check B8 in the app** (Escape in "New Folder" may still create one).

**Stage 2 · Auth (D43)**
- [ ] **T29 · Server: token version (A4)** (merged to server `main@0267f60`, pushed; deploy held until T30's token save is approved) · Done when: migration adds `User.tokenVersion` (default 0); tokens carry `ver`; `createContext` rejects a mismatch and treats a missing `ver` as 0; `changePassword` bumps it and returns `{ok, token}` (shared type updated); server tests cover old token rejected, fresh token accepted, pre-deploy token accepted; reviewed by all 4, merged in ChessBox-Server, deployed to the Pi.
- [ ] **T30 · Desktop: keep the fresh token (part 1, token save: merged `main@76fbd29`; part 2, UNAUTHORIZED sign-out: waits on Harry's 🟠) + sign out on UNAUTHORIZED (A4, Settings look A1)** · Done when: Settings saves the token from `changePassword`; any `UNAUTHORIZED` response clears the session and shows a toast; tested; submodule pointer bumped as its own commit. Waits on T29 deployed.

**Prep for Harry (added 2026-11-24 so every agent has work; drafts only, nothing built until Harry picks)**
- [x] **T31 · Two import 🟠s drafted (A2)** (branch `import-issue-tests` @ 04a2c99, 2 `it.fails` tests; 🟠s with Harry) · Done when: full 🟠 blocks for (a) orphan nodes piling up in `nodes.json` and (b) a Lichess idle timeout, each with a failing test showing the problem on a branch (not merged until Harry picks).
- [x] **T32 · Research: Chess.com game-review data for statistics (A2, after T31)** (`research.md` Pass 2) · Done when: a graded `Pass 2` (CLAUDE.md §9) on what Chess.com exposes (public API, PGN annotations, exports) and what per-repertoire stats it could feed, sent to A1.
- [x] **T33 · Research: move explanations with no paid API (A3)** (`research.md` Pass 3) · Done when: a graded `Pass 3` on theory presets (opening names / ECO tables) + Stockfish-based explanations + local models, with sizes and speeds from sources, sent to A1.

## ▶ Now · 2.0 "Less AI-like: UI + security" (from `system.md`, 2026-11-24; lanes per D44)
**Feedback from Harry's manual testing** (A1 logs each item, routes it; overflow → A1)
- [x] **F1 · WeakPoints: open each drill in the analysis board (A2, D46: under the drill text after you answer, drill pauses for Next, no confirm on leaving)** · Harry 2026-11-24: "a link to the analysis board for every drill sequence". Done when: every drill, once answered, has an Open in board button that loads the drill's line at its target position; it isn't shown before you answer, so it can't give the move away (UI call, A1); tested.
- [x] **T45 · Fix the two import bugs (A4, D47 + D48; A2 reviews closely, its files)** · branch `import-fixes` · Done when: `ImportService.test.ts:27` and `LichessImporter.test.ts:25` pass as normal tests (no `it.fails`); reachable-only import covers transposition edges; Lichess 30 s connect / 60 s idle via AbortController, partial games kept, count reported (incl. blitz ok + rapid failed); tested.
- [ ] **T46 · Sign-in edge cases (A4, D51 + D52, one branch)** · Done when: UNAUTHORIZED is double-checked with auth.me before sign-out (wrong current password shows the form error); a failed token save after a server yes counts as done with the warning toast, for login, register and change password; tested.
- [ ] **T47 · Reserved ids (A4, D53, branch `reserved-ids-test`)** · Done when: `isSafeId` refuses `__proto__` / `constructor` / `prototype`, the B1 test becomes "dropped with a warning", the reserved-id tests pass.
- [ ] **T48 · Electron permissions + IPC sender check (A4, D54)** · Done when: only clipboard write is granted (Copy FEN / PGN still works), everything else is denied, every IPC handler rejects a sender that isn't the app's page; tested.
- **Server work paused (Harry 2026-11-26: not connected to the server, frontend first).** T38 local-server tests, T39, F3, T40 and the Pi deploy wait.
- [ ] **F2 · Strongest Stockfish (D50: native download in Settings + Open on Lichess; A2 sends the IPC contract 🟠 first, after T44)** · Harry: "if there is any way to get the strongest version of stockfish, either a link to a web page. run this by me first".
- [ ] **F3 · Google sign-in instead of email verification (🟠, A4 drafts)** · Harry: "no email verification, I would ideally like to sign in with google to save on all of this stuff".

**A3 · UI**
- [x] **T34 · Moodboard: art deco / Casino Royale** · Done when: a moodboard (palette with hex codes, type pairing with licences, ornament / border motifs, button and card treatments, 6–10 references with links) matched to `src/assets/icons/`, checked against both avoid lists in `system.md`, sent to A1 for Harry. Harry may change it a lot.
- [x] **T35 · UI audit against the avoid lists** (A3, 2026-11-24: biggest hits are low-contrast errors and faint text, button fades, coloured left borders, everything in cards, 30 images without alt, Home tiles not keyboard-reachable) · Done when: every page is checked against the "avoid" and "DO NOT have" lists (em dashes in copy, gradients, Inter, cards, fades, …), and the findings are listed per page with `file:line`.
- [x] **T36 · Accessibility + avoid-list fixes that don't need the moodboard (A3, branch `accessibility-pass`)** · Done when: colour contrast measured (WCAG AA), keyboard navigation works on every page, every image has `alt`; fixes on a branch.
- [ ] **T37 · Restyle to the agreed moodboard** (Harry OK 2026-11-26, D45: his Flaticon icons or none, no emoji or symbol icons; A3, branch `restyle-moodboard`)

**A4 · Security**
- [ ] **T38 · Pen-test triage** (A4 DOC 2026-11-26: all 19 items triaged. Not relevant 8: SAML, email spoof, 2FA replay, cache poisoning, views/RLS, padding oracle, XXE, websocket hijack. Pass 9: HTTP/2 rapid reset, 52-char username, ReDoS, smuggling, spoofed IP, Math.random, timing, batching (new test), template injection. Holes 2: JWT alg confusion fixed by the HS256 pin (server main@0c25879, not deployed); `__proto__` ids (🟠 9 with Harry). Production error masking now tested (server branch `pentest-batch2`, 40 server tests). Open: 🟠 9 pick + Pi deploy) · Done when: every item on `system.md`'s PEN TEST list is marked relevant / not relevant with a one-line reason; the relevant ones are tested against a local server; each real hole has a failing test and a 🟠 or a fix.
- [ ] **T39 · Server deps + Node 20 → 22** · Waits on Harry (🟠 6).
- [ ] **T40 · Account deletion (🟠 draft first)** · Done when: a 🟠 block covers what gets deleted (server account, local data, linked accounts), how it's confirmed, and what happens on other devices.

**A2 · Features**
- [x] **T41 · Data + third-party audit** (A2 DOC 2026-11-24: no telemetry; the only third-party calls are the importers (from the PC) and the server's account-exists check when you link a site (`connection.ts`, from the Pi); gaps: no delete-account endpoint, no way to delete imported games, email collected but unused, API request logs kept forever, CSP test leftover in `index.html:9`; legal pages needed: short privacy notice + credits/licences only) · Done when: a list of every piece of data ChessBox stores or sends (where, why, how long), every third-party package that runs at runtime and whether it talks to the network, plus which legal pages a personal, unpublished app actually needs. Sent to A1. Then Harry's feedback items.

**A1 · Lead**
- [ ] **T42 · README rewrite** (2026-11-27: `readme-rewrite@52c332b` adds Status (v1 done), How it works, Roadmap; undeployed D43 claim moved to the roadmap; PRIVACY.md import + counter lines fixed; waits on Harry's OK to merge) · Done when: `documentation/README.md` reads like a professional project page (what it is, features, stack, setup, architecture link, credits), with no made-up stats or claims, and passes the avoid lists.
- [ ] **T43 · Privacy notice + credits text** (drafted on `readme-rewrite` as `documentation/PRIVACY.md`; claims checked against the code by A1 2026-11-26; merge with T42 after the Pi deploy) · Done when: a short privacy notice (what's stored where, what's sent, how to delete) and a credits / licences section (Stockfish GPL-3, Flaticon, chessgraph, ts-fsrs, "not affiliated with Chess.com or Lichess") are written from T41's facts; readable in the app later (A3 places it).
- [ ] **T44 · Delete imported games (D49; A2 builds contract + main, then A3 look, then A4 Settings wiring)** · Harry 2026-11-26: "deleting can be done per game and on mass", so the 🟠 is being re-drafted for per-game + bulk delete · Done when: a 🟠 block for deleting one account's imported games locally (new IPC channel, what else it touches: novelty results, weakpoints).

## 🅿️ Parked (ideas, not agreed work; offered when ▶ Now is empty)
*Parked 2026-11-26 (Harry): **tournament mode** (enter a date and number of matches, train specific lines instead of mistakes) and an **endgame trainer** (Lichess tablebase API is free with no token, research Pass 5). Revisit after 2.0's UI + security work.*
*Stage 2, from `system.md`:* repertoires on a server (maybe MongoDB, user details stay in Postgres) · email verification · MFA · Google sign-in / sign-up · AI move explanations (theory presets + interpreting Stockfish, no paid API keys) · AI "add suggestions" for repertoires · a private chess-theory knowledge base · multi-reply "acceptable alternatives" so a reasonable non-prep move isn't penalised (D17) · more toolkit tools.
*Stage 2, added to `system.md` on 2026-11-20:* bring Chess.com game-review data in for statistics (Harry has Premium) · statistics per saved repertoire and overall · credit chessgraph as the inspiration in the app, maybe tell its developer (Harry not sure yet) · note: Chess Atlas does something similar.
- **Novelty Finder reloads its file on every deviation check** (`NoveltyFinder.tsx:150,158`, plus a re-read in `updateFinding`): ≈105 ms p50 per check on the Italian's 2.2 MB file, ≈2.6% of a ~4 s verdict (A2, Node script on a copy, 2026-11-24). Cheap fix: reuse the line-158 load. Bigger fixes change `novelty:update` (🟠). Revisit if Harry's D38 mean is well above 4 s.
*From the 2026-11-18 bug sweep (not bugs that need fixing now):*
- The `locked` class on the app layout never applied (it lives in a CSS module, so its name is hashed); the login overlay covers the page anyway.
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
- Tighten the CSP before packaging: drop `unsafe-eval` and `ws://localhost:3000` (`index.html`, `forge.config.ts`); keep `'wasm-unsafe-eval'` so Stockfish still loads. Ship Stockfish's full GPL text (`node_modules/stockfish/Copying.txt`) with releases.
- Case-insensitive usernames (`Harry` and `harry` can both exist).
- Graceful "server unreachable" UI.
- Integration tests on server `auth.ts`.
- Fix `docker-compose.yml` `Dockerfile` vs. tracked `dockerfile` case.
- Server `.gitignore`: `apps/api/src/generated/`, `packages/shared/dist/`.
- Security headers (helmet) on Fastify; a JWT refresh-token flow.
- Theme switching (cream / noir variables are scaffolded in `index.css`).
- Piece sounds, a final logo, coloured folders.
- Mobile companion app (training only, thin client, no AI).
- Infra: Pi SSD reliability (JMicron enclosure), two-node Pi 5 + Pi 2 load balancer, multi-stage Docker build (the image is ~2.4 GB), Redis rate-limit store if there's ever more than one API instance.

## ── Archived (superseded, do NOT action) ──
- Style `ImportModal.tsx`: already done in 3f78ffd (T4). It uses `ImportModal.module.css` with camelCase exports (checked by A2, 2026-11-24).

## ✅ Done log (newest first)
- 2026-11-26 15:40 · T45 import bugs (D47 reachable-only import, D48 Lichess 30 s connect / 60 s idle, keeps saved games and reports the count) (A4, in A2's files) · `main@8e30cfe` · 229 desktop tests, 0 expected fails · approved A1, A2, A3
- 2026-11-26 15:00 · F1 WeakPoints Open in board (D46): button + Next under the drill text once you've answered, drill waits for Next (auto-advance timers removed), opens the board at the drill's position with no confirm (A2) · `main@e19237f` · 219 desktop tests + 2 expected fails · approved A1, A3, A4 · checked by Harry in the dev app ("i like open in board")
- 2026-11-26 14:05 · 🟢 sanitiser takes the first non-empty child list (D2 latent edge: `childIds: []` + `children: [x]` kept its child) (A2) · `main@af0b842` · 213 desktop tests + 2 expected fails · approved A1, A3, A4
- 2026-11-26 13:15 · contrast fixes (A3, 🟢 from T35): chess.com button ivory on sage 5.31:1 (was ink 2.61:1), 4 coral error borders → danger-text ≥4.51:1 (were 1.13–2.24:1), unused sage-hover / coral-hover tokens removed · `main@50124ba` · 211 desktop tests + 2 expected fails · approved A1, A2, A4
- 2026-11-21 00:40 · T21 + T24–T28 WeakPoints and Novelty Finder: FSRS drills (D21–D35), three modes Focused / Mistakes only / Random (D36, D37), opening branch filter (D40), early deviations skipped (D39), random forward drills (D41), automatic deviation verdicts with no Evaluate button (D38), game dates + times and game lists, deviations / novelties in one tabbed panel, board ↔ graph everywhere · `main@cf9f9ee` · 209 desktop tests · checked by Harry in the dev app: drills graded and saved (15 reviews across both repertoires, played moves logged), background check finished 33 of 33 deviations on the 1.e4 Repertoire; Italian's 147 not yet run
- 2026-11-20 20:30 · T18 one settings page (account, linked sites inline, change username / password, Retry when the Pi is unreachable; replaces the profile card) · `main@bfa85b4` · 6 tests · verified by Harry in the app on a new `dev` account: linked Chess.com + Lichess, changed username and password, signed back in
- 2026-11-20 20:30 · T19 server: change password / username (D28), login + register limits (D26), Vitest on the server (D29) · server `1717269`, deployed; checked from the desktop: health `{"ok":true}`, `user.changePassword` routed (401 signed out), foreign Origin gets no CORS allow header; Harry's live test as T18 · 17 server tests
- 2026-11-20 18:30 · T23 builder polish: fold / unfold branches (+N = positions hidden; collapse all folds where the lines first split, expand all; view state only, not saved), promotion picker on the mini board, React Flow controls + grid in the app theme; verified in the app on the 1.e4 repertoire (52 positions, collapse all shows 7, counts 1 + 22 + 22); promotion picker not clicked through (no promotion position in the data), type-checked against the same props as the board · `main@b34dc17` · 3 tests
- 2026-11-19 03:00 · T20 research Pass 1 (WeakPoints): FSRS via ts-fsrs 5.4.2 recommended; drill = short sequence ending in your prepared reply; cards from deviations, rarely hit and strong lines · `research.md` Pass 1
- 2026-11-19 02:30 · T17 visual builder (React Flow 12.12 + @dagrejs/dagre 3.1, D20): layout, mini board add (drag or click), comments, delete branch, new / delete repertoire; found + fixed: the start position lost its graph id in the board tree (adding from the start silently failed); verified in the app on real data, then restored from backup · `main@bb66569` · 11 tests
- 2026-11-19 01:30 · T22 account picker (D19): with lichess/theoneandonlylipika unticked, a full check covers 4,171 of Harry's own games instead of 4,396 · 3 tests
- 2026-11-19 01:00 · T16 finding actions: open in board at the position (save from there), full-Stockfish verdict (score after the move + engine best; 4.0 s at depth 18 in the app), dismiss/restore · `main@57efe74` · 6 tests
- 2026-11-19 00:30 · T15 novelty runs: pick a repertoire, check latest / all games, results in `novelty/<id>.json` (D18), deviation + novelty tables; verified on real data in the app · `main@fd04a4a` · 8 tests
- 2026-11-19 00:00 · T4 import gate for one reply on your move (D17): conflicts listed in a restyled import window, other branches dropped · `main@3f78ffd` · 5 tests (window not seen on screen: needs the native file picker)
- 2026-11-18 23:45 · T3 novelty walk (deviation / opponent-move / end-of-line, transpositions followed); smoke-run on 8,340 real games · `main@2b3f9de` · 10 tests
- 2026-11-18 23:15 · T14 save board moves back to the open repertoire (new nodes, transposition links, one-reply rule); verified on real data then restored from backup · `main@28aa6de` · 13 tests
- 2026-11-18 22:30 · T13 open a repertoire in the board (graph → tree, transpositions as leaf links, board flips to its side) · `main@415d324` · 9 tests
- 2026-11-18 21:30 · T11 + T12 Stockfish 18 lite in a Web Worker (UCI wrapper, tested with a fake worker), eval bar, 2 engine lines, toggle; engine files verified inside the packaged app · `main@cb7e11c` · 19 tests
- 2026-11-18 20:55 · T10 board edge-case tests; found + fixed: positions where the side not to move is in check were accepted · `main@ca0e9ae` · 21 tests
- 2026-11-18 20:40 · T9 captured-pieces graveyard + material lead, flips with the board · `main@20c5f61` · 10 tests
- 2026-11-18 20:20 · T7 + T8 home hub (top bar replaces the sidebar), Toolkit lists Novelty Finder + WeakPoints; screenshots checked in the running app · `main@99526de`
- 2026-11-18 20:20 · T6 closed: in the running app, Escape on "New Folder" saves nothing (B8 was not a bug). B4 toast and B5/B6 Uncategorised fix also confirmed in the app
- 2026-11-18 19:00 · Electron 42.11.2 → 42.11.18 (clears its high-severity advisory); tests, tsc, package build OK · `main@db26f39`
- 2026-11-18 18:40 · Deleted account (`NOT_FOUND`) also clears the saved session (D13) · `main@9506805` · 1 test
- 2026-11-18 18:10 · B4 Pi offline at startup no longer signs you out (D13) · `main@5dca4dd` · 5 tests
- 2026-11-18 18:00 · B3 Chess.com import skips variant games (`rules` ≠ `chess`) · `main@6c357a3` · 3 tests
- 2026-11-18 17:50 · B5/B6 Uncategorised folder: shown on first load, can't be deleted or renamed, never saved to disk · `main@6b35228` · 4 tests (UI wiring not clicked through in the app)
- 2026-11-18 17:40 · B7 board import: a PGN starting with a `{ comment }` was read as broken JSON · `main@cedcd59` · 8 board tests
- 2026-11-18 17:35 · B2 `pgnToJson` crashed on games with a FEN tag · `main@9fc2e16` · 3 tests
- 2026-11-18 17:30 · B1 sanitiser crash / bad links on prototype-key ids (`constructor`, `toString`, `__proto__`) · `main@d1c75a1` · 5 tests
- 2026-11-18 17:20 · T2 Vitest harness + 18 sanitiser tests for existing behaviour · `main@2d2aa3c`
- 2026-11-18 17:20 · T1 Cleanup: removed dead files (importANB, RepList, unused buttons, stale type stubs), removed unused deps (@electron/remote, dagre, reactflow, electron-squirrel-startup) and the old 928 MB root `node_modules`; declared react, react-dom, @trpc/server and forge shared-types; untracked `.vscode/settings.json` · `main@f7335b2` · tsc 0 errors, package build OK
- 2026-11-18 · Baseline: committed BoardView rework + auth revert WIP · `main@f317609`
