# Miners & Saboteurs: balance

Seeded bot games, 100 games of 3 rounds per row, made with
`MS_SIM=<file> MS_GAMES=100 npx vitest run tests/mines/simulate.test.ts` (MS-BAL) on 2026-11-09. The bots are simple
heuristic players (`rules/bot.ts`). Saboteur bots lay dead ends and break tools; miner bots dig toward the destinations.
These numbers describe bot-against-bot play, not people. No rule was changed because of them.

**Columns**

- **Gold rounds:** share of rounds in which the gold was reached.
- **Wins by seat:** games won by each seat. Shared first places count for every seat in the tie, so a row can sum to more than 100.
- **Opener won:** games won by whoever opened round 1.
- **Opener found gold:** share of gold rounds in which the gold was reached by the player who opened that round.

| Mode | Players | Gold rounds | Wins by seat | Opener won | Opener found gold |
|---|---|---|---|---|---|
| classic | 3 | 37% | 39 / 39 / 43 | 33 | 35% |
| classic | 4 | 55% | 30 / 30 / 28 / 37 | 35 | 29% |
| classic | 5 | 26% | 28 / 25 / 30 / 20 / 22 | 24 | 22% |
| classic | 6 | 38% | 17 / 19 / 15 / 27 / 26 / 24 | 23 | 17% |
| classic | 7 | 20% | 25 / 20 / 25 / 22 / 19 / 28 / 19 | 18 | 17% |
| classic | 8 | 27% | 20 / 15 / 17 / 11 / 21 / 15 / 20 / 19 | 19 | 10% |
| classic | 9 | 29% | 21 / 16 / 20 / 12 / 14 / 20 / 18 / 14 / 12 | 15 | 14% |
| classic | 10 | 23% | 19 / 14 / 11 / 17 / 17 / 8 / 13 / 25 / 16 / 9 | 10 | 4% |
| expanded | 2 | 67% | 63 / 45 | 63 | 56% |
| expanded | 3 | 74% | 31 / 31 / 45 | 34 | 33% |
| expanded | 5 | 87% | 15 / 24 / 21 / 35 / 25 | 22 | 21% |
| expanded | 7 | 89% | 10 / 14 / 21 / 19 / 18 / 19 / 22 | 19 | 13% |
| expanded | 10 | 97% | 6 / 11 / 19 / 9 / 14 / 15 / 12 / 9 / 20 / 22 | 20 | 11% |
| duel | 2 | 31% | 62 / 73 | 67 | 54% |

## Findings

- **Classic.** The gold is reached in 20–55% of rounds. Rounds that run dry pay the saboteurs, so neither side dominates.
  The rate is highest at 4 players, the only count with 4 miners against a single possible saboteur.
- **Expanded.** The gold is reached in 67–97% of rounds, and more often with more players. The 15-role pool deals more
  diggers than saboteurs, and there are ladders. Crystal seekers and the opportunist still win regularly.
- **Prospector Duel.** The gold is reached in 31% of rounds. Seat wins were 62 and 73, with shared wins counted for
  both. At 100 games that gap is within noise. When the gold is reached, the round's opener reaches it about half the
  time (54%). The 3/1 split therefore rewards finding the gold without settling the game in one round.
- **Seats.** No seat wins clearly more often at any count. The higher win figures for early seats in large Classic
  games come from the opener rotating, and stay within sampling noise.

## Proposals (not adopted)

If people find Expanded too easy for the diggers, the first lever to try is the set-aside count (MS-X-SETUP1). The brief
fixes it at 10, so it is left unchanged. Any change needs owner approval and a rule ID.
