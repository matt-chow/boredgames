# Testing

## How to run

```sh
npm run check                     # svelte-check + Worker tsc: 0 errors, 0 warnings expected
npm test                          # Vitest unit, rules, projection, room-core and simulation tests
npm run test:e2e                  # Playwright against a dev server it starts on :5174
E2E_BASE_URL=https://boredgames.mchowcl.workers.dev npx playwright test   # same specs against the live site
```

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
| `tests/server/core.test.ts` | H1–H7 | Lobby, seats, host hand-over, versioning, stale and duplicate rejection, malformed input, undo limits, privacy of room views, restart/resume, retention, history, the Tally second game, bot seats (H7) |

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

**Latest result:** 7 files, **170 / 170 passed** (2026-11-02). `npm run check`: 0 errors, 0 warnings.

## Browser tests (Playwright)

| Spec | Test | Checks |
|---|---|---|
| `lobby.spec.ts` | host creates a room, others join by code and link, variants sync, game starts | Three browser contexts; variant toggles reach everyone |
| | outsiders cannot take a seat or read a started game | A fourth context with the code but no cookie gets no seat and no game data |
| `play.spec.ts` | a turn with planting, trading (offer, counter, accept), and resolving on desktop and phone | Drag and click planting, turning over, an offer, a counteroffer, a donation, accepting with a card choice, planting pending cards; one player on a phone viewport |
| | the server rejects out-of-turn, stale, duplicate and malformed actions | Raw WebSocket messages; the error codes and that state is unchanged |
| | dragging a bean onto a field it does not fit is explained and changes nothing | Illegal-move feedback in the UI |
| `resilience.spec.ts` | a refresh restores the same seat and hand; dropping offline shows a reconnect state | Reload and `setOffline` |
| | conflicting actions: accept and withdraw race, exactly one wins | Simultaneous raw sends; all views agree |
| | two tabs of the same player cannot double-spend | One commit, the other `stale` |
| `complete.spec.ts` | four full games to the results screen | Base 3 players; Three New Bean Types + Magpie, 4 players; Field Bean, 5 players; Bean Coin, 4 players. One player uses a phone viewport. A random bot plays every seat through the real UI, then checks the summary and "Play again" |
| `bots.spec.ts` | one player practises against bots | From the home page's "Practise with bots", adds a bot in the lobby, starts, and plays until the turn has come back twice, so the bots took their turns through the server alarm |
| | panning the table selects no text, and an offer started from a card asks who it is for | A leftover selection on the table does not block the next pan; tapping a hand card opens a slip with no recipient and Send disabled until one is picked |
| `perf.spec.ts` | action round-trip, idle CPU, frame pacing, transfer size | See Performance below |

**Latest results.**

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

- **Bean Coin claim dialog in the browser.** The e2e bot never reached the 5–6 coin field value needed to claim, so
  the claim / resist / hand-over dialog has not been exercised end to end. The rules behind it are covered by V4.2–V4.9
  unit tests and the `coin-3` / `coin-5` simulations.
- **Magpie steal UI** was exercised by the 4-player Magpie game only when the bot drew a Magpie; the run log does not
  guarantee it in every run. V5.x unit tests cover the rules.
- **Real devices.** Phone layouts were tested with a phone viewport in desktop Edge, not on a physical phone or Safari.
- **Sound** has no automated test, and no one has listened to it yet. The owner should check it once.
- **Dependency audit.** `npm audit` reports 2 low-severity advisories in `deepmerge`, a dev-only dependency of
  `@sveltejs/vite-plugin-svelte`. No fix is available upstream; nothing ships to users.
