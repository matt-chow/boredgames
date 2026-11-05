# Crown Project construction experiment

**Status: results for owner decision. No staged rule has been adopted.** Production and new rooms still use the live rule: five Projects, each claimed whole, and the game ends at four of them. The six trial rules can only be selected in tests and on the staging build (CC-STAGE-12).

Every figure below comes from [CROWN_CONSTRUCTION_RESULTS.md](CROWN_CONSTRUCTION_RESULTS.md), which has the full tables, including Treasury buying, Influence, strategy and market family. Raw data: `data/clockwork-commons/crown-construction-experiment.json`.

## Recommendation

**Adopt F2 if one rule is chosen now: five Projects of 1, 2, 2, 3 and 3 stages at every player count, with 1 extra Coin on each multi-stage Project, ending when all five are complete.** This differs from the scaled rule the brief treated as the primary candidate, so the reasoning is set out in full.

- **Scaled stages shorten the largest games, which is the opposite of the aim.** At 5 and 6 players S1 and S2 end sooner than the live rule (median 9.2 to 10.4 rounds, live 10.7 to 11.8). The confidence intervals for S1 and F1 don't overlap at those counts (5 players: 12.1 ±1.0 against 15.5 ±1.4; 6 players: 11.2 ±1.1 against 14.3 ±1.5). Other Renown also falls by about a third against F (6 players: 10.7 against 15.5), and Gold purchases fall too.
- **At 2 players the fixed rule shares better and runs shorter, and at 3 players it is slightly ahead on both.** Zero-Project players at 2 players: F 12 to 13%, S 20 to 21%, live 33%. Means at 2 players: F 28.8 to 29.4, S 31.7 to 32.2, live 26.0. The length difference overlaps, so treat it as a likely gain rather than a proven one.
- **Scaling's real gain is at 5 and 6 players.** There S spreads Renown a little better: top player's share 42 to 45% against 46 to 49%, contributors per Project 2.2 against 1.95 at 6 players, and win margin 4 to 5 against 5 to 6. If more contribution chances matter more to you than game length, S2 is the alternative. Its 13 opportunities at 6 players are real, but they come with shorter games.
- **Why F2 over F1:** they can't be told apart statistically. F2 has the longer median at 2 and 4 players (26.8 against 24.5, 15.8 against 14.5) and a lower Projects-bot win rate at 2 and 4 players (67.5% against 75%, 33% against 41.7%). It also raises the very cheap stages noted under "Known weak stages". If you would rather keep every Project's total price unchanged, F1 costs little.
- **Why not C0 or C1:** they do lengthen games the most, and C1 brings the Projects bot closest to an even chance, but nobody shares anything. A third to more than half of players score no Project Renown (32 to 56%, against 11 to 27% under F2). This misses the point of the rework.

**F2 does not fully solve early endings.** Its median at 5 and 6 players (13.0 and 11.9 rounds) is only about one round above live. If the current length is the real complaint, it needs one of the adjustments below, and those are untested.

## Why more stages can mean shorter games

This is the most surprising result. At 6 players S has more stages than F (13 against 11) and ends sooner. At 2 players S has fewer (7 against 11) and ends later. The likely cause is the largest indivisible chunk of cost: splitting a Project lowers the price of each stage, so a stage fits into an ordinary hand sooner, and with all stages small nothing holds up the finish. This explanation is inferred from the results and not separately tested. It is consistent with S at 4 players being identical to F, as noted below.

## Results by player count

"Stages available" is the number of separate investments on the table. "Zero-Project players" had no Project Renown at the end. "Top share" is the leading player's share of all Project Renown. "Project share" is Project Renown as a share of all Renown. "Complete of 5" averages to below 5 because the other endings can come first.

### 2 players

| Rules | Mean rounds | Median | >40 | Ended by Projects | Complete of 5 | Stages available | Contributors per Project | Zero-Project players | Top share | Project share of score | Win margin | Projects bot (even 50.0%) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Live | 26.0 ±2.5 | 22.3 | 21 | 57.5% | 3.03 | 5.0 | 1.00 | 33.3% | 85.0% | 24.3% | 16.4 | 65.0% (43.3%–81.9%) |
| C0 | 31.5 ±2.3 | 30.8 | 31 | 45.0% | 3.50 | 5.0 | 1.00 | 32.5% | 85.3% | 24.3% | 21.4 | 60.0% (38.7%–78.1%) |
| C1 | 34.6 ±2.2 | 34.5 | 37 | 35.8% | 3.33 | 5.0 | 1.00 | 34.2% | 85.7% | 21.5% | 20.0 | 57.5% (36.4%–76.2%) |
| F1 | 28.8 ±2.6 | 24.5 | 29 | 61.7% | 4.11 | 11.0 | 1.44 | 11.7% | 77.4% | 33.3% | 17.5 | 75.0% (53.1%–88.8%) |
| F2 | 29.4 ±2.4 | 26.8 | 24 | 62.5% | 4.13 | 11.0 | 1.44 | 13.3% | 77.5% | 32.8% | 16.0 | 67.5% (45.7%–83.7%) |
| S1 | 32.2 ±2.3 | 32.8 | 32 | 46.7% | 3.71 | 7.0 | 1.16 | 21.3% | 82.6% | 26.5% | 16.5 | 67.5% (45.7%–83.7%) |
| S2 | 31.7 ±2.4 | 31.5 | 31 | 46.7% | 3.68 | 7.0 | 1.19 | 20.0% | 81.0% | 26.6% | 15.8 | 60.0% (38.7%–78.1%) |

### 3 players

| Rules | Mean rounds | Median | >40 | Ended by Projects | Complete of 5 | Stages available | Contributors per Project | Zero-Project players | Top share | Project share of score | Win margin | Projects bot (even 33.3%) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Live | 19.8 ±2.1 | 15.7 | 7 | 71.7% | 3.38 | 5.0 | 1.00 | 39.7% | 74.4% | 23.3% | 9.8 | 50.0% (33.6%–66.4%) |
| C0 | 25.3 ±2.1 | 24.2 | 14 | 59.2% | 3.98 | 5.0 | 1.00 | 38.1% | 73.9% | 22.4% | 10.9 | 28.1% (15.6%–45.4%) |
| C1 | 28.4 ±2.1 | 28.7 | 18 | 45.8% | 3.71 | 5.0 | 1.00 | 38.3% | 73.9% | 18.7% | 11.8 | 37.5% (22.9%–54.7%) |
| F1 | 22.5 ±2.2 | 19.0 | 11 | 76.7% | 4.45 | 11.0 | 1.65 | 12.2% | 61.3% | 30.6% | 9.4 | 37.5% (22.9%–54.7%) |
| F2 | 22.9 ±2.2 | 18.8 | 13 | 74.2% | 4.43 | 11.0 | 1.67 | 11.1% | 62.2% | 30.5% | 10.2 | 37.5% (22.9%–54.7%) |
| S1 | 24.2 ±2.2 | 22.7 | 15 | 70.0% | 4.30 | 9.0 | 1.49 | 14.4% | 65.0% | 27.5% | 10.8 | 39.1% (24.2%–56.3%) |
| S2 | 24.2 ±2.2 | 20.7 | 13 | 66.7% | 4.28 | 9.0 | 1.50 | 12.8% | 63.4% | 27.4% | 11.4 | 42.2% (26.8%–59.2%) |

### 4 players

| Rules | Mean rounds | Median | >40 | Ended by Projects | Complete of 5 | Stages available | Contributors per Project | Zero-Project players | Top share | Project share of score | Win margin | Projects bot (even 25.0%) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Live | 15.4 ±1.5 | 12.8 | 1 | 76.7% | 3.55 | 5.0 | 1.00 | 49.2% | 70.3% | 24.6% | 7.4 | 47.7% (33.8%–62.1%) |
| C0 | 19.7 ±1.5 | 18.5 | 1 | 55.8% | 4.12 | 5.0 | 1.00 | 47.9% | 69.7% | 22.8% | 8.7 | 45.5% (31.7%–59.9%) |
| C1 | 21.0 ±1.5 | 20.8 | 3 | 53.3% | 4.00 | 5.0 | 1.00 | 47.3% | 68.0% | 21.1% | 9.3 | 27.3% (16.3%–41.8%) |
| F1 | 17.2 ±1.6 | 14.5 | 3 | 81.7% | 4.65 | 11.0 | 1.81 | 15.0% | 53.3% | 32.2% | 7.7 | 41.7% (28.3%–56.3%) |
| F2 | 17.1 ±1.6 | 15.8 | 2 | 81.7% | 4.67 | 11.0 | 1.80 | 15.2% | 53.1% | 32.4% | 7.3 | 33.0% (20.9%–47.7%) |
| S1 | 17.2 ±1.6 | 14.5 | 3 | 81.7% | 4.65 | 11.0 | 1.81 | 15.0% | 53.3% | 32.2% | 7.7 | 41.7% (28.3%–56.3%) |
| S2 | 17.1 ±1.6 | 15.8 | 2 | 81.7% | 4.67 | 11.0 | 1.80 | 15.2% | 53.1% | 32.4% | 7.3 | 33.0% (20.9%–47.7%) |

### 5 players

| Rules | Mean rounds | Median | >40 | Ended by Projects | Complete of 5 | Stages available | Contributors per Project | Zero-Project players | Top share | Project share of score | Win margin | Projects bot (even 20.0%) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Live | 14.0 ±1.1 | 11.8 | 0 | 82.5% | 3.76 | 5.0 | 1.00 | 52.8% | 63.3% | 22.1% | 5.9 | 23.2% (14.1%–35.8%) |
| C0 | 18.1 ±1.3 | 16.2 | 0 | 65.8% | 4.40 | 5.0 | 1.00 | 49.5% | 62.1% | 21.2% | 7.8 | 23.2% (14.1%–35.8%) |
| C1 | 20.2 ±1.4 | 19.5 | 3 | 57.5% | 4.32 | 5.0 | 1.00 | 48.5% | 61.4% | 19.0% | 8.1 | 19.6% (11.3%–31.8%) |
| F1 | 15.5 ±1.4 | 13.1 | 0 | 89.2% | 4.79 | 11.0 | 1.89 | 18.0% | 49.0% | 29.6% | 6.2 | 23.2% (14.1%–35.8%) |
| F2 | 15.2 ±1.3 | 13.0 | 0 | 90.0% | 4.81 | 11.0 | 1.87 | 18.7% | 48.5% | 30.9% | 5.9 | 23.2% (14.1%–35.8%) |
| S1 | 12.1 ±1.0 | 10.2 | 0 | 91.7% | 4.83 | 12.0 | 2.03 | 17.2% | 45.0% | 37.2% | 4.6 | 29.5% (19.2%–42.4%) |
| S2 | 12.9 ±1.3 | 10.4 | 1 | 92.5% | 4.82 | 12.0 | 2.01 | 16.7% | 44.6% | 35.9% | 4.8 | 28.6% (18.4%–41.5%) |

### 6 players

| Rules | Mean rounds | Median | >40 | Ended by Projects | Complete of 5 | Stages available | Contributors per Project | Zero-Project players | Top share | Project share of score | Win margin | Projects bot (even 16.7%) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Live | 13.2 ±1.3 | 10.7 | 1 | 87.5% | 3.80 | 5.0 | 1.00 | 58.6% | 60.5% | 22.1% | 5.5 | 40.4% (29.6%–52.3%) |
| C0 | 16.8 ±1.3 | 14.8 | 1 | 75.0% | 4.54 | 5.0 | 1.00 | 55.6% | 61.2% | 20.5% | 7.4 | 25.0% (16.2%–36.4%) |
| C1 | 19.5 ±1.5 | 17.9 | 0 | 65.0% | 4.41 | 5.0 | 1.00 | 55.0% | 59.7% | 17.3% | 7.5 | 16.9% (9.8%–27.5%) |
| F1 | 14.3 ±1.5 | 11.3 | 3 | 90.0% | 4.79 | 11.0 | 1.97 | 26.1% | 46.9% | 27.9% | 5.2 | 32.4% (22.4%–44.2%) |
| F2 | 14.8 ±1.6 | 11.9 | 3 | 86.7% | 4.76 | 11.0 | 1.95 | 26.5% | 46.1% | 27.1% | 5.1 | 33.8% (23.7%–45.7%) |
| S1 | 11.2 ±1.1 | 9.2 | 1 | 93.3% | 4.87 | 13.0 | 2.22 | 20.8% | 42.9% | 36.4% | 4.0 | 32.4% (22.4%–44.2%) |
| S2 | 11.4 ±1.1 | 9.7 | 0 | 94.2% | 4.89 | 13.0 | 2.23 | 20.3% | 41.9% | 35.6% | 3.8 | 35.0% (24.8%–46.9%) |

## Other findings

- **Reliability.** All 4,200 trial and reference games finished. None got stuck or hit the step cap.
- **Identical rows at 4 players.** S1 matches F1 and S2 matches F2 exactly at 4 players, because both deal 1, 2, 2, 3, 3 and the seeds are shared. This is expected, and it confirms that the runs are deterministic.
- **S1 against S2, F1 against F2.** The extra Coin changes little in any measure. It is too small to fix or to harm anything.
- **Strategy spread, all counts together.** The Influence-focused ("Spark") bot is first or second under every rule, including live (Live 45%, F2 50%, S2 44%). The Establishment-focused ("Devices") bot follows at 35 to 43%. The Projects ("Works") bot falls from 41% under live to 34.5% under F2 and 26% under C1. The Economy and Thinning bots stay near the bottom, though Economy improves from 8% to 14% under F2. Staging doesn't cause the Influence strength, and it doesn't cure it.
- **Seat order at 4 to 6 players.** The first seat wins more often than the last under every rule, often by about 2 to 1 (6 players: F2 26.3% against 11.7%, S2 20.4% against 9.9%, live 20.0% against 15.4%). The game ends on the finishing turn, so later seats get fewer turns. The live rule has the same pattern, but a Project-driven ending leans on it more.
- **Influence.** Players finish with about 1 to 2 unused under every rule. Influence spent on Projects rises under staging (2 players: 3.6 under live, 5.5 under F), and conversion to Coins falls.
- **Long 2-player games.** Every trial rule has more games over 40 rounds than live (21 of 120). F2 is closest at 24. C1 is worst at 37.

## Adjustments to consider

None of these is implemented or tested.

1. **Finish the round when the game ends**, so every seat has the same number of turns. This targets the seat-order gap directly, and would be a rule change for live games too.
2. **If F2 is still too short at 5 and 6 players,** add a second Coin to multi-stage Projects at those counts only.
3. **If S2 is preferred for its contribution chances,** raise the price more at 5 and 6 players, since +1 Coin barely moved its length.
4. **Fix the known weak stages** whichever rule wins (below).
5. **Look separately at Influence strength.** It is present in the live rule and is unrelated to this rework.
6. **Before adopting, rerun F1, F2 and S2 at 100 games per family (6,000 games, about 30 minutes)** with the chosen adjustments, and play some human games on staging.

### Known weak stages

The even division in CC-STAGE-3 produces a few stages that are very cheap or oddly priced. With 3 stages under S1 or F1, River Quay costs 1 Coin per stage, and its first stage pays 1 Renown with no Influence. Bell Tower's first stage costs 2 Coins and no Influence for 1 Renown. Exchange Hall's third stage costs 2 Influence and no Coins for 3 Renown. They are legal and tested, and may need hand-set values in a final rule.

## Method

- **Rules compared.** Live (reference), C0, C1, F1, F2, S1, S2, as defined in docs/CLOCKWORK.md (CC-STAGE-1 to -12) and `src/games/clockwork/rules/editions.ts`. Scaled stage totals are 7, 9, 11, 12 and 13 for 2 to 6 players. Fixed is 11 at every count. All six trials end when all five are complete, or on the usual Grand Duchy or empty-pile endings. Live ends at four.
- **Sample.** 30 games for each of 4 market families, 5 player counts and 7 rules: 120 games per row and 4,200 in all. One process, one game at a time, 19.3 minutes on the development laptop.
- **Pairing and seeds.** Seeds are `crown-construction-<family>-<players>-<i>`, with i from 0 to 29. Rules on one seed share the market, Projects, deal, first player and bot seats, so differences come from the rule. Stage counts are dealt on their own stream, `<seed>:stages`.
- **Market families.** standard (core + crown), artisans (core + foundry), rivals (core + night), chancery (core + town).
- **Players.** Twelve bot profiles. The plain Money profile is left out, because it never funds a Project. Seats rotate with the game index. The same bots run under every rule, adapted to fund stages.
- **Uncertainty.** Length is shown with a 95% interval from the standard error. Win rates use Wilson intervals. The intervals treat rows as independent, which is conservative for paired comparisons.
- **Reproducing.** `npm run experiment:crown-construction`, with `EXPERIMENT_GAMES` to change the sample.

## Limitations

- **These are bots, not people.** They don't deny an opponent the finish, don't time the ending against the score, and don't negotiate over who funds what. Real players may slow or speed up shared Projects. Treat the findings as direction, and playtest before adopting.
- **Bots start buying Renown at a fixed turn**, which isn't tuned to the all-five ending. Absolute lengths may shift with people. Comparisons between rules should hold up better.
- **Strategy match-ups are few at low counts.** Seat rotation gives a limited set of pairings, so the 2-player strategy columns come from 12 match-ups. The Projects-bot intervals are wide (about ±20 points at 2 players). A lower Projects-bot win rate alone doesn't show balance.
- **Ending labels.** A game counts as "Grand Duchy" first if that pile is empty, even if another ending happened on the same turn.
- **A market family has fixed sets but a random market per seed.** Rare cards appear in few games, so nothing here measures an individual card.
