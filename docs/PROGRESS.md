# Progress

Last updated 2026-11-06.

## Milestones

| Milestone | Status | Notes |
|---|---|---|
| M1 Tooling, architecture, rules extraction | Done | Svelte 5 + Vite + Workers. Rules extracted from the Rio Grande and AMIGO PDFs into RULES.md / VARIANTS.md with IDs |
| M2 Rules engine and tests | Done | Pure TypeScript engine, seeded RNG, 140 Vitest tests including 50 recorded simulations |
| M3 Multiplayer, persistence, reconnect | Done | One SQLite Durable Object per room, hibernating WebSockets, cookie sessions, versioned actions, dedupe, undo, retention alarms |
| M4 2.5D table and trading UI | Done | Isometric camera with zoom/pan/reset, spatial and compact layouts, fanned hand, fields, piles, trading dock with offers, counteroffers and donations |
| M5 Animation, sound, tutorial, settings | Done | FLIP card motion driven by confirmed state, synthesised sounds with mute, How to Play, reduced-motion and low-performance settings |
| M6 Variants | Done | Three New Bean Types, Field Bean, Bean Coin, Magpie. The Duel is listed as 2-player only and always refused |
| M7 Simulations, browser tests, security, performance | Done, with gaps | See TESTING.md: Bean Coin dialog not exercised in a browser; 60 FPS not fully met in headless measurement; no 12-user load test |
| M8 Deployment, smoke test, docs, handoff | Done | Live at https://boredgames.mchowcl.workers.dev, Workers Free plan; full browser suite passed against it |
| M9 Clockwork Commons | Live | Second game, with a separate staging Worker. See the section below |
| M10 Dead Drop | On staging | Third game: two people, secret orders, statements and challenges. See DEADDROP.md and DEADDROP_BALANCE.md |

## Dead Drop (2026-11-06, on `feat/v3`, staging only)

- **Rules:** `src/games/deaddrop/rules`, pure and seeded. Every approved rule has a DD-* test; eleven interpretations are recorded in DEADDROP.md for the owner to review.
- **Hub:** listed, with a `noBots` catalog flag; two optional engine hooks (`meta.simultaneous` for actions that can't invalidate each other, `meta.readyCheck` for lobby ready states), the clock passed to `setup` and `apply`, `historyAction` to redact history rows.
- **Screens:** lobby overview and ready; board, private missions, briefing with chat, statements and challenges; secret orders with Cover; report; intelligence journal; results with rematch. Desktop and phone.
- **Art:** all original SVG from `scripts/art/deaddrop.mjs` (ASSETS.md).
- **Still to run:** browser tests against staging, and a match played by real people. Every local browser test has passed. See TESTING.md.
- **Open for the owner:** the interpretations in DEADDROP.md, and DEADDROP_BALANCE.md's finding that delivering outperforms everything in scripted play. No threshold was changed.

## Since the handoff

- **Home page** redesigned as a game picker: a shelf of crates, one per game, plus an empty crate for the next game.
  Each game offers Open a table and Practise with bots. Join by code and recent tables stay.
- **Computer players**: a `bot(view)` hook in the game interface, bot seats in the room (create time and the lobby's
  "Add a bot"), and server-paced moves through the Durable Object alarm. Bohnanza's bot is deliberately weak.
- Deployed and verified live on 2026-11-02 (TESTING.md).
- **Polish (2026-11-02):** smoother planting: cards keep their hand-fan rotation and the table's tilt while they fly,
  small layout shifts slide instead of hopping, and a dragged card waits where it was dropped instead of jumping back
  to the hand. Tapping a card to start an offer no longer picks the next player silently; the slip asks who it is
  for when there is more than one choice. Panning the table clears and blocks text selection, which in Firefox stopped
  the table from moving until you clicked away.
- **Quit game (2026-11-02):** Settings → "Quit game…" during a game, with a confirm dialog. With other people at the
  table a bot takes over the seat and they play on; when only bots would be left (practice games) the game ends and
  the room is deleted immediately, so nothing keeps running (D19).
- **Deck-building engine (2026-11-03, not listed in the hub):** a generic, data-driven engine in `src/engine/deckbuilder` with tests
  in `tests/deckbuilder` (DECKBUILDER.md, DECKBUILDER_LICENSING.md, D20).
- **Deck table on a dev-only bench (2026-11-03, not committed, not deployed, not in production builds):** a complete
  table UI in `src/games/deck/ui`: supply grid, fanned hand, step-by-step prompts, card inspection and pile listing,
  card motion and sounds, phone layout, end-of-game summary and rematch. The lobby has random and manual markets, bans
  and market codes, cleaned on the server through a new optional `sanitizeConfig`. The engine gained a play-all-treasures
  action. It runs only under `npm run dev:bench`, with fixture cards (D21). Three open-source repos were reviewed and
  none supplies authorised card content (DECKBUILDER_LICENSING.md). A leak of the bench into production bundles was
  found and fixed, and `npm run build` now checks for it. Unit tests and `deck.spec.ts` pass; the full browser suite
  hasn't completed with these changes (TESTING.md).
- **General deck mechanics (2026-11-03, not committed, not deployed):** the owner asked to reassess Dominion Second
  Edition using the Bohnanza method. The comparison and its limits are in DECKBUILDER_LICENSING.md and D22. No Dominion
  card set, setup or ruleset was written. The audit's general gaps were built and tested on fixture cards: condition
  loops, hand-size numbers, whole-hand references, choosing from the trash, one player deciding for another, cards
  moving between players, picking several options, one-shot triggers and points by kind of card. The rulebook PDF could
  not be fetched (HTTP 403) and has not been read.

## Known limitations

- Placeholder card art only. Licensed Bohnanza art can be dropped in via `ASSET_OVERRIDES` (ASSETS.md); Kingdom &
  Commerce has its own image workflow (CLOCKWORK.md).
- No accounts: identity is a per-room cookie. Clearing cookies or switching browsers loses the seat.
- A silently dead connection (no `offline` event) can take up to 28 s to notice.
- Not tested on physical phones or Safari.
- A player who disconnects while holding a decision blocks the table until they return. Nothing chooses for them (CLOCKWORK.md).
- See TESTING.md → Known gaps.

## Owner actions

1. **Review `PRODUCT.md`.** It was written from the brief, not from an interview with you. Correct anything that does
   not match your intent.
2. Play one real game with friends on phones, and listen to the sounds once.
3. Optional: obtain licensed Bohnanza artwork and add it (ASSETS.md).

## Next ideas (not started)

- Spectator mode.
- A dedicated multi-room load test.
- Stronger bots (trade proposals, planning for future draws).

## Clockwork Commons

Live in the hub since 2026-11-03: https://boredgames.mchowcl.workers.dev, with staging at
https://boredgames-staging.mchowcl.workers.dev. Rules, sets, interpretations, balance and art are in [CLOCKWORK.md](CLOCKWORK.md).

**Built and tested**

- 64 market cards, 7 basics and 13 Public Works, all 50 supplied designs included. Each of the 84 has a named test
  (`data/clockwork-commons/coverage-report.json`).
- 2–6 players, Workshop/Market/Cleanup, Spark, attacks, reactions, Devices, rematches, random or chosen markets, Play All
  Currency, set and Public Works selection, and bots.
- Complete games at every player count, with bots and with random legal answers, through the server's room code.
- In a browser: a full person-and-bot game with rematch, two people in sync with a reload and a check of what each browser
  received, a 6-seat game, and the phone layout.

**Not done or not proven**

- Art is original SVG placeholders. The manifest and image workflow are ready, but no final images exist.
- Balance is a screen at 20 games per comparison with heuristic bots. No card numbers were changed because of it.
- Random markets mean browser runs reach only some attack, reaction and Device prompts. Their rules are covered by unit tests
  and server-side games.
- 3–6 people in separate browsers, real phones and Safari haven't been tested.
- A disconnected player holding a decision still blocks the table, as in Bohnanza.

## v2.0: bookshelf and Kingdom & Commerce

Live in production since 2026-11-04 on the owner's instruction, as version `dc6aade2`, deployed from `feat/hub-v2`
(not yet merged to `main`). The previous version is `788bce29`. **Validation is incomplete:** the browser specs below hadn't
finished when it shipped. Test state is in TESTING.md.

| Checkpoint | State |
|---|---|
| 1 Baseline | Done: mechanics baseline and saved rooms recorded before any change |
| 2 Bookshelf, 3 Game details | Done, browser-tested (`shelf.spec.ts`) |
| 4 Theme architecture | Done, browser-tested (`theme.spec.ts`) |
| 5 Kingdom rebrand | Done, unit-tested. `clockwork.spec.ts` hasn't completed since |
| 6 Art and polish | Scenes done. Motion and sound have no per-game variation |
| 7 Validation | **Partial:** the browser run was stopped for low memory |
| 8 Staging | **Deployed, HTTP smoke test only:** no browser run against it yet |
| Production | **Deployed, HTTP smoke test only:** no browser run against it yet |

Not done:

- Kingdom & Commerce has the shared sound and motion, not its own.
- The inspect dialog's title stays in capitals, unlike the rest of the theme.
- Art is original flat SVG, not painted illustration.
- `docs/CLOCKWORK_BALANCE.md` still uses the old card names.
- Bohnanza hasn't been compared by screenshot. Its rules are untouched, its browser tests changed only in how they reach the shelf, and shared components fall back to its old values.

## v3.0: homepage, Kingdom & Commerce expansion, guides

Work on branch `feat/v3`, reversible point: tag `pre-v3` at `6482560`. Production stays on v2.0 until the owner approves.

**Checkpoint 1, audit.** `npm run check` 0 errors; `npx vitest run` 478/478 in 16 files. Baseline taken before any change.

**Checkpoint 2, homepage.** The bookshelf is gone (`GameBox`, `shelf.spec.ts`). Feature cards and game-owned fans replace
it; **Open Table** opens the existing `GamePanel`. `tests/e2e/home.spec.ts`: 14/14 on one worker in Edge against the dev
server, covering six viewports with 24 extra games.

**Checkpoint 3, Kingdom visuals.** Medieval palette, table materials, 110 SVG art entries and a Kingdom cover, scoped to
`[data-game-theme='clockwork']`. `theme.spec.ts` (KC-THEME-1) passes: nothing reaches the hub or Bohnanza. The art is SVG, not
generated paintings (ASSETS.md).

**Checkpoints 4 and 5, economy and content.** The v3 edition (`rulesVersion` 3): 7 basics in a permanent supply, private Renown,
trashing, Royal Debt, attacks and reactions, and the new Crown Decrees set of 24 cards. The catalogue is 88 market cards in 5 sets,
60 of them in the default Core + Crown Decrees game, and 15 Crown Projects. CLOCKWORK.md has the rules, tests are `KC3-*`.

**Checkpoint 6, guides.** One shared `Guide.svelte`, one data document per game, opened from ? and the pre-game panel, with
three levels, search, contents and contextual links. `guide.spec.ts` 4/4. GUIDE-* unit tests check the numbers and worked examples
against the engine, not every sentence.

**Checkpoint 7, gameplay testing.** On the code as of `a86a47a`: `npm run check` 0 errors, `npx vitest run` 538/538 in 19 files
(run before the phone CSS fix, which touched no rules), `npm run build` passes. Browser, local, one worker, one spec at a time:
`deck` 7/7, `play` 5/5, `complete` 4/4, `resilience` 3/3, `theme` 1/1, `home` 14/14 and `guide` 4/4 after the step-line change.
`bots` 2/2 and `lobby` 2/2 just before it. `clockwork` 6/6, with CC-E2E-1, 4 and 5 last run before it and CC-E2E-2, 3 and 6 after.
Balance: CLOCKWORK_BALANCE.md at 40 games per comparison, no card numbers changed.

Found and fixed by these runs: bots trashed their own Renown (`KC3-BOT-1`, v3 only). The step line's ? was inside the live region,
so screen readers announced it, in both games.

**Checkpoint 8, compatibility.** `compat.test.ts` replays golden v2 games against a baseline. Also tested on real deployments, see
checkpoint 10.

**Checkpoint 9, visual QA.** Screenshots read by eye at 1366×768, 1366×860, 1024×600 and 390×844: table, Market phase, Play All,
inspection, Deck Overview, lobby, end summary, and Bohnanza for comparison. One fault fixed: on a phone, the dashboard collapsed
into a column beside the action buttons and covered the market. CC-E2E-6 now checks its height. Not checked: a physical phone, Safari.

**Checkpoint 10, staging: partly verified.** `npm run deploy:staging` succeeded, version `4c4a3a73-ac34-496b-a720-51d86f723dd3` on
https://boredgames-staging.mchowcl.workers.dev, with its own Worker and Durable Object namespace. Production stayed on
`dc6aade2-31b8-4ee7-a3f1-8aa79f579a60`.

- **Rules update, on real rooms:** a Kingdom & Commerce room and a Bohnanza room were started on the build staging had before. After
  the deploy both reopened from the same cookies. The Kingdom room reported edition 2 and the same 16 piles, and was played to the end
  with no page errors. This was one person and one bot. It used a temporary spec that isn't in the repo.
- **Specs against staging:** `theme` 1/1, `lobby` 2/2, `home` 7 passed. The other 7 need the dev-only `?games` fixture, and now skip
  on a deployed build; that skip hasn't been re-run.
- **Not run on staging:** `guide`, `play`, `resilience`, `bots`, `clockwork`, `complete`. The system stopped the run for low memory. So no
  complete v3 game and no two-person sync have been verified on staging yet.

**Checkpoint 11, undo, Crown Project experiment, Treasury and symbols.** Commits `46aab94`, `8b2617d`, `a7e91da`.

- **Undo:** deck games now take back up to 8 steps one at a time (KC3-UNDO). Revealing hidden information still ends the chain.
- **Crown Project end rule:** compared on 1,200 bot games, rule unchanged. CROWN_END_EXPERIMENT.md, D35.
- **Treasury and Kingdom Market:** Coins and Renown columns, with Copper, Silver and Gold as display names (KC3-TREASURY, D36).
- **Symbols:** Actions, Buys, Coins, Influence and Renown, always beside the word and outside live regions (KC3-SYM).

**Checkpoint 10 update, staging.** This replaces the "Not run on staging" line above. `a7e91da` is deployed as version
`1d662575-818f-4f73-abaf-ce6a4ac8064a`. Against that build, one worker, one spec at a time: `guide` 4/4, `play` 5/5, `resilience` 3/3,
`bots` 2/2, `clockwork` 9/9, `complete` 4/4, `theme` 1/1, `lobby` 2/2, `home` 7 passed and 7 skipped (dev-only fixture). So a complete v3 game,
a 6-seat game and two-person sync with a reconnect have now run on staging. `deck` can't run there, because the bench isn't in deployed builds.
Not repeated on this deploy: the test that reopens rooms started on an earlier build. Not run at all: `perf`, a physical phone, Safari.

**Crown Project rework, checkpoints 1 and 2.** Baseline at `0cfeabf`: check 0 errors, vitest 554/554, build passes. Copper is now Bronze (display only, D36a). Lost connections follow DISC-* (D37): 60 s grace, a bot stands in, the person reclaims, an empty room closes. Tests: `tests/server/disconnect.test.ts` and DISC-E2E-1, 2 in `resilience`.

**Crown rework checkpoint 3, trial staged engine.** Six trial editions (C0, C1, F1, F2, S1, S2) run on the live engine under rule IDs CC-STAGE-*; state version 3 only adds optional fields. Off in production, on through `EXPERIMENTS` in staging. `tests/clockwork/staged.test.ts` and DISC-14 cover it. Live rules unchanged.

## Crown rework CP5: Project UI (staged trial)

Five visible tiles remain. A staged tile shows pips and n/N, the next stage's name, its cost, and the reward only on the final stage. An eye button opens a details dialog: every stage, cost, Renown, funder and next contribution. The lobby's trial-rules selector only appears on servers that allow editions. Zero-cost tokens are hidden and 1 Coin is singular. CC-STAGE-UI (phone) passes.

## CP4: Crown Project experiment finished (2026-11-04)

4,200 paired games across Live, C0, C1, F1, F2, S1 and S2, at 2 to 6 players and on 4 market families, in 19.3 minutes. All finished, none stuck. Report and recommendation: docs/CROWN_CONSTRUCTION_EXPERIMENT.md. **Nothing adopted; owner decision pending.** Recommended: F2. Scaled S shortens 5 and 6 player games compared with live.

## CP6 and CP7: art bible and five pilots

docs/ART_BIBLE.md and five clear-line SVGs in public/cards/, built by scripts/art/. ART-1 to ART-5 pass. Remaining art not generated; owner approval pending.

### CP8: catalog (2026-11-04)

The Kingdom & Commerce setup panel now has visual and compact catalog modes, a remembered "Show card artwork" toggle, search by name, filters for type, cost and set, a Treasury list separate from the market, and an inspection dialog that never changes the selection. Art loads only near the viewport. Selections, bans, market codes and the supply are unchanged. Tests: CATALOG-1 to 3, CATALOG-E2E-1 and 2. The whole clockwork spec ran with 3 failures, all KC3-TREASURY-4 counting Treasury art as inline `svg` while Gold and Grand Duchy are now pilot images. The locator now accepts both and that test passes 3/3 on all three screen sizes. The full spec is rerun in CP10.

### CP9: rulebooks (2026-11-04)

Both guides now open from the room as well as the pre-game panel, the ? menu and the table's contextual links, plus a new "How Crown Projects work" link under the Projects. The Kingdom & Commerce guide follows the room: `guideFor(edition)` returns the live guide, or for a trial room the same guide with that room's rule in the Quick reference, Crown Projects, Ending, Scoring and Common mistakes sections and a note naming the trial. A new "Staged Crown Projects" section in Detailed rules is marked as trial, not live. It covers contributions, per-stage Renown, shared construction, the six trials, player-count scaling, cost division, the all-five ending and how card wording reads. Also added: deck optimization and a disconnect example. Worked examples A to H are replayed on the engine or the room core by GUIDE-K2, K4, K11 to K16. Bohnanza: guide checked against docs/RULES.md and docs/VARIANTS.md, no rule changes; the variant beans' beanometers were missing and are added, and GUIDE-B3 parses every count and beanometer against the engine. Test: GUIDE-E5 in the browser.

### CP10: edition 4, bots and art verified locally

Edition 4 (F2 and finishing the round), planning bots and all 110 illustrations are committed. 690 unit tests pass across 27 files, run one file at a time, and svelte-check and the worker type check are clean. Each e2e spec passes when run alone. Two tests in `clockwork.spec.ts` needed changes first: the phone catalog test now taps the label, and the final-round check moved to its own game (CC-E2E-7), which saw the label within at most four games. Benchmark results with the fixed bots are in BOT_BENCHMARK.md. Nothing is pushed, and production is untouched.

### CP11: final terminology cleanup for release

Bot reports now print Influence Engine, Crown Project Development and Establishment Engine; the internal profile names stay because they seed the benchmark. Active docs use current names, and dated experiments are labelled historical. Removed code with no consumers: `beanOf`, `BActionType`, `isLive`, `typesOf`, `PROTOCOL_VERSION`, and unused locals and parameters in five places. No files were deleted, because the audit found no unreferenced modules, assets, docs or tracked outputs. The owner confirmed CC-FINAL-5 and CC-FINAL-6 (D43), and the CC-FINAL-5 test now covers unused Buys and Actions. Added HUMAN_PLAYTEST.md.

### CP12: edition 4 in production (2026-11-05)

Version `9ed87712` from `7e5956d` (tag `release-e4`) is live, and `main` and `feat/v3` were fast-forwarded. Human playtesting is next: see HUMAN_PLAYTEST.md. No saved room that predates the release has been opened on production; compatibility rests on unit tests.

### Miners & Saboteurs (2026-11-09)

**What was added**

- A new original game for 2 to 10 players, in `src/games/mines`, with three modes:
  - Classic Mining (3–10)
  - Expanded Mining (2–10, 118 cards, 15 roles)
  - Prospector Duel (2)
- Lobby settings: rounds, gold target, turn timer and away policy. They lock at start.
- Two board views, tabletop and deep mine. Both have zoom, pan, legal-square highlights and a turned-card preview.
- Chat and reactions, a card encyclopedia, a three-level guide, and a ten-step local tutorial that sends nothing.
- A results screen with rematch.
- Bots, which also act as stand-ins for absent players.
- 118 original SVGs from `scripts/art/mines.mjs`.
- Rules and the rules audit are in MINES.md, and balance is in MINES_BALANCE.md.

**Shared code**

- The room refuses `config` after the game starts.
- `bot(view, standIn)` (D50).

**Verified**

- `npm run check` reports 0 errors. `npm test` passes: 36 files, 876 tests, 1 skipped.
- The full `npx playwright test` suite passes: 64 tests, 1 skipped, including both `mines.spec.ts` tests.
- Released 2026-11-09:
  - Staging version `0a1d0215-634c-4302-8958-7bc1715c91ff`: `mines.spec.ts` and `home.spec.ts` pass against it (9 passed; 7 run only on the local test server).
  - Production version `bf14b187-01ea-4550-9021-c8bc90c792c8`: both `mines.spec.ts` tests pass against it.
  - To roll back, return to the previous production version, `9ed87712-d994-4497-820d-a409d0c2a1a5`.
