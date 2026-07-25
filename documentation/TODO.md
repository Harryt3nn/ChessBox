1. Add export feature in edit repertoires page. Ideally, this will be in the same format as chess graph. Moderately low priority. 

2. Change 'repositories' back to a normal word for the storage. This does not affect the functionality and is therefore a low priority task. 

3. Add permanent connections to Chess.com and Lichess API with analytics page + way to display and read data. Possibly able to use current system manager, or instead build new architecture. Do not want the user to keep having to input the chess.com or lichess username. Ideally, user can connect to lichess / chess.com permanently in the settings page - Fairly high priority after making analytics page.

4. Analytics Page is able to connect to user's lichess / chess.com account and display as much analytical data as we can get our hands on! Primary focus on the opening and success rates. Compare the opening moves to saved repertoires for more data. Data should all be displayed in an easy to read way, with chess.com view, lichess view and combined view. One more primary feature is the 'novelty finder' than can analyse latest game played. Automatically return the opening played based only on saved repertoires. Return the repertoire that was followed for the most number of moves. This will be how many nodes travelled on the graph before a difference is found. This move should be marked in folder containing known deviations, which can be used later for training purpose to help the user eliminate these deviations and stick to the repertoire. If the repertoire is followed to a leaf node, the next move in the latest game is saved as a single object in a novelties folder. The idea of novelties is that they can be analysed in a novelty viewer page (later). Game data should be categorised over time periods, like latest game, today, weekly, all time etc.. that can filter what data is shown. More features to be added later. Very high priority to make a start on this. 

5. Novelty analyser - Using the stockfish api (or other suitable tool), the novelty can be analysed with how good of a move it is. Potentially could use a free ai api to provide feedback on how that move impacted the game. With this information, the user can decide to add that novelty to the repertoire as a new node on a graph. All repertoires will have two views. One that is an original, and one that contains added novelties. These are seperate JSON files, but connected through shared id, or other suitable method.

6. Add visual indicator on editrep page if a rep is black or white

7. (low priority) add manual graph creation, similar to chess graph. Putting this off because I want to think of a more unique way of doing this. Otherwise, it can be done by moving peices manually. 

8. (low priority) training tools page...

9. presaved reps (just manually created data that can be shared). Potentially could turn into a community sharing platform if I decide to take this app fully online - would require an account system, passowrd reset, email confimation, RDBSM postgres etc...

10. add peice sounds!

11. finalise logo and display, with changeable colour schemes

12. -------------------------------------

13. CURRENT: basic analysis board (without stockfish, adding that later. For now, is a way to test out features with the react chessboard (v4)). Features to add: move history, stockfish move analysis, highlight legal captures, toggle on or off highlighting legal moves, flip board, board cosmetics

14. fix spelling mistake in 'EditRepertiores'

15. ---------------------------------------

16. ---------------------------------------

17. different coloured folders

18. -----------------------------------------

19. left click on the board removes all highlighted sections

20. Switch from font awesome to flaticon SVG images

21. Add email verification + reset password + forgot password

22. RATE LIMITING ON EVERYTHING!!!!


Worth doing before September
.env.example — five minutes, and it's the first thing anyone cloning your repo (including an interviewer) will look for. Nothing kills a portfolio project faster than a reviewer cloning it and immediately hitting the exact debugging spiral we just went through.
A README that actually explains the architecture — you've already got ARCHITECTURE.md files scattered through the repo, which is great instinct. Make sure the root README.md has: what the app does, why (the real problem it solves for you), tech stack, and setup instructions that work start-to-finish. This is genuinely one of the highest-leverage things for a portfolio piece — reviewers spend seconds deciding whether to dig deeper.
Basic integration tests on auth.ts, specifically — not because a hobby project needs full coverage, but because "shows understanding of testing" is a real signal on a CS application, and auth is the one part of your app where an interviewer might actually ask "how did you make sure this was secure/correct?" Even 4-5 tests (register succeeds, duplicate email rejected, wrong password rejected, login returns a valid token) is enough to point to.
Rate limiting on login/register — cheap to add (@fastify/rate-limit is a one-line plugin), and it's the kind of detail that separates "I copied a tutorial" from "I thought about how this gets attacked." Worth it given you're already timing-safe-comparing passwords — you clearly care about this stuff, so finish the thought.
Error boundaries / graceful failure in the desktop app — if Postgres or the API is down, does the UI just hang or crash? A polished 1.0 handles "server unreachable" with a real message, not a blank screen.
Skip for now, revisit post-September
Everything in my last message beyond those — Vault, Turborepo, Redis-backed sessions, Sentry, CI/CD migration pipelines. These solve problems at a scale and team-size you don't have. Adding them now costs you real September-deadline time for approximately zero portfolio benefit — a reviewer isn't going to check if you're using HashiCorp Vault for a hobby project's dev secrets. If anything, over-engineering a solo hobby project can read as not understanding when complexity is warranted, which cuts against you.
The one exception: if the "problem in your real life" ChessBox solves involves genuinely sensitive data beyond login credentials (e.g., real payment info, other people's data), that changes the risk calculus and I'd want to know more specifically what before advising further.
What actually moves the needle for a year-in-industry application
Beyond the code itself: a short case-study writeup (even just a section in the README) — "I hit this exact debugging problem, here's why it happened, here's the fix" — of something like the env-loading/import-order bug we just solved together is genuinely great material. It's a real, non-trivial ESM/Node subtlety, and being able to explain it clearly is a stronger signal than the code that fixed it. Most students can't articulate why import order matters in ESM; you now can, from lived experience.


Before v1 Launch (required)
Security — the load-bearing items
 Rate limit auth.login — highest priority security item. No limit currently exists; someone could brute-force a known username's password. Add @fastify/rate-limit, apply a strict limit here specifically (e.g. 5 attempts / 15 min / IP).
 Rate limit auth.register — prevent scripted account-creation spam.
 Rate limit connections.connectLichess / connectChesscom — these proxy to third-party APIs; unbounded calls could get your server (or its IP) rate-limited or blocked by Lichess/Chess.com.
 Tighten CSP before packaging — both TODO comments already in the code (index.html and forge.config.ts's devContentSecurityPolicy) need addressing: drop 'unsafe-eval' and the ws://localhost:3000 dev-server entry, since neither should exist outside of local development.
 Lock down CORS origin: true — currently reflects any origin, fine for local dev, not for anything real. Replace with an explicit check once you know your packaged app's actual origin behavior.
Auth / accounts
 Password reset flow — no way for a user to recover a forgotten password currently. Table stakes for a real signup system.
 Email confirmation — verify the email address at signup is real and owned by the registrant. Lower urgency than password reset, but expected of "real" auth.
Core functionality gaps
 importANB.tsx is incomplete — comment in the file itself says it's a partially-finished copy of ImportModal.tsx; the selection UI is missing entirely and the import button can never be enabled as currently written. Needs finishing or removing from the UI if not ready.
 Icon set — Flaticon Premium SVGs still needed (folder-plus, plus, import, magnifying glass, chevron, pencil, trash, knight). Blocking a fully polished UI. Grab licenses + PDFs while subscribed.
 Homepage — currently a placeholder ("Home page coming soon..."). Needs real content before this looks like a finished v1.
 Profile page — currently a stub with just a plain logout button. Decide minimum viable content for v1 (even just displaying username/email/connected accounts would round it out).
Polish / correctness
 Fix .moveActive auto-scroll selector bug in BoardView.tsx — querySelector('.move-active') will never match a CSS Modules class; the "scroll to active move" behavior likely silently does nothing. Swap to a data-active attribute.
 Style importANB.tsx / ImportModal.tsx — both currently use unstyled literal classNames with no CSS module wired up at all.
 Rename importANB → ImportANB — lowercase component name works but risks confusing JSX/DOM-element resolution and trips some lint configs.
After v1 Launch (ongoing hobbyist work)
Security hardening (deeper, not launch-blocking)
 Consider helmet or equivalent security-headers middleware on Fastify for defense-in-depth beyond CSP alone.
 Revisit JWT expiry/refresh strategy — currently a flat 7-day token with no refresh mechanism; fine for v1, but a refresh-token flow would be a nicer long-term UX (avoids full re-login every week).
 Audit npm audit findings periodically — 56+ vulnerabilities showing in current dependency tree; triage rather than ignore over time.
Features
 Signup-flow polish — currently minimal viable toggle-based form; consider clearer inline validation feedback, password strength indicator, etc.
 Theme switching (cream/noir data-theme structure already scaffolded in index.css but not wired to a settings UI toggle yet).
 Expand Settings/Profile pages beyond MVP once v1 ships and real usage surfaces what's actually needed.
 Revisit ImportRepertoiresPayload/ImportService.ts for any further drift now that the type de-duplication is done — keep an eye out for new fields added to one without the other.
Codebase hygiene
 Confirm .gitignore covers apps/api/src/generated/, compiled .js/.d.ts output, and packages/shared/dist/ — these have been accidentally wiped by git clean -fd more than once this project; ignoring them properly prevents future confusion, and regenerating (prisma generate, build script) is cheap.
 Document the electron hoisting workaround (manual Copy-Item into apps/desktop/node_modules/electron) somewhere so future npm install runs that break it are a known, fast fix rather than a repeat multi-hour debug session.
 Consider consolidating apps/api/src/index.ts's IPC-adjacent duplication patterns (already partly cleaned up) as the API surface grows.