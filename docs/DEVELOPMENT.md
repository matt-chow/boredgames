# Development

## Requirements

- Node 22+ (developed on Node 24.20, npm 12.2).
- For browser tests: Microsoft Edge, or `npx playwright install chromium` and then `E2E_CHANNEL=`.

npm 11+ blocks dependency install scripts by default. The project pre-approves the two it needs in `package.json` →
`allowScripts`: `workerd`, the local Workers runtime, and `esbuild`. If npm upgrades them and prompts you, approve
them with `npm install-scripts approve <pkg>`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite on :5173 with the Cloudflare plugin. The Worker and Durable Objects run in real `workerd`, with HMR for the UI. |
| `npm run check` | `svelte-check` (client) and `tsc -p tsconfig.worker.json` (Worker) |
| `npm test` | Vitest unit tests (Node) |
| `npm run test:e2e` | Playwright; starts its own dev server on :5174 |
| `npm run build` | Client bundle to `dist/client`, Worker to `dist/boredgames` |
| `npm run deploy` | build + `wrangler deploy` |

Local Durable Object data lives in `.wrangler/state` (git-ignored). Delete it to start fresh.

## Layout

```
src/
  engine/            GameModule contract + seeded RNG (no platform code)
  games/
    registry.ts      rules registry (server)
    ui.ts            lazy UI registry (client)
    bohnanza/
      rules/         cards, config/variants, state types, engine (reducer), view (projection)
      ui/            Table, Camera, Hand, Field, Seat, TradePanel, Inspect, Summary, HowTo, art
      index.ts       the GameModule
    tally/           tiny second game proving the room core is game-agnostic
  shared/protocol.ts wire types, room codes, names
  server/
    worker.ts        HTTP routes, cookies, CSRF, WebSocket upgrade
    room.ts          RoomDO: SQLite store, hibernating sockets, alarms, rate limits
    core.ts          RoomCore: lifecycle, seats, versioning, dedupe, undo (platform-free)
  client/            entry, global styles/tokens, libs (connection, motion, sound, settings, router, toasts)
  hub/               Hub, RoomPage, Lobby, dialogs, settings menu
tests/
  bohnanza/          rules (R*), variants (V*), projection (P*), simulations (S)
  server/            room core (H*)
  e2e/               Playwright specs
public/              _headers (CSP), favicon, self-hosted font
```

## Adding a game

1. Create `src/games/<id>/index.ts` that exports a `GameModule` (see `src/engine/types.ts`). Keep rules pure: take all
   randomness from the RNG in your state (`src/engine/rng.ts`), and never mutate the input state in `apply`.
2. Write `project(state, viewer)` first and test it. It is the privacy boundary.
3. Register the rules in `src/games/registry.ts`, and add the id to `LISTED_GAMES` to offer the game in the hub.
4. Add a lazy UI entry to `src/games/ui.ts`. The component receives `{ conn, room }`. Read
   `room.game` (your projection) and call `conn.act(action)`. Ack errors carry your engine's explanation text.
5. Add Vitest tests for rules and projection, and a seeded full-game simulation. `src/games/tally` is the smallest
   complete example: under 100 lines of rules plus a one-file UI.

No server changes are needed. Rooms, seats, sync, persistence, undo, reconnect and rematch all come from `RoomCore`.

## Conventions

- No optimistic UI. Render the confirmed view, and let `motion.ts` animate the difference between consecutive views.
- Design tokens live in `src/client/styles/global.css`. Use them, not literal colours. Sprout green means
  "legal / your turn" and is used for nothing else.
- Animate `transform` and `opacity` only. Check `settings.instant` and skip motion when reduced motion is on.
- Copy speaks plainly in second person and uses player names, never "Player 2".
