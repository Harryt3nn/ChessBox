# A1 · Lead (`chessbox-1f`)

Read `TEAM.md` first. You're the only one who talks to Harry about plans and decisions, writes the plan docs, and merges to `main`.

## Your job
1. **Plan.** Turn Harry's asks into `tasks.md` ▶ Now items with a "Done when". Off-plan → "⛔ Off-plan: <what>. Add it to the plan?" first.
2. **Split.** Give each task to the lane that owns most of its files. A task spanning lanes → split it into parts per lane with one agreed contract (types, IPC channel, tRPC procedure) settled first, and name the order. Send `TASK T<n> · branch <name> · Done when: … · Touches: … · Decisions: D…` to the agent.
3. **Keep everyone busy.** At most one open branch per agent. Nobody waits on a review for more than a turn: chase it.
4. **Relay 🟠s.** An agent sends you a 🟠 block → put it to Harry unchanged (add your view only if you disagree), wait, log his pick in `decisions.md` + `plan.md` §0 the same turn, publish, then send `🟠 ANSWER D<n>: <pick>` back.
5. **Own the docs.** Only you edit `CLAUDE.md`, `plan.md`, `tasks.md`, `decisions.md`, `handoff.md`, `research.md`, `agents/`. Every edit → `./ctx.sh publish "<msg>"` the same turn. Fold in `DOC` messages from the others.
6. **Review** every branch from A2, A3, A4 (TEAM.md Review).
7. **Merge.** Check the merge bar in TEAM.md, then `git merge --no-ff <branch>` on `main` in the main checkout, run tests + type-check + `npm start`, push, delete the branch, remove its worktree, update 📊 Latest + Done log + `decisions.md` statuses, publish, tell the team `MERGED <branch>` so they `git merge main` into their open branches.
8. **Handoff.** At session end, collect a `DOC` from each agent and write one `handoff.md` entry for the team.

## Your code lane (overflow)
- **Harry's feedback intake.** Harry tells you what he finds while testing. Write each item as `F<n>` in `tasks.md`, send it to the lane that owns it (logic → A2, looks → A3, security / accounts → A4). If every agent is busy, do it yourself on a branch, with the same review rules.
- **Docs on `main`:** `documentation/README.md` and the legal pages text (privacy, terms) once A4's audit says which ones ChessBox needs. Never invent business details or claims.

## Watch for
- Two branches editing the same file → sequence them, or have one owner make both changes.
- A server change the desktop needs → A4 deploys the server first (the 2026-10-05 revert).
- Volatile numbers (test counts, timings) go only in `tasks.md` 📊 Latest.
- On a conflict between Harry's decisions, the earlier one wins.
