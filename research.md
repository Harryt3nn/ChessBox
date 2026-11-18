# ChessBox: research ledger

One `Pass n` per research question (CLAUDE.md §9). Grep by pass number; never read the whole file. Delete a pass once its feature is on `main` and its decision is in `decisions.md`.

```
## Pass <n> · <YYYY-MM-DD> · <question>
**Recommendation:** …
**Gaps:** what no source answers (rests on our reasoning).
| Grade | Claim | Source (opened) |
|---|---|---|
| KEEP | … | … |
| WEAK | … | … |
| DO NOT USE | … (refuted by …) | … |
```

---

## Pass 1 · 2026-11-19 · WeakPoints: how to schedule repertoire drills, and what to drill
**Recommendation:**
1. **Scheduler: FSRS via `ts-fsrs` 5.4.2** (MIT, no runtime dependencies, Node ≥ 20, released 2026-09-01), default parameters, desired retention 90%. FSRS is now Anki's built-in alternative to SM-2 and beats SM-2 at predicting recall on 99.6% of ~10k benchmarked collections. Not `ts-fsrs` 6.0 (3 weeks old, needs Node ≥ 24, adds a dependency). Fallback if Harry wants zero dependencies: SM-2 by hand (~20 lines, formulas below).
2. **Unit of review = one prepared reply on your move, drilled as a short sequence:** start 2–3 moves earlier, the opponent's moves auto-play, you play each of your moves; graded automatically from the board (wrong move → Again, right first time → Good). This mirrors Chessable (single-move answers, replayed as a sequence, auto-graded by the board) and gives the "short sequence, not one move" Harry asked for.
3. **What becomes a card (from the novelty-finder data):** (a) **deviations**: your prepared reply where you went wrong, due immediately; (b) **rarely reached lines**: low `nodeHits` positions on your move, introduced a few per day; (c) **strong lines**: often-hit, never-missed replies, left to FSRS's long intervals so they come back occasionally. A deviation the engine rates as about as good as the prepared move (Harry: "a deviation doesn't necessarily mean it's a bad move") is lower priority. That threshold is a 🟠.
4. **Aimchess:** its "Opening Improver" and "Retry Mistakes" re-show positions from your own games where you played an incorrect move. Same idea as (a). Its site doesn't mention spaced repetition or repertoires, so ChessBox's repertoire-based scheduling goes beyond it.

**Gaps:** No source measures FSRS on chess-move cards specifically, or for sequence drills: that FSRS's advantage carries over rests on our reasoning (recall of a prepared move is still recall). Chessable's actual scheduling algorithm isn't documented (only a single unofficial claim of "improved SM-2"). Aimchess's selection logic isn't documented. The "how much worse than the prepared move still counts as a mistake" threshold has no source.

| Grade | Claim | Source (opened) |
|---|---|---|
| KEEP | FSRS beats Anki's SM-2 on 99.6% of users by log loss (FSRS-6 with recency weighting); SM-2 needed a "not-so-rigorous" interval→probability converter, so no perfectly fair comparison exists | expertium.github.io/Benchmark.html |
| KEEP | Benchmark data: 9,999 Anki collections, ~350M reviews evaluated (727M total); metrics log loss, RMSE(bins), AUC; newest is FSRS-7 (log loss 0.3206 vs FSRS-6 0.3842) | github.com/open-spaced-repetition/srs-benchmark |
| KEEP | FSRS is Anki's built-in alternative to legacy SM-2 (Anki 23.10+, AnkiMobile, AnkiWeb, AnkiDroid 2.17+); desired retention default 90%, keep under 97%; don't hand-edit parameters; optimise ~monthly | docs.ankiweb.net/deck-options.html |
| KEEP | `ts-fsrs` is the open-spaced-repetition org's TypeScript FSRS, MIT; v6 needs Node ≥ 24 and depends on `@open-spaced-repetition/srs-kit`; optimiser lives in a separate binding package | github.com/open-spaced-repetition/ts-fsrs; `npm view ts-fsrs` |
| KEEP | `ts-fsrs` 5.4.2: MIT, engines Node ≥ 20, no dependencies, published 2026-09-01; 6.0.0 published 2026-10-28 | `npm view ts-fsrs` (registry metadata) |
| KEEP | SM-2: grades 0–5, EF starts 2.5, I(1)=1, I(2)=6, I(n)=I(n−1)·EF, EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02)), min 1.3; q < 3 restarts intervals without changing EF | super-memory.com/english/ol/sm2.htm |
| KEEP | Aimchess builds drills from your own games: "Opening Improver" reviews positions where you played an incorrect move; "Retry Mistakes" asks for a better move in past-mistake positions; no spaced repetition or repertoire features described | aimchess.com |
| WEAK | Chessable MoveTrainer: review unit is a single move, then the set is replayed "as a sequence", auto-graded on a board; critique: very fine-grained, can't reinforce concepts (one personal-notes source, no official docs) | notes.andymatuschak.org (Chessable MoveTrainer) |
| WEAK | Chessable uses an improved SM-2; missed moves are asked again right away (single unofficial Reddit comment, seen only in a search snippet) | search snippet only |
| WEAK | Default-parameter FSRS-5 beat SM-2 on 91.9% of collections (Reddit post, snippet only) | search snippet only |
| DO NOT USE | "SM-2 log loss 0.354 vs FSRS-5 0.291": contradicts the benchmark's own figures and attribution | diane.app guide (snippet) |
