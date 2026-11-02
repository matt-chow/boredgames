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

## Known limitations

- Placeholder card art only. Licensed art can be dropped in via `ASSET_OVERRIDES` (ASSETS.md).
- No accounts: identity is a per-room cookie. Clearing cookies or switching browsers loses the seat.
- A silently dead connection (no `offline` event) can take up to 28 s to notice.
- Not tested on physical phones or Safari.
- See TESTING.md → Known gaps.

## Owner actions

1. **Commit the repository.** Nothing has been committed yet; all files are untracked on `main`.
2. **Review `PRODUCT.md`.** It was written from the brief, not from an interview with you. Correct anything that does
   not match your intent.
3. Play one real game with friends on phones, and listen to the sounds once.
4. Optional: obtain licensed Bohnanza artwork and add it (ASSETS.md).

## Next ideas (not started)

- Spectator mode.
- A dedicated multi-room load test.
- A second real game, using `src/games/tally` as the template.
