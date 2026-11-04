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

On `feat/hub-v2`, deployed to staging only. **Production is unchanged, and validation is incomplete.** Test state is in
TESTING.md.

| Checkpoint | State |
|---|---|
| 1 Baseline | Done: mechanics baseline and saved rooms recorded before any change |
| 2 Bookshelf, 3 Game details | Done, browser-tested (`shelf.spec.ts`) |
| 4 Theme architecture | Done, browser-tested (`theme.spec.ts`) |
| 5 Kingdom rebrand | Done, unit-tested. `clockwork.spec.ts` hasn't completed since |
| 6 Art and polish | Scenes done. Motion and sound have no per-game variation |
| 7 Validation | **Partial:** the browser run was stopped for low memory |
| 8 Staging | **Deployed, HTTP smoke test only:** no browser run against it yet |

Not done:

- Kingdom & Commerce has the shared sound and motion, not its own.
- The inspect dialog's title stays in capitals, unlike the rest of the theme.
- Art is original flat SVG, not painted illustration.
- `docs/CLOCKWORK_BALANCE.md` still uses the old card names.
- Bohnanza hasn't been compared by screenshot. Its rules are untouched, its browser tests changed only in how they reach the shelf, and shared components fall back to its old values.
