# Testing

## How to run

```sh
npm run check                     # svelte-check + Worker tsc: 0 errors, 0 warnings expected
npm test                          # Vitest unit, rules, projection, room-core and simulation tests
npm run test:e2e                  # Playwright against a dev server it starts on :5174
E2E_BASE_URL=https://boredgames.mchowcl.workers.dev npx playwright test   # same specs against the live site
npm run dev:bench                 # dev server with the deck bench (fixture cards) on the hub
npm run build                     # also fails if any of the bench reached the bundles (scripts/no-bench.mjs)
```

The test server runs in bench mode so `deck.spec.ts` can host the fixture game. Playwright reuses a server already on
:5174, so a plain `npm run dev` on that port makes the deck specs fail. Stop it first. `deck.spec.ts` can't run against
the live site, because the bench isn't there. Set `DECK_SHOTS=<folder>` to save its screenshots.

Playwright uses the installed Microsoft Edge (`msedge` channel) by default. To use Playwright's own Chromium, run
`npx playwright install chromium` and set `E2E_CHANNEL=` (empty). Annotations (measurements, bot action counts)
appear in the JSON and HTML reporters, for example `npx playwright test --reporter=json`.

## Unit tests (Vitest, Node)

Each rule in [RULES.md](RULES.md) and [VARIANTS.md](VARIANTS.md) has an ID, and the test that checks it starts with
that ID, so `npx vitest -t "R4.3"` runs one rule.

| File | IDs | What it covers |
|---|---|---|
| `tests/bohnanza/base-rules.test.ts` | R1.1–R9.2 | Setup per player count, deck, dealing, hand order, planting, field limits, trading, donations, counteroffers, pending cards, harvesting and protection, beanometer, draw/discard, reshuffles, end of game, ties, and illegal-action explanations |
| `tests/bohnanza/variants.test.ts` | V0, V1.x, V2.x, V4.x, V5.x | Every variant rule, refused combinations, base game unchanged with options off |
| `tests/bohnanza/projection.test.ts` | P1–P6 | What each seat may see: no opponent hand IDs, no deck contents, masked offer cards |
| `tests/bohnanza/simulate.test.ts` | S | 10 configurations × 5 seeds = 50 complete bot games |
| `tests/bohnanza/bot-player.test.ts` | B1, B2 | All-bot games across 7 configurations × 3 seeds, played by the server's bot; how the bot answers offers |
| `tests/hub/catalog.test.ts` | | The hub catalog matches the server's listed games |
| `tests/server/core.test.ts` | H1–H7 | Lobby, seats, host hand-over, versioning, stale and duplicate rejection, malformed input, undo limits, privacy of room views, restart/resume, retention, history, the Tally second game, bot seats (H7), quitting a game in progress: bot hand-over or ending the room (H8) |
| `tests/deckbuilder/engine.test.ts`, `mechanics.test.ts`, `simulate.test.ts` | DB-* | The deck-building engine on fixture cards. See [DECKBUILDER.md](DECKBUILDER.md) |
| `tests/clockwork/cards.test.ts` | CC-CARD-* | Each of the 71 cards' rules, one named test or more per card |
| `tests/clockwork/rules.test.ts` | CC-SETUP, SPARK, PW, END, REACT, RUST, MARKET, PRIV, UNDO, I | Setup at each player count, Influence, each Crown Project, endings, reactions, privacy, undo safety, interpretations |
| `tests/clockwork/simulate.test.ts` | CC-SIM, CHAOS, ROOM, AUDIT | Complete games at 2–6 players through the room, with bots and with random legal answers; every card played and every Work claimed (CC-SIM-ALL); leak checks; determinism |
| `tests/clockwork/art.test.ts` | CC-ART, CC-COVER | Art and its manifest for everything; coverage report complete |
| `tests/deaddrop/rules.test.ts` | DD-SET, BRF, CH, CHAT, COV, DEL, INT, INV, ORD, REP, RES, SIG, TIME, WIN, BAD | Every Dead Drop rule, legal and illegal action, and tiebreaker |
| `tests/deaddrop/projection.test.ts` | DD-VIEW | Public and private separation through real matches |
| `tests/deaddrop/room.test.ts` | DD-ROOM | Through the room: reconnection, duplicates, concurrent orders, redacted history, immutable results |
| `tests/deaddrop/simulate.test.ts` | DD-SIM | Adversarial strategies; `DD_SIM=<file>` writes the tables in [DEADDROP_BALANCE.md](DEADDROP_BALANCE.md) |
| `tests/deaddrop/text.test.ts` | | On-screen wording: claims, private outcomes, journal, mission note |

**Simulations.** The configurations are base 3/4/5, Magpie 4, Bean Coin 3 and 5, Three New Bean Types 3, Three New +
Magpie 5, Field Bean 4, and Field Bean + Magpie 5. Each runs with the seeds `alpha`…`echo`. After every action it
checks:

- card conservation (every card is in exactly one place);
- hand order (surviving cards keep their order, new cards go behind);
- versions increase by exactly one;
- at most two plants per turn;
- no hidden card ID appears in any other seat's projection (after every card-moving action and every fifth action).

Each run writes its seed and full action sequence to `test-results/sim/<config>-<seed>.json`. `replay(seed, n, config,
steps)` in `tests/bohnanza/bot.ts` reproduces any run exactly.

**Latest result:** 10 files, **305 / 305 passed** (2026-11-03), including the earlier 175. `npm run check`: 0 errors,
0 warnings.

**Mutation check of the new mechanics** (2026-11-03, one-off, script not in the repo): 16 deliberate faults were put into
`runtime.ts` one at a time. `mechanics.test.ts` caught 14. The other two were real test gaps, so DB-FX-30 and DB-FX-31
were added, and both faults are now caught.

## Browser tests (Playwright)

| Spec | Test | Checks |
|---|---|---|
| `lobby.spec.ts` | host creates a room, others join by code and link, variants sync, game starts | Three browser contexts; variant toggles reach everyone |
| | outsiders cannot take a seat or read a started game | A fourth context with the code but no cookie gets no seat and no game data |
| `play.spec.ts` | a turn with planting, trading (offer, counter, accept), and resolving on desktop and phone | Drag and click planting, turning over, an offer, a counteroffer, a donation, accepting with a card choice, planting pending cards; one player on a phone viewport |
| | the server rejects out-of-turn, stale, duplicate and malformed actions | Raw WebSocket messages; the error codes and that state is unchanged |
| | dragging a bean onto a field it does not fit is explained and changes nothing | Illegal-move feedback in the UI |
| | quitting mid-game hands the seat to a bot; the others are told and play on | Settings → Quit game, "Keep playing" cancels, quitting returns to the hub, the others see a toast and "(bot)", the old link no longer seats the quitter, and the bot takes its turn |
| | quitting a practice game against bots ends it and deletes the table | Practise with bots, start, quit: back at the hub and the link finds no table |
| `resilience.spec.ts` | a refresh restores the same seat and hand; dropping offline shows a reconnect state | Reload and `setOffline` |
| | conflicting actions: accept and withdraw race, exactly one wins | Simultaneous raw sends; all views agree |
| | two tabs of the same player cannot double-spend | One commit, the other `stale` |
| `complete.spec.ts` | four full games to the results screen | Base 3 players; Three New Bean Types + Magpie, 4 players; Field Bean, 5 players; Bean Coin, 4 players. One player uses a phone viewport. A random bot plays every seat through the real UI, then checks the summary and "Play again" |
| `bots.spec.ts` | one player practises against bots | From the home page's "Practise with bots", adds a bot in the lobby, starts, and plays until the turn has come back twice, so the bots took their turns through the server alarm |
| | panning the table selects no text, and an offer started from a card asks who it is for | A leftover selection on the table does not block the next pan; tapping a hand card opens a slip with no recipient and Send disabled until one is picked |
| `perf.spec.ts` | action round-trip, idle CPU, frame pacing, transfer size | See Performance below |
| `clockwork.spec.ts` | CC-E2E-1 to CC-E2E-6 | Hub listing and lobby sets/market/Crown Projects; art, Influence and inspection; full game with rematch; two people in sync with reload and frame privacy; 6-seat game; phone layout |
| `deck.spec.ts` | DB-UI-1 to DB-UI-7, on the bench | Lobby market and bans; random market honours bans; a full game against a bot with rematch; two players with reload mid-decision, raw wrong-turn and stale rejection, and frame privacy; inspection and pile listing; phone layout with long-press inspection; card animations |

**Latest results.**

- **Dead Drop on `feat/v3`** (2026-11-06): `npm run check` 0 errors; `npm test` 809 / 809 in 32 files. Local, one worker, spec groups run
  separately because the machine was short of memory: bots 2, guide 5, home 14, lobby 2, theme 1, play 5, resilience 5, complete 4, deaddrop 2, deck 7,
  clockwork 15, perf 1, all passed, though not in one single run. In clockwork, three KC3-TREASURY-4 tests and CC-E2E-6 first died with their worker (0xC0000142) when
  memory ran out, then passed alone. CC-E2E-7 failed twice with "the game did not finish": when the first game shows no final round (CC-FINAL-2), "Play again"
  returned to the lobby and the test never started the next game. It now does, and passes. That likely explains the production failure noted below. Staging got a
  home page, art and room-creation check by direct requests; no browser test has run against staging.

- **Edition 4 production release** (`7e5956d`, 2026-11-05): `npm run check` 0 errors; 690 unit tests in 27 files, one file at a time.
  Staging, one worker: guide 5, home 7 (7 skipped, dev-server fixture), lobby 2, theme 1, resilience 5, clockwork 14. Local: home 14,
  play 5, deck 7, bots 2, complete 4, perf 1. Production smoke: guide, home, lobby and theme 15 (7 skipped), plus six Kingdom &
  Commerce tests, CC-F2-UI, two resilience tests and two Bohnanza tests. CC-E2E-7 failed once on production with about 260 MB free, when
  its driver ran out of steps, then passed alone with 2.4 GB free. The cause wasn't proven. Saved older-edition rooms are checked by
  unit tests only.
- **Clockwork Commons release** (2026-11-03): `npm run check` 0 errors; `npm test` 459 / 459. Full browser suite on one
  worker, local: 27 passed, 1 skipped (a random-deal skip in `play.spec.ts`), 1 failed and 1 not run. The failure was
  `CC-E2E-4`: a staging run started at the same time cleared the shared `test-results/` folder and removed its trace
  files. Run alone, `CC-E2E-4` passed, and so did `perf.spec.ts`, which had been blocked by it. **Don't run two Playwright
  runs from one checkout at once.** Staging: all 6 of `clockwork.spec.ts`. Production after deploying: `CC-E2E-1` to `3` and
  all of `lobby`, `bots` and `complete` (11 passed).

- **Local, general deck mechanics on the bench** (2026-11-03): `deck.spec.ts` alone on one worker: all 7 passed in
  3.2 min. No browser test specifically drives the new mechanics, such as another player deciding or repeated option
  picks. They are covered by unit tests and random simulations. The other specs were not re-run for this change, which
  touched only the deck engine and fixture cards.
- **Local, deck table on the bench** (2026-11-03): `deck.spec.ts` alone on one worker: all 7 passed in 3.7 min. The
  **full suite has not completed with these changes.** The one attempt was stopped when the machine ran out of memory.
  Before that, all 16 functional tests outside `deck.spec.ts` passed. `perf.spec.ts` never ran. Two deck tests failed
  in that run and were then fixed in the spec: DB-UI-1 had too short a timeout under load, and DB-UI-7 checked for the
  wrong elements. See Known gaps.
- **Local, quit hands over to a bot or ends the game** (2026-11-02): all 17 tests passed in 5.3 min.
  **Live** after redeploying: all 17 passed in 3.7 min.
- **Local, Quit game ends the game** (2026-11-02): all 16 tests passed in 5.9 min. **Live** after redeploying: all 16
  passed in 3.3 min.
- **Local, with Quit game (bot takeover, since replaced)** (2026-11-02): all 16 tests passed in 3.4 min. **Live** after redeploying: 15 passed and
  1 skipped by design (the drag test's random deal); that test was then rerun three times against the live site and passed.
- **Local, after the animation and trading polish** (2026-11-02): all 15 tests passed in 4.2 min; after redeploying,
  all 15 passed against the live site in 3.5 min. The new pan test
  passes on the old camera code in Edge, because Edge never keeps a selection during a pan. The bug it guards against
  was reproduced only in Firefox (Playwright's build, run by hand rather than in the suite).
- **Local, with bots and the new home page** (2026-11-02): all 14 tests passed in 3.3 min. **Live** after redeploying:
  13 passed and 1 skipped by design (the drag test skips when the random deal makes its setup impossible); that test
  was then rerun twice against the live site and passed.
- **Local** (earlier run): all 13 tests passed in 3 min 26 s (2026-11-02): complete games 99 s, 104 s, 99 s and 71 s; reconnect 217 ms; ack p50 10 ms / p95 31 ms; idle CPU 0.11 %. The `perf` project runs after the `functional` one so its measurements are taken on a quiet machine; run it alone with `npx playwright test --project=perf --no-deps`.
- **Live deployment** (https://boredgames.mchowcl.workers.dev, Edge, from a home connection, 2026-11-02): all
  13 tests passed, including the four complete games (61 s, 74 s, 85 s and 91 s). The live run found one bug that
  local runs had not: fast variant toggles over real latency sent a stale change. It was fixed (DECISIONS.md D15),
  redeployed, and the lobby and complete-game specs were rerun green.

## Performance

Measured with `perf.spec.ts` against the live deployment, three Edge contexts on one Windows laptop, headless.

| Target | Measured | Status |
|---|---|---|
| Action acknowledgement < 250 ms | p50 55–66 ms, p95 57–76 ms (live). Local dev: p50 ≈ 10 ms | **Met** |
| Reconnect within 5 s | 241 ms after the network returns (live) | **Met** when the browser reports the drop. A silent drop (no `offline` event) takes up to 28 s to detect: 20 s ping + 8 s pong timeout |
| Minimal idle CPU | 0.07–0.11 % main-thread time while idle | **Met** |
| Initial JS < 200 KB compressed | 41.5 KB gz (index.js), CSS 4.2 KB gz. The table loads later as a 19.6 KB gz chunk. First visit transfers ≈ 113 KB in total, including the font | **Met** |
| 60 FPS | Idle ≈ 57 fps (headless rAF ceiling). During card motion 49–54 fps, with one 50–70 ms frame when a server update lands. One run had a single 536 ms outlier that did not repeat | **Not fully met** in this measurement. Not measured on a real GPU or a phone |
| ~12 concurrent users | Live test runs had 9–13 browser players connected at once across rooms without errors | **Not load-tested.** No dedicated 12-user test |

**Free-tier budget.** A full bot game took 260–400 committed actions (≈ 5 rows each), so about 50–75 full games per day
fit in the 100,000 rows-written daily limit. See DEPLOYMENT.md.

## Known gaps

- **Memory on the full suite.** On the 7.5 GB development laptop, three workers ran out of memory during the 24-test
  run. Tests open browser contexts that stay open until their worker exits. `deck.spec.ts` now closes its own after
  each test, and the older specs don't yet. Use `npx playwright test --workers=1` on a machine this size.
- **Bean Coin claim dialog in the browser.** The e2e bot never reached the 5–6 coin field value needed to claim, so
  the claim / resist / hand-over dialog has not been exercised end to end. The rules behind it are covered by V4.2–V4.9
  unit tests and the `coin-3` / `coin-5` simulations.
- **Magpie steal UI** was exercised by the 4-player Magpie game only when the bot drew a Magpie; the run log does not
  guarantee it in every run. V5.x unit tests cover the rules.
- **Real devices.** Phone layouts were tested with a phone viewport in desktop Edge, not on a physical phone or Safari.
- **Sound** has no automated test, and no one has listened to it yet. The owner should check it once.
- **Kingdom & Commerce in a browser:** full browser games use one or two people, plus bots up to six seats. Every card's rules
  run in unit tests and server-side games, but random markets mean any browser run reaches only some of the prompts for
  attacks, reactions and Establishments. The 3–6 player person-only games are server-side simulations. Balance is measured with
  heuristic bots at a small sample (CLOCKWORK.md).
- **Dependency audit.** `npm audit` reports 2 low-severity advisories in `deepmerge`, a dev-only dependency of
  `@sveltejs/vite-plugin-svelte`. No fix is available upstream; nothing ships to users.

## v2.0 results (2026-11-03)

Run on the final code:

- `npm run check`: 0 errors. `npx vitest run`: 478 / 478. `npm run build`: passes, including the no-bench check.
- Staging HTTP smoke test: home page and both covers return 200, and a room can be created for each game, with an HttpOnly
  cookie. In the first seconds after a deploy, one room reported the old game name. On a retry a minute later, it and a new
  room both reported the new name.

Run before the last small changes (test-only, plus documentation):

- `shelf.spec.ts` and `theme.spec.ts`: 13 / 13 on one worker.

The specs this section once listed as still to run have since passed on the v3 code, below.

## v3.0 latest results (`a7e91da`, 2026-11-04)

One worker, one spec at a time, on the same commit.

| Check | Local | Staging |
|---|---|---|
| `npm run check` | 0 errors | |
| `npx vitest run` | 554 / 554 in 21 files | |
| `npm run build` | passes, including the no-bench check | |
| `clockwork` | 9 / 9 | 9 / 9 |
| `complete` | 4 / 4 | 4 / 4 |
| `play` | 5 / 5 | 5 / 5 |
| `resilience` | 3 / 3 | 3 / 3 |
| `bots` | 2 / 2 | 2 / 2 |
| `guide` | 4 / 4 | 4 / 4 |
| `lobby` | 2 / 2 | 2 / 2 |
| `theme` | 1 / 1 | 1 / 1 |
| `home` | 14 / 14 | 7 passed, 7 skipped (dev-only fixture) |
| `deck` | 7 / 7 | can't run: the bench isn't deployed |

Not run: the `perf` project, a physical phone, Safari.

## v3.0 earlier results (`a86a47a`)

PROGRESS.md has which spec ran on which commit. Local, one worker, one spec at a time:

| Check | Result |
|---|---|
| `npm run check` | 0 errors |
| `npx vitest run` | 538 / 538 in 19 files |
| `npm run build` | passes, including the no-bench check |
| `clockwork` | 6 / 6 |
| `deck` | 7 / 7 |
| `play` | 5 / 5 |
| `complete` | 4 / 4 |
| `resilience` | 3 / 3 |
| `bots` | 2 / 2 |
| `lobby` | 2 / 2 |
| `guide` | 4 / 4 |
| `home` | 14 / 14 |
| `theme` | 1 / 1 |

Not run on v3: the `perf` project.

`complete` floods the dev server's output with `ResizeObserver loop completed` lines. The browser reports them from Bohnanza's
size bindings (`Camera`, `Hand`), which v3 didn't change. They don't fail a test. Send output to a file and filter out `[WebServer]`:
piping a run into `head` can cut off the result.

On a machine this size, a long run can be stopped by the system for low memory. Close other programs and run one spec at a time:

```sh
npx playwright test clockwork --workers=1 --project=functional
```

A killed run can leave its browser and dev server alive. Check that port 5174 is free before starting another.
