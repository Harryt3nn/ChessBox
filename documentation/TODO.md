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