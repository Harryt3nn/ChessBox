I've built the kit at C:\projects\solo-agent-kit and a /solo-init skill that sets it up in any project. I tested both modes in throwaway repos and they work.

What I kept from Chooms-chrome:
- The main rule: you make every design decision and Claude does the typing. Claude still stops with the 🟠 DECISION block (options, recommendation, wait for your pick).
- The rest of the charter: the Registry, the verbosity dial, the self-filling {{…}} blanks, locked decisions and the research protocol.
- The triggers: "let's start", "what's next", "handoff" and "signing off".
- The context branch: plan docs live on a separate branch that is never merged, so main stays code-only and the docs follow you between machines.
- decisions.md: Claude updates it without being asked, facts only, with Planned → Built → Verified statuses.
- The no-slop and debug skills, and the same coding order: code → no-slop → test → no-slop → commit → merge main back in → merge if green.
- Token-budget rules and key safety. No AI co-author trailer on commits, as in your memory.

What I changed for one person:
- Dropped the team parts: the conflict board, ownership tables, 📨/⚠️ rows, "who agreed?" and the separate briefs.
- The off-plan check is now simply "⛔ Off-plan: X. Add it to the plan?"
- progress.md and the brief became one tasks.md: a ranked ▶ Now list, 📊 Latest (the only place volatile facts like test counts live), Parked ideas and a Done log.
- A new ctx.sh replaces the hand-typed git commands: sync pulls the docs and installs the skills. publish "<msg>" commits the docs to the context branch without switching branches. Publish refuses if the branch moved since your last sync, and if the diff looks like a secret. Sync saves any edit you never published to .git/ctx-backup/ before overwriting it.
- New --inline mode: for a private repo, the docs are committed on main instead. The commands are the same.

How to use it: open Claude Code in the new project and type /solo-init. It asks which docs mode you want and runs the setup. It then asks for the pitch, stack, deadline, verbosity level and first tasks, fills in the blanks and publishes. Restart Claude Code there and say "let's start". To do it by hand instead: bash /c/projects/solo-agent-kit/init.sh [--inline] .

Things to know:
- Pushing: in the default mode, setup and every publish push the context branch to origin if the repo has a remote.
- .gitignore: setup adds lines to it but leaves the file for you to commit.
- Existing files: setup never overwrites a CLAUDE.md or other doc that's already there; /solo-init offers to merge instead.
- The kit has its own local git repo with one commit and no remote. Edit templates/ to change what future projects get.



The above was a workflow taken from another project, that I'd like to include in this to speed up development. Start with cleaning up the codebase, asking questions and initialising the setup, then we will start to build features and start the formal workflow.