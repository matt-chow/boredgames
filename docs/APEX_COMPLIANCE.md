# Apex '66 v1.3: rules compliance matrix

An audit of the engine against [APEX.md](APEX.md), done for v1.3 (2026-11-27). Each row names the rules, where the code
lives, the tests that pin it (each test carries the rule ID in its name) and what changed. "Fixed" means the code was
wrong and now has a regression test. The existing tests were not trusted: each row was rechecked against the code.

| Area | Rules | Code | Tests | v1.3 status |
|---|---|---|---|---|
| Setup and grid | AX-GRID-1/2, AX-MODE-1 | `engine.ts` setup, `race.ts` newRace | engine.test, race.test | Correct |
| Decks and cards | AX-CAR-1..4, AX-DECK-1 | `cards.ts`, `race.ts` draw/flip | race.test | Correct. Strain renamed Heat (card id `X` kept, so saves and replays load) |
| Gears and shifting | AX-GEAR-1/2 | `race.ts` shiftCost | race.test | Correct. The two-gear Heat goes to the discard (now tested) |
| Plan | AX-PLAN-1..6 | `race.ts` planError/setPlan | race.test, engine.test | **Changed:** a plan is gear and cards only (AX-PLAN-4). Boost and discard moved into the turn |
| Heat and the engine | AX-CAR-2, AX-COOL-1/2 | `race.ts` payHeat, turnAct cool | race.test, engine.test AX-COOL-2 | **Changed:** cooling is a turn step; it takes the most by itself unless "Cool by hand" is on |
| Stress | AX-STR-1 | `race.ts` flip | race.test | Correct |
| Turn order | AX-RES-1, AX-TURN-2 | `race.ts` reveal (order fixed at round start) | race.test, engine.test AX-TURN-2 | **Changed:** one public turn at a time instead of one batch |
| Turn resolution | AX-RES-2, AX-TURN-3..7 | `race.ts` startTurn/advance/turnAct | race.test AX-TURN-3..7 | **New:** move, react, slipstream, corner check, discard, refill, each confirmed by the server |
| Authority and idempotency | AX-TURN-1, AX-NET-1 | `engine.ts` apply | engine.test AX-TURN-1 | **Fixed:** repeated Lock In or stale decisions change nothing ("Lock In advances movement" bug) |
| Movement and occupancy | AX-MOV-1..3, AX-LAP-1 | `race.ts` go/freeLane | race.test | Correct |
| Racing-line priority | AX-RES-1, AX-FIN-2 | `race.ts` raceOrder, endRound | race.test | Correct; also breaks finish ties |
| Boost | AX-BST-1, AX-MOD-2 | `race.ts` turnAct boost, turnOptions | race.test AX-BST-1, modules.test | **Changed:** a post-move choice. **Fixed:** the tunnel check used the car's current space, not where the move started |
| Catch-up | AX-ADR-1 | `race.ts` reveal, turnAct catchup | race.test | **Changed:** optional, so it can't push a car into a corner against its will |
| Slipstream | AX-DRF-1/2, AX-FIN-6 | `race.ts` draftOffer | race.test AX-DRF-2, AX-FIN-6 | **Changed:** always an offer with its corner Heat shown. **Fixed:** no slipstream across the line |
| Corners | AX-CRN-1..3, AX-TURN-6 | `race.ts` cornerBill, toDiscard | race.test | **Changed:** one check after boost and slipstream, at the final speed |
| Spins | AX-SPN-1/2 | `race.ts` spinOut | race.test AX-SPN-1/2 | **Fixed:** a spin puts Stress in the hand (it was Heat), back to the last free space before the corner, gear 1 next round |
| Discard and replenish | AX-TURN-7, AX-END-1 | `race.ts` endTurn | race.test AX-TURN-7 | **Changed:** at Finish turn, per car. Heat can't be thrown away without the upgrade |
| Finishing | AX-FIN-1/2/4/5/6, AX-END-2 | `race.ts` endTurn/endRound | race.test AX-FIN-5/6, AX-END-2 | **Fixed:** the race runs until every car finishes (the two-round cut-off is gone); finished cars hold their space only for their finishing round |
| Modules | AX-MOD-1..4 | `race.ts`, `content/paddock.ts` | modules.test | Correct, every combination is played in the simulations |
| Upgrades | APEX_CONTENT.md §2 | `content/upgrades.ts` Fit | content.test, modules.test | Correct; the spin-relief text now says Stress |
| Computer drivers | AX-AI-1..3, AX-SIM-1 | `ai.ts` aiPlan/aiTurn | ai.test, engine.test AX-SIM-1 | **Changed:** the AI takes turn decisions from its own view; seeded races never stall |
| Sponsors, press, events | AX-CH-5/6 | `season.ts` | season.test | Correct |
| Championship | AX-CH-1..7 | `season.ts`, `engine.ts` | season.test, room.test | Correct. The "nothing to get ready for" Continue after race one was fixed in 77bf5c9 (a stale Continue is silent) |
| Preview | AX-PLAN-7 | `ui/plan.ts` | plan.test | **Fixed:** no cards, no ghost; Stress shows a range from deck contents only; risk classes; cars still to move block |
| Privacy | AX-PRV-1/2 | `engine.ts` project | projection and engine tests | Correct; the turn view adds no hidden information |
| Saves and replays | AX-STATE-2, AX-REP-1..3 | `engine.ts` migrate, `replay.ts`, `race-v1.ts` | engine.test, replay.test | **New:** state version 2; v1 races migrate, v1 replays play through the frozen v1 resolver |

## Interpretations recorded in APEX.md

- AX-DRF-1: a car that did not move this turn cannot slipstream.
- AX-SPN-2: Stress, not Heat, goes into the hand on a spin (v1.3 correction).
- AX-END-2: a safety stop at 200 rounds ranks any car still running by race order. No seeded simulation reaches it.

## Known gaps

- The Heat cards are not animated between engine, discard, deck and hand. The gauge, the counters and the turn
  history show every movement.
- Billboards mark changed corners and sector modifiers. Weather that changes every limit is shown in Conditions, not
  by a billboard per corner.
