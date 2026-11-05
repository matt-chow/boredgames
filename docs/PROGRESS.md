# Progress

Last updated 2026-11-03.

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
