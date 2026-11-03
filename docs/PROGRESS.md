# Progress

Last updated 2026-11-02.

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
- **Quit game (2026-11-02):** Settings → "Quit game…" during a game, with a confirm dialog. A bot takes over the
  seat with its hand and fields, the others get a toast and play on, and the quitter returns to the hub (D19).
  Quitting is final; with nobody else seated in person the game stops.

## Known limitations

- Placeholder card art only. Licensed art can be dropped in via `ASSET_OVERRIDES` (ASSETS.md).
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
- A second real game, using `src/games/tally` as the template. Add it to `LISTED_GAMES` and `src/hub/catalog.ts`;
  the hub gives it a crate automatically.
- Stronger bots (trade proposals, planning for future draws).
