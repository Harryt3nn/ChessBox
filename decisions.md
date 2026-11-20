# ChessBox: decisions (why it's built this way)

The record of design choices, the features added and dropped, and the reasons. Read it when writing the README or a write-up, or when explaining the project. **Claude keeps it current without being asked** (CLAUDE.md §4).

**Rules:** facts only. A number appears only if it was measured or comes from a named source; otherwise `TBD (measure in <where>)`. **Status** is `Planned` · `Built` · `Verified` (measured, numbers filled in) · `Dropped` (kept, with the reason). Never delete an entry.

**Entry format**
```
### D<n> · <area> · <short title>: Status: <Planned|Built|Verified|Dropped> · Updated: <YYYY-MM-DD HH:MM>
- **Decision:** what was chosen (by whom, if not the builder).
- **Why:** the reasoning, tied to a goal or a measured fact.
- **Alternatives rejected:** what else, and why not.
- **Trade-off / risk:** what it costs, and the fallback.
- **Revisit if:** the condition that would change this.
- **Evidence:** numbers and source, or `TBD (...)`.
- **One-liner:** one sentence someone else could repeat.
```

---

*Entries D1–D9 and D11 were migrated on 2026-11-18 from `documentation/CHESSBOX_MASTER.md` and `ARCHITECTURE.md`. They record Harry's earlier choices as he documented them.*

### D1 · data model · Repertoires are graphs, not trees: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** Nodes keep normal `childIDs` plus a separate `transpositionEdges[{targetId, move}]` edge type pointing at an existing node.
- **Why:** A tree has to duplicate every transposition; with an explicit edge, one canonical node is reached by several move orders.
- **Alternatives rejected:** a plain tree (duplicates); "two parents pointing at one node" (loses the move that made the edge).
- **Trade-off / risk:** walks must check both edge kinds, and the sanitiser has to cut cycles.
- **Revisit if:** the native graph builder needs a different shape.
- **Evidence:** `sanitiseImport.ts` cuts cycles with an iterative DFS.
- **One-liner:** Transpositions are first-class edges, so one position is one node.

### D2 · data format · chessgraph.net v3 compatible import: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** Accept chessgraph exports (nodes as an array, `childIds` / `children`), normalised to `childIDs` in a `Record<id, Node>`.
- **Why:** Harry's existing repertoires were built in chessgraph; no native builder exists yet.
- **Alternatives rejected:** a custom-only format (would strand existing data).
- **Trade-off / risk:** older saved nodes may still carry `childIds` / `children` until re-imported.
- **Revisit if:** the native graph builder lands (export in the same format is Parked).
- **Evidence:** sanitiser + `validateChessGraphExport.ts`.
- **One-liner:** ChessBox reads chessgraph files natively.

### D3 · storage · Local filesystem for user data, Postgres for accounts: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** Repertoires, nodes, games and the auth token go under `%APPDATA%/ChessBox/ChessBox-data/`. Accounts (and later derived analysis records) go in Postgres on the Pi.
- **Why:** Source data is large, per-user, edit-heavy and needs no relational queries. Aggregates like "how often does this deviation happen" are relational.
- **Alternatives rejected:** everything on the server (the Pi becomes the bottleneck and the app stops working offline).
- **Trade-off / risk:** no cross-device sync of repertoires.
- **Revisit if:** multi-device or a community platform becomes a goal.
- **Evidence:** ARCHITECTURE.md "Data Storage on Disk".
- **One-liner:** Raw data stays on your machine; only accounts live on the server.

### D4 · compute placement · Analysis runs client-side: Status: Planned · Updated: 2026-11-18 17:20
- **Decision:** The graph walk and deviation detection run in the Electron main process. The server only ever receives aggregated output.
- **Why:** A single Pi would be the bottleneck for every user's analysis. Client-side keeps the server thin and stateless.
- **Alternatives rejected:** server-side processing.
- **Trade-off / risk:** analysis speed depends on the user's machine.
- **Revisit if:** a mobile client needs results it can't compute.
- **Evidence:** TBD (measure walk time when T3 lands).
- **One-liner:** Your PC does the thinking; the Pi just stores results.

### D5 · repo layout · Desktop repo + server submodule: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** `ChessBox` (desktop) and `chessbox-server` (API + `@chessbox/shared`), linked as a git submodule at `vendor/chessbox-server`.
- **Why:** The server deploys on its own to the Pi, while the client keeps full tRPC type inference from `AppRouter`.
- **Alternatives rejected:** the old npm-workspaces monorepo.
- **Trade-off / risk:** path resolution is wired in three places (tsconfig paths, webpack `resolve.alias` in main + renderer, ForkTsChecker `configFile`). Client and server can drift (see D9).
- **Revisit if:** a published shared package is worth the extra step.
- **Evidence:** commit a37f968.
- **One-liner:** Two repos, one shared type contract via a submodule.

### D6 · network · API reachable only over Tailscale: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** No public port-forwarding. Plain HTTP on :3001 inside the WireGuard tunnel; Postgres is not published outside the compose network; CORS uses an allow-list (`CORS_ORIGINS`).
- **Why:** The tunnel encrypts the traffic, and nothing is exposed to the internet.
- **Alternatives rejected:** a public API with HTTPS (more attack surface for a single user).
- **Trade-off / risk:** only devices on the tailnet can use the app's online features.
- **Revisit if:** other users or a community platform.
- **Evidence:** ARCHITECTURE.md "Security".
- **One-liner:** The server is invisible to the internet.

### D7 · auth · Argon2id, timing-safe login, JWT sessions: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** Argon2id (64 MB, 3 iterations) via `hash-wasm`, compared against a dummy hash when the user doesn't exist. JWT sessions encrypted at rest with Electron `safeStorage`, with no server-side revocation. Rate limits: global 300/min/IP, 10 per 15 min per user on account linking, max 10 calls per batch.
- **Why:** Resists brute force and username enumeration.
- **Alternatives rejected:** weaker legacy hashes.
- **Trade-off / risk:** login / register have no dedicated limit yet (T5). Limits live in memory and reset on restart.
- **Revisit if:** more than one API instance (Redis).
- **Evidence:** JWT expiry is TBD: 3 days (ARCHITECTURE.md) vs. 7 (old TODO).
- **One-liner:** Strong hashing, no account enumeration, encrypted local session.

### D8 · trust boundary · Sandboxed renderer, main re-sanitises everything: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** `sandbox: true`, context isolation, no Node integration; new windows and navigation blocked. The renderer reads only dialog-picked files (≤20 MB). Main re-runs `sanitiseImport()` on every IPC payload, and ids that become file names match `[A-Za-z0-9_-]{1,64}`.
- **Why:** A `../` id was a real path-traversal bug before this.
- **Alternatives rejected:** trusting renderer payloads.
- **Trade-off / risk:** the CSP still allows `unsafe-eval` and the dev websocket (Parked).
- **Revisit if:** never loosened; only tightened.
- **Evidence:** the 13-case sanitiser script was run once but isn't in the repo (T2).
- **One-liner:** The UI is untrusted; the main process checks everything.

### D9 · auth features · Email verification / reset / sign-out-everywhere reverted: Status: Dropped · Updated: 2026-11-18 17:20
- **Decision:** Built, then reverted on 2026-10-05; the desktop UI (VerifyEmail, SecurityCard) was removed in f317609.
- **Why:** The desktop build and the deployed server got out of step, and sign-in broke.
- **Alternatives rejected:** patching forward on mismatched versions.
- **Trade-off / risk:** no password recovery for now.
- **Revisit if:** rebuilt with the server deployed first (Parked).
- **Evidence:** CHESSBOX_MASTER.md §2.
- **One-liner:** Pulled because client and server drifted; deploy the server first next time.

### D10 · hygiene · Removed dead code and unused deps, declared real deps: Status: Built · Updated: 2026-11-18 17:20
- **Decision:** Deleted unused files and deps (see the tasks.md Done log). Declared react, react-dom, @trpc/server (11.18.0, the exact peer of @trpc/client) and @electron-forge/shared-types. Deleted the monorepo-era root `node_modules` (928 MB, no root `package.json`). Untracked `.vscode/settings.json`. Harry approved the sweep.
- **Why:** The undeclared deps only resolved by hoisting luck; the root modules were leftovers.
- **Alternatives rejected:** keeping them "just in case".
- **Trade-off / risk:** `.vscode/settings.json` (DB connection details) is still in public git history.
- **Revisit if:** a removed dep is needed again (`reactflow` / `dagre` may come back for a graph view).
- **Evidence:** f7335b2; `tsc` 0 errors and `electron-forge package` succeed without the root modules.
- **One-liner:** The repo now builds from what it declares.

### D11 · novelty finder · Layered data + deterministic walk: Status: Planned · Updated: 2026-11-18 17:20
- **Decision:** Four layers: games (fs) → repertoires + nodes (fs) → match records (derived) → deviation catalogue (derived, one row per `(repertoireId, nodeId, move, sourceType)` with a `count`). Walk ply by ply from the root. A user move must match the single intended child, or it's a `prep-miss`. An opponent move may match a child or a transposition edge, or it's an `opponent-gap`. The deepest same-side walk is the best fit; below a minimum depth the game is discarded. Deviation status goes `new` → `dismissed` / `added`.
- **Why:** The single-response constraint makes matching deterministic, with no fuzzy search. Derived layers can always be wiped and re-walked safely.
- **Alternatives rejected:** fuzzy best-fit matching.
- **Trade-off / risk:** depends on T4. The derived-layer location (Postgres vs. local) is Pending.
- **Revisit if:** Harry's feature md changes the design.
- **Evidence:** TBD (T3 tests).
- **One-liner:** Walk the game down your graph and stop at the first surprise.

### D12 · testing · Vitest, test-first bug fixing: Status: Built · Updated: 2026-11-18 18:10
- **Decision:** Harry picked Vitest 5.1 as the test runner (`npm test`, config `apps/desktop/vitest.config.mts`, tests in `src/**/*.test.ts`). Every bug fix starts with a failing test.
- **Why:** zero-config TypeScript/ESM, a Jest-style API, and easy mocking of `electron` and `fetch`.
- **Alternatives rejected:** Jest + ts-jest (fiddly ESM / alias config, slower); `node:test` (clunky module mocking, aliases need a custom loader).
- **Trade-off / risk:** pulls in Vite as a dev dependency next to the webpack build. No DOM tests yet (that needs jsdom + Testing Library).
- **Revisit if:** component tests are needed (add jsdom), or the suite gets slow.
- **Evidence:** 46 tests in 6 files; the run takes about 0.7 s for the sanitiser file alone (local).
- **One-liner:** Every bug gets a failing test before it gets a fix.

### D13 · failure mode · Startup session check survives the server being offline: Status: Built · Updated: 2026-11-18 19:00
- **Decision:** Harry picked: `restoreAuthToken` clears the saved token only when the server answers `UNAUTHORIZED`, or `NOT_FOUND` for a deleted account (added 2026-11-18 at Harry's request). A network error or any other server error → `unverified`: the token is kept, the app stays unlocked, and a toast says the server can't be reached.
- **Why:** the Pi or Tailscale being down says nothing about whether the session is valid. Before this, you were signed out every time.
- **Alternatives rejected:** keep "any error signs you out".
- **Trade-off / risk:** while `unverified`, `currentUser` is null, so game imports ask you to sign in. Any other server error (e.g. 500) keeps the token.
- **Revisit if:** offline mode needs the cached user (e.g. imports while offline).
- **Evidence:** `src/trpc.test.ts` covers accepted / missing / rejected / unreachable / 500.
- **One-liner:** An unreachable server no longer logs you out.

### D14 · engine · Stockfish as WASM in a Web Worker, lite + full: Status: Built (lite + full single-threaded) · Updated: 2026-11-19 01:00
- **Decision:** Harry picked: the `stockfish` npm package (v18, GPL-3, already installed). The lite build (≈7 MB) powers the live eval bar; the full multi-threaded build (≈113 MB) is used for deep novelty checks. One UCI wrapper, so the engine can be swapped later.
- **Why:** no new dependency, runs offline, never blocks the board; the full build gives "high power" where it matters.
- **Alternatives rejected:** a native Stockfish binary in main (strongest, but a new ~80 MB per-OS artifact to ship and update); lite only (too weak for judging novelties).
- **Trade-off / risk:** roughly half native speed (to measure); the full build needs cross-origin isolation (COOP/COEP) for threads. GPL: Stockfish stays a separate file with its licence, never copied into ChessBox code.
- **Revisit if:** deep checks are too slow → native binary behind the same interface.
- **Change (2026-11-19, Harry approved):** the full build runs **single-threaded** for now. The multi-threaded build needs cross-origin isolation (COOP/COEP headers), which the packaged app's `file://` page can't get without more work. Same network strength, just slower.
- **Evidence:** lite: depth 20 after 1.e4 e5 2.Nf3 within ~9 s in the dev app (observed, not timed). Full single-threaded: depth 18 verdict (two searches) in 4.0 s in the dev app. Full: TBD (T16). Loaded via webpack `?url` assets: the worker gets `script.js#<wasm url>`.
- **One-liner:** A small engine for instant feedback, a big one for verdicts.

### D15 · novelty finder · The user picks the repertoire; it is a Toolkit tool: Status: Built · Updated: 2026-11-19 00:30
- **Decision:** Harry: before running (one game or in bulk), the user chooses which repertoire to check against. No auto-matching. Novelty Finder lives in the Toolkit, like WeakPoints.
- **Why:** the user knows what they were playing; no fuzzy best-fit logic.
- **Alternatives rejected:** auto-picking the deepest-matching repertoire (from D11).
- **Trade-off / risk:** a game that doesn't follow the chosen repertoire just gives an early deviation or novelty.
- **Revisit if:** bulk runs across many repertoires get tedious.
- **Evidence:** n/a.
- **One-liner:** You choose the repertoire; the finder checks your games against it.

### D16 · storage · Novelty results stored locally: Status: Built · Updated: 2026-11-19 00:30
- **Decision:** Harry: local filesystem, next to the existing data at `%APPDATA%/ChessBox/ChessBox-data/` (on his machine `C:\Users\harry\AppData\Roaming\ChessBox\ChessBox-data\`), in a new `novelty/` folder. Exact format shown to Harry before it is written (T15).
- **Why:** repertoires and games are already local; works offline; no server work for the MVP.
- **Alternatives rejected:** Postgres on the Pi now (D11's sketch).
- **Trade-off / risk:** not synced between devices.
- **Revisit if:** repertoires move to a server in stage 2.
- **Evidence:** n/a.
- **One-liner:** Results live next to your games.

### D17 · data model · Exactly one prepared reply on your move: Status: Built · Updated: 2026-11-19 00:30
- **Decision:** Harry: one prepared reply to every position where it's the user's move (D11's single-response constraint). The editor blocks a second; imports flag violations to resolve. "Acceptable alternatives" (other theory or good moves that shouldn't count as a deviation) are a stage-2 idea.
- **Why:** a deviation is then unambiguous, and drills have one right answer.
- **Alternatives rejected:** allowing several replies now.
- **Trade-off / risk:** chessgraph files with several replies need resolving on import.
- **Revisit if:** stage 2 adds alternatives.
- **Evidence:** n/a.
- **One-liner:** One right answer per position, for now.

### D18 · storage · Novelty results: one JSON file per repertoire: Status: Built · Updated: 2026-11-19 00:30
- **Decision:** Harry picked `ChessBox-data/novelty/<repertoireId>.json` holding `games` (per-game result keyed `<site>:<gameId>`, with the moves to the surprise as `line`), `findings` (keyed `nodeId|move|kind`, with count, lastSeen, status new/dismissed/added, optional engine eval) and `nodeHits` (how often each repertoire node was reached).
- **Why:** one read + one write per run; per-game results are the source, findings and hits are recomputed from them (D11), so re-runs never double-count; status and eval carry over.
- **Alternatives rejected:** one small file per finding in `deviations/` and `novelties/` folders (thousands of files, more writes).
- **Trade-off / risk:** the file grows with games (~4k per account today); fine as JSON at this size.
- **Revisit if:** results move to a server (stage 2).
- **Evidence:** walk on real data: 8,340 Chess.com games, ~3 ms per game (measured in a throwaway vitest run, 2026-11-18).
- **One-liner:** Each repertoire keeps its own record of how your games went against it.

### D19 · novelty finder · You pick which imported accounts count: Status: Built · Updated: 2026-11-19 01:10
- **Decision:** Harry: the Novelty Finder lists every imported account folder (`<site>/<username>`) with checkboxes; the selection is remembered per repertoire in its novelty file (`accounts`). Default: all.
- **Why:** imported folders can include other people's accounts (e.g. `lichess/theoneandonlylipika`, ~225 games); works offline, unlike using Settings' linked names.
- **Alternatives rejected:** only accounts linked in Settings (needs the server); keep all folders.
- **Trade-off / risk:** one more control on the page.
- **Revisit if:** accounts move server-side.
- **Evidence:** first bulk run counted 4,396 games, ~225 of them from a second Lichess account.
- **One-liner:** Only your games count, and you decide which those are.

### D20 · dependency · React Flow + dagre for the repertoire builder: Status: Built · Updated: 2026-11-19 01:10
- **Decision:** Harry picked `@xyflow/react` (React Flow) to draw the repertoire graph and `dagre` for a top-down layered layout (M5 / T17).
- **Why:** nodes are React components (mini boards, comments, edit controls), pan / zoom / drag built in; dagre lays out ~900-node trees.
- **Alternatives rejected:** Cytoscape.js (fast canvas, but custom node content is harder); a research pass first.
- **Trade-off / risk:** two new dependencies; very large graphs may need collapsing branches for speed.
- **Revisit if:** 900+ node repertoires feel slow.
- **Evidence:** the 888-node White Aggressive Italian renders in ~1.2 s in the dev app (observed 1,184 / 1,281 ms). Versions pinned to stable releases: `@xyflow/react` 12.12.0 (not the 2-day-old 13.0 major), `@dagrejs/dagre` 3.1.3 (the maintained, typed `dagre`).
- **One-liner:** A React canvas for graphs plus an automatic layout.

### D21 · training · WeakPoints scheduled with FSRS (ts-fsrs 5.4.2): Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry picked FSRS via `ts-fsrs` 5.4.2 (MIT, no dependencies, Node ≥ 20), default parameters, desired retention 90%. A card = one prepared reply on your move, drilled as a short sequence (starting 2–3 moves earlier, opponent moves auto-played), auto-graded: wrong move → Again, right first time → Good.
- **Why:** FSRS beat SM-2 on 99.6% of ~10k benchmarked Anki collections and is Anki's built-in alternative (research Pass 1).
- **Alternatives rejected:** SM-2 by hand (less accurate, can't be tuned); `ts-fsrs` 6.0 (3 weeks old, Node ≥ 24, adds a dependency).
- **Trade-off / risk:** a new dependency; no source measures FSRS on chess-move cards.
- **Revisit if:** enough review history builds up to fit parameters (separate optimiser package).
- **Evidence:** research.md Pass 1.
- **One-liner:** The drills come back just before you'd forget them.

### D22 · storage · WeakPoints schedules in weakpoints/<repertoireId>.json: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry: one local file per repertoire in `ChessBox-data/weakpoints/`, cards keyed by repertoire node id (FSRS state + review log), separate from `novelty/`.
- **Why:** re-running the novelty finder (which rebuilds its derived data) never touches drill history.
- **Alternatives rejected:** a `cards` section inside the novelty file.
- **Trade-off / risk:** two files per repertoire; a deleted repertoire must remove both.
- **Revisit if:** data moves to a server.
- **Evidence:** n/a.
- **One-liner:** Your practice history lives on its own.

### D23 · training · A deviation within 0.3 pawns of the prepared move isn't drilled: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry: if full Stockfish rates the deviation within 0.3 pawns (TUNE) of the prepared move, it isn't drilled as a mistake; deviations without a verdict are drilled.
- **Why:** system.md: "a deviation doesn't necessarily mean it's a bad move… should be taken into account by stockfish".
- **Alternatives rejected:** drill every deviation; decide each one by hand.
- **Trade-off / risk:** needs the score after the prepared move too, so the verdict gains a third search (~2 s more).
- **Revisit if:** the threshold skips moves Harry wants drilled, or vice versa.
- **Evidence:** TBD (how many of the 154 Italian deviations fall inside 0.3).
- **One-liner:** Only real mistakes become drills.

### D24 · auth · Sessions last 3 days: Status: Built · Updated: 2026-11-20 19:00
- **Decision:** Harry: JWT expiry is the standard 3 days. 7 was only ever temporary.
- **Why:** shorter-lived tokens limit the damage of a leaked token, and the server has no revocation (README, Security).
- **Alternatives rejected:** 7 days (temporary value, now retired).
- **Trade-off / risk:** you sign in again every 3 days.
- **Revisit if:** sign-in every 3 days gets annoying enough to justify refresh tokens.
- **Evidence:** `apps/api/src/routers/auth.ts:10` signs with `expiresIn: '3d'` (server `48a45b3`).
- **One-liner:** A login token lasts 3 days.

### D25 · security · Server hardening (Harry's edits, committed 2026-11-20): Status: Verified · Updated: 2026-11-20 20:30
- **Decision:** Harry: env vars checked at startup; CORS allow-list (`localhost:3000`, `null`); rate limits 300/min per IP and 10 account links per 15 min per user (in memory); 64 KB body, 10 calls per batch; `user.me` selects safe fields only; production errors hide internals; Postgres not published; container runs as `node` and runs `prisma migrate deploy` on start; chess usernames limited to `[A-Za-z0-9_-]`, 8 s upstream timeout.
- **Why:** the API was open to any origin, leaked `passwordHash` through `user.me`, and published Postgres on the Pi.
- **Alternatives rejected:** none recorded.
- **Trade-off / risk:** rate limits reset on restart and won't work across several instances (one Pi, so fine).
- **Revisit if:** the API is exposed beyond Tailscale (needs HTTPS) or runs as more than one instance.
- **Evidence:** deployed 2026-11-20; from the desktop over Tailscale: `GET /` → `{"ok":true}`, a foreign `Origin` gets no `Access-Control-Allow-Origin`; the dev app signs in and uses every account call.
- **One-liner:** The server only trusts the app, limits abuse and never sends secrets.

### D26 · security · Login and register rate limits: Status: Built · Updated: 2026-11-20 19:50
- **Decision:** Harry (option A): login = 10 failed tries per 15 min per IP + username, reset on a successful login; register = 5 per hour per IP. Numbers are (TUNE). Re-auth checks in D28 count as login tries.
- **Why:** stops password guessing without letting someone lock you out from every machine; a success resets so typos never lock you out.
- **Alternatives rejected:** per IP only (B: misses nothing on Tailscale but shares a budget per IP); per username only (C: anyone can lock you out).
- **Trade-off / risk:** many usernames from one IP are only held back by the 300/min global limit. Counters are in memory and reset on restart.
- **Revisit if:** the API leaves Tailscale, or the numbers lock Harry out.
- **Evidence:** 6 server tests (`credentials.test.ts`): 11th try blocked even with the right password, other IP unaffected, success clears the count, case-insensitive, 6th sign-up refused, re-auth shares the limit; removing the reset turns its test red. Server `1717269`, deployed 2026-11-20 (limits not hit live).
- **One-liner:** Ten wrong passwords and that login waits 15 minutes.

### D27 · auth · Changing your password doesn't sign out other devices (for now): Status: Planned · Updated: 2026-11-20 19:20
- **Decision:** Harry (option A, **for now: must be revisited**): existing tokens stay valid until they expire (at most 3 days, D24).
- **Why:** no schema change, consistent with D9 (sign-out-everywhere reverted 2026-10-05); behind Tailscale a stolen token is unlikely.
- **Alternatives rejected (for now):** B: `passwordChangedAt` column, tokens issued before it rejected in `createContext`, the changing device gets a fresh token (one migration).
- **Trade-off / risk:** a leaked token survives a password change for up to 3 days.
- **Revisit if:** before the API is exposed beyond Tailscale, or before stage 2, whichever is first. Tracked in `plan.md` §0 Pending and `tasks.md` 🅿️ Parked.
- **Evidence:** n/a.
- **One-liner:** A new password doesn't kick out old logins yet; that's a known gap to close.

### D28 · contract · Change password / username API: Status: Verified · Updated: 2026-11-20 20:30
- **Decision:** Harry (option A): `user.changePassword({ currentPassword, newPassword })` → `{ ok: true }`; `user.changeUsername({ password, newUsername })` → `{ username }`. Wrong password → `UNAUTHORIZED` "Current password is incorrect"; taken name → `CONFLICT` "Username already taken". The token is unchanged (it holds the user id).
- **Why:** the username is half the login, so changing it is as sensitive as the password; an unlocked laptop can't take the account.
- **Alternatives rejected:** B: only password change re-asks the password.
- **Trade-off / risk:** one extra field per form.
- **Revisit if:** email change or account deletion are added (same re-auth rule).
- **Evidence:** 10 server tests: new hash stored / old rejected, wrong password keeps the hash, password and username rules enforced, signed-out → `UNAUTHORIZED`, deleted account → `NOT_FOUND`, rename then sign in with the new name, taken name → `CONFLICT` (via the unique index, so a race can't double-claim), same name is a no-op. Server `1717269`, deployed; Harry changed username and password in the app on a `dev` account and signed back in (2026-11-20).
- **One-liner:** Changing your login details asks for your password again.

### D29 · tooling · Server tests run on Vitest too: Status: Built · Updated: 2026-11-20 19:50
- **Decision:** Harry: the server (`apps/api`) uses Vitest 5.1.1 as a devDependency, like the desktop (D12). `npm test` in `vendor/chessbox-server/apps/api`.
- **Why:** same runner and API in both repos; T19 had to be tested on the server.
- **Alternatives rejected:** Node's built-in `node --test` (no new dependency, but a different API and weaker output).
- **Trade-off / risk:** one more dev dependency; the Docker image's `npm ci` installs dev deps too, so the image is a bit bigger.
- **Revisit if:** the image size on the Pi matters (`npm ci --omit=dev` would need tsx and prisma moved to dependencies).
- **Evidence:** 17 tests in ~26 s (Argon2id hashing dominates).
- **One-liner:** Both repos test with Vitest.

### D30 · storage · weakpoints/<id>.json = FSRS state + full review log: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): `{ version: 1, repertoireId, updatedAt, cards: { "<nodeId>": { source, fsrs, log: [{ at, rating, played }] } } }`, keyed by the node where it's your move (same `nodeId` as a deviation `Finding`).
- **Why:** fitting FSRS parameters later (D21 "Revisit if") needs full review history; `version` lets a future format spot old files.
- **Alternatives rejected:** state only (history lost for good); state + last 20 reviews (the optimiser needs full histories).
- **Trade-off / risk:** the file grows ~40 bytes per review (estimate, not measured).
- **Revisit if:** the file gets big enough to slow loading.
- **Evidence:** TBD (measure file size after a month of drills). Sync + queue on the 1,082-node data: Italian ~130 ms, 1.e4 12–21 ms warm (each node replayed once; was 385–603 ms replaying every line from the root), measured in Vitest on `weakpoints-drills`.
- **One-liner:** Every drill you do is kept, not just the next due date.

### D31 · storage · Verdicts store numeric scores from your side: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): `Finding.eval` gains `playedCp` and `preparedCp`, centipawns from the repertoire side; a mate counts as ±100 pawns. The display string stays. Old verdicts without `preparedCp` count as "no verdict" (drilled, D23) until re-evaluated.
- **Why:** store data, not presentation; D23's comparison becomes one subtraction.
- **Alternatives rejected:** parse the `"+0.35"` / `"#3"` strings.
- **Trade-off / risk:** the 12 existing verdicts need Evaluate again to be filtered.
- **Revisit if:** n/a.
- **Evidence:** n/a.
- **One-liner:** Scores are saved as numbers so they can be compared.

### D32 · contract · WeakPoints scheduling runs in main; renderer only reports right / wrong: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): `weakpoints:queue(repId)` returns due + new cards with their lead-in lines; `weakpoints:grade(repId, nodeId, correct: boolean)`. Main builds the pool, runs `ts-fsrs` on its own clock, saves.
- **Why:** a boolean is trivial to re-sanitise (D8); the nodes and novelty file already live in main (D4).
- **Alternatives rejected:** renderer runs FSRS and sends whole cards (main must validate ~10 untrusted fields; ts-fsrs in the renderer bundle).
- **Trade-off / risk:** one IPC round trip per grade.
- **Revisit if:** another tool needs to schedule cards from the renderer.
- **Evidence:** n/a.
- **One-liner:** The window says "right" or "wrong"; the main process decides when you see it again.

### D33 · training · What becomes a WeakPoints card (TUNE): Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): only positions your games reached. Deviations: non-dismissed, outside 0.3 (D23), due now. Rare: your-move positions hit 1–2 times. Strong: hit ≥ 5, never deviated. Rare + strong enter at 10 new per day, rare first. Dismissed deviations are skipped.
- **Why:** `system.md` builds WeakPoints from the novelty-finder data.
- **Alternatives rejected:** count never-reached (0-hit) positions as rare (months-long new queue on the 888-node Italian); every your-move node is a card (Chessable model, drifts from "weak points").
- **Trade-off / risk:** lines you never reach are never drilled.
- **Revisit if:** the queue runs dry, or the numbers feel off.
- **Evidence:** White Aggressive Italian (real data, 2026-11-20): 96 deviation, 37 rare, 42 strong candidates; the first sync makes 106 cards (96 deviations + the 10 new / day). 1.e4 Repertoire: 9 deviation, 6 strong, 15 cards.
- **One-liner:** Your mistakes, your rarely seen lines, and now and then your strong ones.

### D34 · training · Only the target move of a drill is graded: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): a drill starts 2 of your moves before the target (TUNE); a wrong lead-in move shows the right one and carries on ungraded; only the target card gets Again / Good.
- **Why:** FSRS assumes one review per card when it's due; grading lead-ins would review cards early and stop strong ones stretching out.
- **Alternatives rejected:** grade every your-move in the sequence that is a card.
- **Trade-off / risk:** lead-in mistakes go unrecorded.
- **Revisit if:** lead-in moves keep slipping.
- **Evidence:** n/a.
- **One-liner:** One drill, one grade.

### D35 · failure modes · WeakPoints file and repertoire changes: Status: Built · Updated: 2026-11-20 21:45
- **Decision:** Harry (took Claude's rec): an unreadable file is renamed `<id>.corrupt-<time>.json`, a fresh one starts, toast. A card whose node is deleted is dropped; a card whose prepared reply changed resets to New (log kept). No novelty file → "Run the Novelty Finder on this repertoire first" with a button there.
- **Why:** fail safe without deleting anything; old history must not grade you against a move you no longer play.
- **Alternatives rejected:** block WeakPoints until the file is fixed by hand; keep orphaned / changed cards and skip them.
- **Trade-off / risk:** a corrupt file resets the schedule (the backup keeps it).
- **Revisit if:** n/a.
- **Evidence:** n/a.
- **One-liner:** Bad data is set aside, never lost, and never blocks training.
