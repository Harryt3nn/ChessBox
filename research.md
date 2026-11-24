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

## Pass 3 · 2026-11-24 · Move explanations with no paid API (theory presets, Stockfish rules, local models)
**Recommendation:**
1. **Theory presets: bundle `lichess-org/chess-openings`** (CC0, public domain). Measured 2026-11-24: 3,865 named lines in `a.tsv`–`e.tsv`, 395 KB as TSV (`eco`, `name`, `pgn`). The `dist/` build adds `uci` and `epd`. Name a position by its EPD. To name a game, Lichess suggests playing moves backwards until a named position turns up. That suits our graph, because a transposition lands on the same name. It runs offline with no new library. Bundling a data file is still a 🟠 (data and storage). Optional later: `eco.json` (MIT, "12,000+" entries, keyed by FEN, adds "interpolated" names for in-between positions). It's built on top of the Lichess TSV.
2. **Explanations: rule-based templates over Stockfish output, ported from how Lichess does it.** No LLM.
   - **Judgement:** turn each eval into winning chances `2/(1+exp(-0.00368208·cp))−1` (cp clamped to ±1000; mate n → `(21−min(10,|n|))·100` cp). The drop, on Lichess's 0–1 scale, sorts the move: ≥ .3 Blunder, ≥ .2 Mistake, ≥ .1 Inaccuracy. Text: "Inaccuracy. Nf3 was best."
   - **Only move / several good moves:** the winning-chance gap between MultiPV lines 1 and 2 (the board already runs MultiPV 2). The size of gap that counts as "only move" is ours to pick (TUNE).
   - **Threat ("what is the opponent threatening"):** search the same position with the other side to move. Lichess has this as "threat mode" in its analysis engine.
   - **Material:** our existing `src/chess/material.ts`.
   - **Hanging / attacked pieces:** `chess.js` 1.4.0 (already installed) has `attackers(square, color)` and `isAttacked(square, color)`.
   - **Don't** try to explain from Stockfish's own eval terms (king safety, mobility, …). Stockfish 16.1 removed the handcrafted evaluation, and `eval` now only prints the NNUE (neural-network evaluation) breakdown, which isn't readable as human concepts.
3. **Local LLMs: not now.** Without tools, even frontier models get 10–22% of chess commentary claims wrong, and small open models get 44–56% wrong (Qwen3-32B / 8B). Grounding an LLM in engine facts helps a lot: CCC lifted human-rated correctness from 0.36 to 0.60 with GPT-4o. So the only sane LLM role is *rephrasing facts our rules already computed*, as a later add-on. Candidates if Harry ever wants it:
   - Qwen3-4B (Apache-2.0)
   - Qwen2.5 1.5B / 7B (Apache-2.0; note the **3B is under "qwen-research", not Apache**)
   - Llama 3.2 3B (2.0 GB in Ollama, Llama 3.2 licence)
   - Runtimes: llama.cpp (MIT, CPU + Vulkan on Windows), WebLLM (Apache-2.0, in-browser WebGPU)

   Every LLM path means a new dependency plus a few-GB model download → 🟠.
4. **Free APIs:**
   - **Lichess cloud eval:** no key needed (`security: []`). It only returns *cached* positions (404 otherwise). Lichess asks for one request at a time and a `User-Agent`. It sends the FEN off the machine → 🟠 (trust).
   - **Lichess opening explorer:** now needs an OAuth token. It's free with a Lichess account, but it isn't keyless.

**Gaps:** no source gives LLM speed on Harry's hardware (Ryzen AI 7 350, Radeon 860M integrated GPU). WebLLM's only measured numbers are from an M3 Max. TBD: measure in a scratch harness if the LLM idea is ever picked. No source sets the "only move" MultiPV gap or the threat-reporting threshold; those are TUNE numbers resting on our reasoning. Nobody has measured how much users trust or learn from template explanations versus LLM text. The Hugging Face card's row count (3,704) is lower than the 3,865 I counted in the repo on 2026-11-24; the card is probably out of date.

| Grade | Claim | Source (opened) |
|---|---|---|
| KEEP | `chess-openings` is CC0. Data in `a.tsv`–`e.tsv` by ECO volume. Columns eco/name/pgn (+uci/epd in `dist/`). Classify by playing moves backwards to a named position | github.com/lichess-org/chess-openings (README) · huggingface.co/datasets/Lichess/chess-openings (cc0-1.0) |
| KEEP | Size: 3,865 lines, 395,077 bytes across the 5 TSVs (measured 2026-11-24, `wc` on raw files) | raw.githubusercontent.com/lichess-org/chess-openings/master/{a..e}.tsv |
| KEEP | Lichess judgement thresholds: winning-chance drop .3 Blunder / .2 Mistake / .1 Inaccuracy; text "<Judgement>. <move> was best." | github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala |
| KEEP | Winning chances = `2/(1+exp(−0.00368208·cp))−1`, cp clamped ±1000, mate → (21−min(10,\|n\|))·100 cp; fitted in lila PR 11148 | raw.githubusercontent.com/lichess-org/lila/master/ui/lib/src/ceval/winningChances.ts (the second source, a forum post with an older constant, is WEAK: snippet only) |
| KEEP | Lichess analysis has a "threat mode" search that flips which side's eval is shown | lila `ui/lib/src/ceval/ctrl.ts` (`threatMode`), `ui/lib/src/ceval/engines/stockfishWebEngine.ts` (pivot on `threatMode`) |
| KEEP | Stockfish 16.1 removed the handcrafted evaluation; `Use NNUE` option gone | stockfishchess.org/blog/2024/stockfish-16-1/ · Stockfish master `src/evaluate.cpp` (`Eval::trace` prints only `NNUE::trace`) |
| KEEP | chess.js 1.4.0 exposes `attackers()` and `isAttacked()` | apps/desktop/node_modules/chess.js/dist/types/chess.d.ts:130,133 (installed copy) |
| KEEP | LLM chess commentary without tools: sub-claim error GPT-5.4 22.0%, Claude Opus 4.7 20.8%, Gemini 3.1 Pro 10.8%, Qwen3-32B 44.1%, Qwen3-8B 55.5%; tools cut GPT-5.4 to 9.2% | arxiv.org/abs/2608.04240 (ACT-Eval, Aug 2026), Table 2 |
| KEEP | Grounding the LLM in engine concepts improves correctness (human eval 0.60 vs 0.36 for GPT-4o alone); LLMs alone hallucinate | arxiv.org/abs/2410.20811 (CCC, NAACL 2025) |
| KEEP | LLM explanations barely reflect the move decision under strict masking (faithfulness is weak) | arxiv.org/abs/2609.22245 (BlackboxNLP @ EMNLP 2026). Abstract only, no numbers |
| KEEP | Lichess cloud eval: no auth (`security: []`), cached positions only, 404 if not found, up to 5 PVs, cp from White's side. API rules: one request at a time, 429 → wait a minute, User-Agent required | raw.githubusercontent.com/lichess-org/api/master/doc/specs/lichess-api.yaml + tags/analysis/api-cloud-eval.yaml |
| KEEP | Opening explorer (`/masters`, `/lichess`) requires OAuth2 | lichess api spec tags/openingexplorer/masters.yaml, lichess.yaml (`security: - OAuth2`). The Lichess blog post saying the same is WEAK (403, snippet only) |
| KEEP | Model licences: Qwen3-4B apache-2.0; Qwen2.5-3B "qwen-research" (1.5B / 7B Apache); Llama 3.2 3B "llama3.2" | huggingface.co/api/models/Qwen/Qwen3-4B · huggingface.co/Qwen/Qwen2.5-3B-Instruct · ollama.com/library/qwen2.5 · huggingface.co/api/models/meta-llama/Llama-3.2-3B-Instruct |
| KEEP | Ollama download sizes: llama3.2 1B 1.3 GB, 3B 2.0 GB; qwen2.5 1.5B 986 MB, 3B 1.9 GB, 7B 4.7 GB | ollama.com/library/llama3.2 · ollama.com/library/qwen2.5 |
| KEEP | llama.cpp is MIT and builds on Windows for CPU and Vulkan (HIP for listed AMD GPUs) | github.com/ggml-org/llama.cpp · docs/build.md |
| KEEP | `eco.json`: MIT, "12,000+" variations keyed by FEN, interpolated "(i)" names, Lichess TSV as authoritative source. Original repo archived 2026-03-05, active fork JeffML/eco.json | github.com/hayatbiralem/eco.json (redirects to the archived repo) |
| WEAK | WebLLM decode: Llama-3.1-8B 41.1 tok/s (71.2% of native), Phi-3.5-mini 71.1 tok/s, on an M3 Max; not Harry's hardware | arxiv.org/abs/2412.15803, Table 1 |
| WEAK | ChessGPT (2.8B, Apache-2.0, 2023): ~60% move score at 1700–2000 Elo, far from engine level; old RedPajama-3B base | arxiv.org/abs/2306.09200 · huggingface.co/Waterhorse/chessgpt-chat-v1 |
| DO NOT USE | "Queen" 4B (Princeton, Oct 2026) plays 1782–2697 Elo and explains moves. **No licence declared** on its HF weights, so it isn't usable until one is published | arxiv.org/abs/2610.03695 · huggingface.co/api/models/princeton-nlp/queen_pawn-8 (no license tag) |
| DO NOT USE | "Stockfish 16 removed the classical eval" (refuted: the SF16 post says eval "remains consistent with 15.1"; removal is in 16.1) | chessprogramming.org snippet vs stockfishchess.org/blog/2023/stockfish-16/ and /2024/stockfish-16-1/ |
| DO NOT USE | "Opening explorer works anonymously" (refuted: the API spec requires OAuth2) | older third-party SDK pages vs lichess API spec |
