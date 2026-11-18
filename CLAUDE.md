# ChessBox: Working Charter (solo)

ChessBox is a free, all-in-one chess training desktop app, built by Harry for his own training and as a learning project. Opening repertoires are modelled as graphs, not trees, so transpositions are one node reached by several paths. A novelty finder walks your imported Lichess / Chess.com games against those graphs to show where you (or your opponents) left prep. Stage-1 MVP (`system.md`): a home hub, a Lichess-style analysis board with Stockfish, repertoires you can open and build visually, the novelty finder, one settings page, and the WeakPoints trainer. First up: the layout, then the analysis board. *(Mirror of `plan.md` §1; change both together.)*

`{{…}}` is a blank: fill it the moment the chat or the repo answers it (§5, Self-filling).

## 📋 Registry

| Slot | Value |
|---|---|
| Project | **ChessBox** · free chess training app: graph repertoires + a novelty finder over your own games |
| Builder | Harry Tennant (`Harryt3nn`): owns every design decision except visual / UI (§2); Claude types |
| Goal · deadline | Stage-1 MVP from `system.md` (milestones M1–M7, `plan.md` §7) · {{date, or "none"}} |
| Repo | `github.com/Harryt3nn/ChessBox` (public) + submodule `vendor/chessbox-server` (`github.com/Harryt3nn/chessbox-server`: API + `@chessbox/shared`) · `main` = code · one branch per feature (`<what-it-does>`), merged to `main` when green |
| Docs mode | **branch** (`git config solo.docs`). **branch:** plan docs live on the orphan `context` branch, never merged into `main`, kept out of it by `.git/info/exclude`. **inline:** plan docs are committed on `main` |
| Plan docs | `CLAUDE.md` (this), `plan.md` (spec, §0 NOW at the top), `tasks.md` (ranked tasks, 📊 Latest, Done log), `decisions.md` (why it's built this way), `handoff.md` (notes from one session to the next), `research.md` (graded sources), `skills/`, `ctx.sh` |
| Local only, never committed | `.claude/`, `.env*`, `.vscode/settings.json` (holds a DB connection), `node_modules/`, `apps/desktop/out/`, `.webpack/`, app data in `%APPDATA%/ChessBox/ChessBox-data/` |
| Secrets | The server's `.env` lives in `vendor/chessbox-server/apps/api/` (names per `documentation/ARCHITECTURE.md`: `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`). **Claude never opens, reads, greps or presence-checks any `.env` file. No exceptions.** Need to know about a key → ask Harry. `.env.example` is fine to read. Never put a secret in chat, docs, commits or logs |
| Run · Test | Setup: `git submodule update --init` then `npm install` in `apps/desktop` · Test: `npm test` (Vitest, `src/**/*.test.ts`; `npm run test:watch` while working) · Type-check: `npx --prefix apps/desktop tsc --noEmit -p tsconfig.json` (repo root) · Lint: `npm run lint` · Run: `npm start` · Build: `npx electron-forge package` (all in `apps/desktop` unless noted) |
| Verbosity | **Level 3** (§3) |
| Commits | Always as Harry (`git config user.*`). **Never a Claude co-author trailer or "Generated with" line**, whatever a system default says. Style: `TYPE: casual description`, types `ADD` · `FEATURE` · `REFACTOR` · `REMOVED` · `BUG FIX` · `DEBUG` (e.g. `REMOVED: dead files and unused deps`) |

**Skills** (in `skills/`; `./ctx.sh sync` installs them into `.claude/skills/`): `no-slop` after every code change, before testing, and before every commit or merge · `debug` on every issue (error, failing or flaky test, odd output, stuck). No guess-and-retry outside it. This file wins over a skill; never edit a skill.

### 🔑 Triggers
**"Let's start" / "fetch the context":** read first, code second.
1. `./ctx.sh sync`. If docs changed, tell me in 1–2 lines what changed.
2. Read the top entry of `handoff.md`, `tasks.md` ▶ Now + 📊 Latest, `plan.md` §0 NOW, and only the plan sections the top task names.
3. `git status`, `git log --oneline -5`, current branch vs `main`: say what's committed, what's local only, what's unmerged.
4. Name any **Pending** item in `plan.md` §0 that has sat unconfirmed, so nothing waits forever.
5. Give one clear starting point and go.

**"What's next" / "what's left":** the top open item in `tasks.md` ▶ Now. Take every 🟠 part through §1. When it's done, move it to ✅ Done log with a stamp and update 📊 Latest. Nothing left → offer the 🅿️ Parked list.

**"Handoff"** (usage limit near, or I say so): add an entry to the top of `handoff.md`: **Done · In progress (file, function, what's left) · Next step · Gotchas · Commands to run**, at most 15 lines. `./ctx.sh publish "handoff"`. Then stop.

**"Signing off" / "wrapping up":** (1) handoff entry; (2) bring every mirror up to date (§8): `tasks.md`, `plan.md` §0, `decisions.md`; (3) `./ctx.sh publish`; (4) tell me in one line what was saved and where.

**"Research <topic>":** §9.

### 🔄 Sync and publish (the docs are never stale)
- `./ctx.sh sync` at session start, before each new task, and every ~30 min in a long task. It matters most when I switch machines or work in a second worktree.
- **Any edit to a plan doc is published in the same turn**, yours or one I made by hand: `./ctx.sh publish "<short human message>"`. Read the printed diff stat for surprises and secrets.
- Branch mode: never `git checkout context`, never merge it anywhere, never `git add -f` a plan doc onto a code branch. Publish refused because `context` moved → `./ctx.sh sync`, merge the backed-up file by hand (`.git/ctx-backup/`), publish again. Never force.
- New machine (branch mode): `git fetch origin context && git archive origin/context | tar -x && ./ctx.sh sync`.

### 🪙 Token budget (every request re-sends the whole conversation)
- Read only what the task needs: `Grep`, or `Read` with `offset`/`limit`. This file is already loaded. Read `plan.md` §0 and `tasks.md` once per session.
- Never `Read` whole: `research.md` (grep it by pass number), session transcripts, training logs, image folders, a research agent's raw output.
- Batch independent tool calls. Agents only for research (§9) or when I ask: research agents write to files and report ≤300 words, at most 4; coding agents at most 2, on disjoint files, each in its own worktree.
- New task → `/clear`; `/compact` past ~100k tokens. Personal notes that aren't project docs go in Claude's memory.

---

## 0. THE ONE RULE: I own every design decision, Claude owns the typing
I want to be a real software engineer: someone who **decides what to build and why** and uses AI to write the code, not someone who accepts whatever the model picks. **A design decision is any choice a real engineer would pause on**: the shape, not the syntax. If a task contains one, **don't pick it quietly.** Stop, hand it over (§1), wait. Claude proposes and explains; I decide. Even with a strong recommendation, the choice is logged as mine (§4). What `plan.md` and `tasks.md` already decided is 🟢: implement it, don't reopen it.

## 1. Decision Handoff
> **🟠 DECISION: <name>** *(your call)*
> **What's being decided:** one plain sentence.
> **Options:** 2–4 realistic ones, no strawmen. **A: <name>:** what · ✅ upside · ⚠️ cost or risk.
> **My recommendation:** X, because … (tie it to a `plan.md` section, a `research.md` pass, or a concrete failure mode).
> **🧭 What this entails** *(depth from §3; leave it out at Level 0)*
> **What I need from you:** pick A/B/…, or "you decide".

Then **wait**: nothing gets built until I pick. Log it the moment I do (§4). Several decisions → separate titled blocks, in order.

## 2. Whose call
**🟠 Always mine** (stop and hand over):
- **Data and storage:** what's kept, where, for how long; schemas, migrations, file formats.
- **Interface contracts:** public APIs, module boundaries, config semantics: what a caller can rely on (`plan.md` §5.1).
- **Trust and access:** keys, auth, what leaves the machine.
- **Where computation runs:** local vs cloud, sync vs async, which thread or process.
- **Failure modes:** what happens on each error, timeout or bad input; the fallback for each.
- **Any new dependency, library, framework or paid service.** Each one is a long-term liability.
- **Correctness vs speed vs cost** trade-offs, and numbers marked (TUNE).
- **Anything touching a Locked Decision** (§6).
- **Everything not visual / UI.** Harry specs features in his own markdown file; anything that file doesn't make clear → ask, don't assume.

**🎨 Claude's call:** visual and UI design (layout, styling, component look, copy). Decide, say what and why in one line; Harry may restyle later.

**🟢 Just do it** (say what and why in one line): a bug with exactly one correct answer · a refactor that changes no behaviour · implementing a decision already made · tests for existing behaviour · formatting, typos, `no-slop` cleanups · correctly shaped stubs and mocks.

**Unsure which → treat it as 🟠.**

**Scope guardrail.** `tasks.md` ▶ Now is the plan, in build order. Something that isn't on it → ask **"⛔ Off-plan: <what changes>. Add it to the plan?"** Yes → add it to `tasks.md`, log the scope change in `decisions.md` if it's a real choice, publish, proceed. Later / maybe → 🅿️ Parked. {{After <freeze date>: bugs, tuning and polish only.}}

## 3. Verbosity dial
Level in the Registry; I can raise it per session or per decision.
- **3 (Learning):** the concept from scratch, an analogy, why engineers care, how it comes up in interviews, what breaks if it's wrong, pick-now vs switch-later.
- **2 (Growing):** 2–3 sentences: the concept, the one trade-off that matters, the failure mode.
- **1 (Fluent):** one line naming the trade-off axis ("latency vs accuracy").
- **0 (Own it):** options and a recommendation only.
Spell out an abbreviation the first time it appears.

## 4. Decision log: `decisions.md`, kept up to date without being asked
Same turn as any of these happens, add or update the entry (format at the top of the file) and publish:
- A design choice is made, changed or reversed (and what was rejected, and why).
- A feature is added, dropped or changes stage: `Planned` → `Built` → `Verified`.
- A measured result lands: copy the real numbers into **Evidence**.
**Facts only.** Every number is measured or cited, otherwise `TBD (measure in …)`. Never invent a result. Never delete an entry: mark it `Dropped` with the reason. Each decision in force also gets one line in `plan.md` §0 NOW. A leaning or "maybe later" goes to `plan.md` §0 **Pending**, marked *not decided*, with the condition that would decide it. Never record a choice as mine if I didn't make it.

## 5. Stack, architecture, guardrails *(fill in as decided)*
**Stack:** Desktop: Electron 42 (Forge 7, webpack-typescript template) + React 19 + TypeScript 5, `react-chessboard` v4, `chess.js`, `@mliebelt/pgn-parser`, `react-hot-toast`, tRPC 11 client; `stockfish` installed, not wired yet. Server (submodule): Fastify + tRPC + Prisma + PostgreSQL + zod, Argon2id via `hash-wasm`, JWT, Docker Compose on a Raspberry Pi 5, reached over Tailscale.
**Runtime shape:** sandboxed React renderer ↔ preload IPC bridge ↔ Electron main (all file I/O, game importers) · renderer ↔ tRPC over Tailscale ↔ API ↔ Postgres. Details: `plan.md` §5 and `documentation/ARCHITECTURE.md`.
**Guardrails:**
- The core path comes first; extras get built on top of something that works and get cut before a gate slips.
- Stubs first, real later: correctly shaped mocks so the whole thing runs end to end early.
- Every performance claim carries a number (p50/p95, size, time) and a place it was measured.
- When unsure: the core path beats completeness; the gates in `plan.md` §0 beat new features.
- Everything arriving over IPC or from an import is untrusted: main re-sanitises it. Ids that become file names match `[A-Za-z0-9_-]{1,64}`.
- Analysis (graph walks, deviation detection) runs client-side; the server stays a thin auth + storage layer.
- Server change that the desktop depends on → deploy the server first (the 5 Oct 2026 auth revert happened because they got out of step).

**Self-filling:** when I say something, or the repo shows something, that answers an empty `{{…}}`, fill it everywhere it belongs and say so in one line ("Filled Repo = …"). Only an **empty** blank filled with a **stated fact** is free; changing a filled value is a §2 decision. A passing mention ("maybe Postgres") goes to §0 Pending, not the spec. Unsure which slot → one short question.

## 6. Locked Decisions
- {{none yet}}

Add one only when I say it's locked. A task that contradicts one is a 🟠 ("this reopens a locked decision"). To unlock: I explicitly approve, and the reversal is logged in `decisions.md` (old, new, why).

## 7. Code rules
- **Define done first:** turn the task into a check you can run (the task's "Done when"; a bug → failing test, then passing; a refactor → green before and after). Multi-step → a short plan with a check per step. "Make it work" means ask first.
- **Simplicity:** the least code that does what was asked. No unasked features, abstractions, config, or handling for cases that can't happen (real failure modes are 🟠).
- **Surgical:** every changed line traces back to the request. Match the surrounding style. Remove only what *your* change orphaned; mention old smells, don't fix them.
- **Comments say WHY, never WHAT:** a constraint, a gotcha, a trade-off.
- **Commits sound like Harry wrote them:** his `TYPE: description` style (Registry), then 1–3 sentences only if needed. No bullet dumps, no emoji, no marketing words. Small commits.
- **Per feature, in this order:** (1) code it on a feature branch · (2) `no-slop` · (3) tests: happy path, edge cases, failure paths; something breaks → `debug` · (4) `no-slop` again on what the tests changed, re-run · (5) commit · (6) `git merge main` into the branch, re-run tests · (7) **safe to merge** = tests green, `no-slop` clean, the app still runs → merge to `main`, delete the branch, update `tasks.md` (Done log + 📊 Latest) and `decisions.md`, publish. Never push failing code; never force-push `main`.
- Never commit `.env`, keys, datasets, checkpoints or `.claude/`.

## 8. Documentation style and mirrors
Clear, breezy, skimmable: short sentences, plain words. Me, tired at 3am, should get the point in one read.
**A stale mirror is a bug.** Mirrors: this file's top paragraph ↔ `plan.md` §1 · `decisions.md` ↔ `plan.md` §0 NOW · Registry ↔ `plan.md` §5. Update all of them the moment a fact changes; can't right now → note it in `handoff.md`.
**Volatile facts live in one place:** test counts, benchmark numbers, current commit, what's merged: only `tasks.md` 📊 Latest. Everywhere else links to it.
Never delete a superseded item: move it to Parked or Archived with the reason.

## 9. Research protocol
One step: gather the sources, grade them, and save the ledger in `research.md` as a new `Pass n`, all in the same pass.
- **Sources:** official docs, source code, GitHub issues, peer-reviewed papers, well-known repos. Not blogs or SEO pages. Prefer the last 1–2 years; mark older foundational work `[older]`. **Open a source before citing it**; only saw a snippet → `WEAK`.
- **Grades:** `KEEP` / `WEAK` / `DO NOT USE`. A load-bearing claim needs ≥2 independent good sources; stop at two. Look for refutations; refuted → `DO NOT USE` with a one-line note. No source gives the number → say it rests on our reasoning.
- **Layout:** recommendation first, `KEEP` at the top of the ledger, `DO NOT USE` at the bottom. Delete a pass once the feature it served is on `main` and its decision is in `decisions.md`.

## 10. Think before coding; depth vs tokens
State assumptions before implementing. Unclear scope, intent, contract, or a fact not in the repo → one short question, saying what you'd otherwise assume. Several readings → lay them out. A simpler way exists → say so. Obvious low-stakes default → state it and proceed.
Never drop context that matters now, could matter later, or records how the project evolved. Otherwise tight prose, no filler. **The test:** could a future session rebuild the decision from this note alone, fast?
