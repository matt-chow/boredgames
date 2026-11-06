# Dead Drop: balance findings

Reproduce with `DD_SIM=<output file> npx vitest run tests/deaddrop/simulate.test.ts`. Strategies read only `project(state, seat)`. Each
pairing is 400 seeded matches, swapping seats every game. Numbers below are the actual output of that run on 2026-11-06.

**Thresholds have not been changed.** Proposals at the end are for the owner to decide on. These are scripted strategies and
say nothing about how people read each other, which is the point of the game, so treat this as a floor, not a verdict.

## Strategies

| Name | Plays |
|---|---|
| alwaysDeliver | Delivers every round, to a mission not yet reached first |
| deliverUnderCover | The same, spending Cover whenever held |
| repeatIntercept | Intercepts the same location every round |
| followSignal | Intercepts wherever the rival's last signal was |
| alwaysInvestigate | Investigates in rotation |
| decoySpam | Decoys at random |
| huntThenIntercept | Investigates until it finds a mission, then intercepts verified ones |
| balanced | 50% deliver, 25% intercept (known, else last signal), 15% investigate, 10% decoy |
| liar | Balanced orders, always false statements, challenges the first chance it gets |
| stall | Does nothing, so the rival must call time every phase |

## Row wins / draws / column wins (%)

| | alwaysDeliver | deliverUnderCover | repeatIntercept | followSignal | alwaysInvestigate | decoySpam | huntThenIntercept | balanced | liar | stall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alwaysDeliver | 0/100/0 | 0/100/0 | 48/0/52 | 64/0/36 | 100/0/0 | 100/0/0 | 62/0/39 | 79/18/4 | 82/14/4 | 100/0/0 |
| deliverUnderCover | 0/100/0 | 0/100/0 | 49/0/52 | 63/0/37 | 100/0/0 | 100/0/0 | 62/0/38 | 85/12/3 | 85/13/2 | 100/0/0 |
| repeatIntercept | 53/0/47 | 48/0/52 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 42/0/58 | 41/0/59 | 0/100/0 |
| followSignal | 36/0/64 | 38/0/62 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 26/1/74 | 29/0/71 | 0/100/0 |
| alwaysInvestigate | 0/0/100 | 0/0/100 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/1/99 | 1/0/99 | 0/100/0 |
| decoySpam | 0/0/100 | 0/0/100 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/2/98 | 1/0/99 | 0/100/0 |
| huntThenIntercept | 40/0/60 | 40/0/61 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 50/1/49 | 51/0/49 | 0/100/0 |
| balanced | 3/13/85 | 5/16/79 | 57/1/42 | 72/1/27 | 99/1/0 | 99/1/0 | 51/1/48 | 38/16/46 | 43/15/42 | 99/1/0 |
| liar | 6/12/82 | 4/17/79 | 60/0/40 | 69/0/31 | 99/0/1 | 99/0/1 | 48/0/52 | 40/13/48 | 38/17/46 | 99/1/0 |
| stall | 0/0/100 | 0/0/100 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/100/0 | 0/1/99 | 0/1/100 | - |

Rows and columns are separate samples, so mirrored cells differ by sampling noise, for example 48/52 and 53/47 for
alwaysDeliver against repeatIntercept.

| Strategy | Wins against the other nine | Average rounds |
|---|---|---|
| deliverUnderCover | 71% | 3.10 |
| alwaysDeliver | 70% | 3.09 |
| balanced | 59% | 4.84 |
| liar | 58% | 4.87 |
| repeatIntercept | 21% | 5.70 |
| huntThenIntercept | 20% | 5.85 |
| followSignal | 14% | 5.88 |
| alwaysInvestigate, decoySpam, stall | 0% | 5.77 |

Balanced mirror, 400 games: 38% / 16% draws / 46%, average 4.77 rounds; ended by mission 299, simultaneous draw 58,
counterintelligence 21, the ladder 22 (deliveries 9, interceptions 7, level 6). No game went to Challenge Points there; against liar, 10 of 400 did.

## Findings

1. **Delivering is the strongest thing a script can do.** It needs only 3 rounds, and in that time a blind interceptor has to be
   right twice. Delivery wins most against everything except interception at about even odds.
2. **Two pure deliverers always draw in round 3** (DD-SIM3, 100%). Nothing stops it, and that match lasts about a third of the
   expected length. Real players who suspect a race have every reason to intercept instead, but the outcome is available.
3. **Repeat-intercept is not a free win** (DD-SIM6), at about even odds against always-deliver: it wins only if it guessed one
   of the rival's two locations, and the rival has to return there. Against anything mixed it does worse than average (42%).
4. **Following signals is worse than picking one spot** (14% vs 21%): a deliverer who has reached one mission moves on.
5. **Investigating alone can't win.** Its value only exists in what it enables, as huntThenIntercept shows: even odds with balanced,
   40% against always-deliver. Its cost is rounds in a match that can end in round 3.
6. **Decoys and Cover add very little in scripted play**: deliverUnderCover gains about one point on alwaysDeliver. Cover
   needs a rival who intercepts where a decoy is, which is a human read that these scripts don't make.
7. **Lying had no measurable effect on orders** (balanced vs liar 43/15/42), as expected: scripts don't believe anything. Challenge Points rarely
   matter, deciding 66 of about 36,000 unlike-pairing matches.
8. **Stalling never wins** and can't hold a match past round 7. A stalled match against a player who never delivers is a draw.
9. **Length.** Mixed play averages 4.8 rounds. At the phase limits a slow round is 3.5 minutes, so 8 to 12 minutes fits for
   about two minutes a round. Only direct testing with people can confirm that.

## Proposals, not applied

For the owner to accept or reject, ideally after human playtests, because the bluffing that scripts can't simulate is what these numbers leave out:

- **A. Four deliveries to win**, keeping both locations. Gives interception and investigation time to pay off and removes the three-round mirror draw. Simplest change.
- **B. Note repeated signals in the report:** no threshold change, but the report could say when a player's signal appears at the same location twice running. More information for interceptors; more rules text.
- **C. Keep everything and watch.** If people do intercept each other's patterns, the numbers above may simply not apply.

## Limits

No model of belief, adaptation or reading a rival's chat. Scripted statements have no effect on scripted orders. The sample is 400 per pairing,
so differences of a few points are noise.
