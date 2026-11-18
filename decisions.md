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
