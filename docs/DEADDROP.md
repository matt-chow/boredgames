# Dead Drop

An original two-player Cold War game of secret orders and bluffing. The rules are the owner's approved brief; this file
gives them IDs and records how ambiguous cases were read. IDs name tests in `tests/deaddrop`. Rules live in
`src/games/deaddrop/rules`, screens in `src/games/deaddrop/ui`.

Exactly two people, 8 to 12 minutes, no bots, no paid services.

## Set-up

- **DD-SET1–4.** Four locations: Embassy, Rail Station, Grand Hotel, Harbour. Each player independently gets two distinct
  mission locations from the seed. Overlap is allowed. Missions stay private until the match ends.

## A round

**Briefing (DD-BRF\*, DD-CHAT\*).** Chat is unrestricted, kept in the match record and never evaluated. Each player must file at
least one formal statement and acknowledge all of the rival's. When both have, orders begin. Chat continues in every
phase until the match ends.

**Secret Orders (DD-ORD\*).** Both choose an action, a location, and optional Cover with a false broadcast. An order locks on
submission. Nothing about an order reaches the rival until both have locked, except that one has locked.

**Resolution (DD-RES\*).** Simultaneous and deterministic; submission order cannot matter.

| Order | Target | Effect |
|---|---|---|
| Deliver (DD-DEL\*) | Own mission only | +1 delivery, unless intercepted at the actual location |
| Investigate (DD-INV\*) | Any | Privately and truthfully learn whether it is a rival mission |
| Intercept (DD-INT\*) | Any | Catch a delivery at the actual location: blocks it, +1 interception |
| Decoy | Any | A signal and nothing else. If intercepted there, its owner gains Cover (no interception scored) |

**Cover (DD-COV\*).** Maximum 1. Gained when a rival intercepts your decoy; not gained if already held. May be spent on a
delivery to broadcast a different location. Interception always checks the actual location.

**Intelligence Report (DD-REP1, DD-SIG1).** Public: each signal's location (never its action), successful interceptions with
their location, and Cover held, gained and spent. Private: your own results, your delivery count, your journal.

**Next round.** Victory or the round limit is checked, otherwise the next briefing.

## Statements and challenges

Statements (DD-BRF\*): “I delivered at [L] last round”, “I investigated [L] last round”, “I deployed a decoy at [L] last round”,
“I did not deliver last round”. They always refer to a completed round and may be false.

Challenges (DD-CH\*): one token per player per match. Correct: challenger +1 Challenge Point. Incorrect: claimant +1.
A statement can be challenged once, and never by its author. Points are only a tiebreaker and never end the match.

## Victory (DD-WIN\*)

- **Mission:** 3 successful deliveries with at least one at each mission location.
- **Counterintelligence:** 2 successful interceptions.
- **Both in one resolution:** draw.
- **After round 7:** deliveries, then interceptions, then Challenge Points, otherwise a draw.

## Interpretations

The brief leaves these open. Each is the reading implemented and tested; the owner may want to review them.

| ID | Case | Reading |
|---|---|---|
| I-1 (DD-BRF) | Round 1 has no earlier round to speak of, yet a statement is required | A fifth, unchallengeable statement, “Nothing to report”. The four approved kinds are refused in round 1 |
| I-2 (DD-VIEW) | The brief asks for public scores, but public delivery progress would reveal every success | Deliveries stay private until the match ends. Public scoreboard: interceptions, Cover, tokens, opened Challenge Points |
| I-3 (DD-COV) | “Ownership public, spending must not disclose the true location” | Spending is public. It necessarily shows a delivery was attempted, and if no interception follows, that it succeeded. Only the location stays hidden |
| I-4 (DD-CH5) | Consistent delayed reveal | By kind of claim alone: “delivered” and “did not deliver” stay sealed until the end, whichever way they would come out; “investigated” and “decoy” open at once. The delay therefore says nothing about the answer |
| I-5 (DD-CH) | What “I delivered at L” means after a block | It is true if the Deliver order was issued at L, intercepted or not |
| I-6 (DD-BRF) | Which statements can be challenged, and when | During a briefing, any unchallenged verifiable statement by the rival from any round. Reports and orders don't take challenges |
| I-7 (DD-BRF) | Statement cap | 3 per briefing, to keep the acknowledgement step finite. A new one needs a new acknowledgement |
| I-8 (DD-INT) | What an interceptor learns from a decoy | “You caught no delivery there.” The public Cover gain says what happened; the private line does not add to it |
| I-9 (DD-TIME) | Inactivity | A player who has done their part may call time after 2 min (briefing), 1 min (orders), 30 s (report), or 15 s on a seat time was called on before that hasn't acted since. A called briefing moves on, called orders count as no order, a called report continues. An absent seat can't stall past round 7 |
| I-10 (DD-RES) | Report for a match-ending round | Skipped: the results page shows everything |
| I-11 (DD-WIN) | Three deliveries at one location only | Not a mission win. Deliveries continue until the other location has one, so a mission can be won on a fourth or later delivery |

## Reliability and privacy

- Rules are pure TypeScript behind `GameModule`. The server decides everything; the client sends intents and draws confirmed views.
- `project(state, seat)` builds each view. `DD-VIEW*` walk real matches and search each view for what must not be in it;
  `tests/e2e/deaddrop.spec.ts` does the same across every WebSocket frame the browser actually received.
- `meta.simultaneous` lets concurrent actions in the room bypass the single-version check, because neither can invalidate the other's
  round. Every action that matters names its round (and acknowledgements a count, calls a phase), so stale ones are refused,
  and action ids are deduplicated. History rows hide orders through `historyAction` (DD-ROOM\*).
- Quitting ends the match for both, because there are no bots to take a seat (the hub's rule for a table of only absent players).
- A finished match can't change: every action except rematch is refused once over (DD-ROOM\*).

See [DEADDROP_BALANCE.md](DEADDROP_BALANCE.md) for simulation findings.
