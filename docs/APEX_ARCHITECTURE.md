# Apex '66: architecture

Apex '66 is one more `GameModule` (ARCHITECTURE.md). It reuses the room core, cookie seats, WebSocket sync, SQLite
persistence, alarms, bots, the hub lobby, guide, settings, toasts, sound helpers and the staging deploy. It adds two
small game-agnostic hooks to the room and nothing Apex-specific to the server.

## 1. Layers

| Path | What | Depends on |
|---|---|---|
| `src/games/apex/rules/content/` | circuits, upgrades, sponsors, press, events, weather, rivals: plain data | nothing |
| `src/games/apex/rules/geometry.ts` | spline sampling, space positions, curvature; pure math shared by UI and validation | content |
| `src/games/apex/rules/cards.ts` | card ids, values, deck building | content |
| `src/games/apex/rules/race.ts` | race setup and the deterministic round resolution | engine rng, cards, content |
| `src/games/apex/rules/ai.ts` | the one computer driver: plans from a car's own view only | race types |
| `src/games/apex/rules/season.ts` | championship: points, standings, drafts, sponsors, press, events | race |
| `src/games/apex/rules/engine.ts` | `setup/apply/actors/project/results/tick/wakeAt/retainMs` | all of the above |
| `src/games/apex/rules/replay.ts` | versioned replay export and re-simulation | engine |
| `src/games/apex/index.ts` | the `GameModule` | engine |
| `src/games/apex/ui/` | table, board, dashboard, hand, setup, interlude, podium, replay viewer, tutorial, guide | rules (types and read-only helpers) |

Rules code imports no Svelte, DOM or Cloudflare API. The UI imports rules types, geometry and pure helpers (the
replay viewer runs the engine in the browser, but only on a finished race's replay, which holds nothing secret).

## 2. State, actions and views

- **State** (`AState`) holds the config, the season (or a one-race season for Quick Race), the current race and the
  RNG. A race holds the cars (deck, hand, discard, engine, upgrades as compact card codes), the phase, the step
  number, plans, the pending reaction, the log, and the replay record for this race.
- **Phases:** `plan` (simultaneous, hidden) → `react` (one driver decides a draft that crosses a corner) → back to
  `plan`; after the finish `podium` → in a season `draft` (one picker at a time, reverse standings) and `sponsor`
  (simultaneous) → `grid` (everyone ready) → next race; finally `over`.
- **Actions:** `plan {step, gear, cards, discard, boost}`, `retract {step}`, `react {step, draft}`, `pick {step, id,
  drop?}`, `sponsor {step, id}`, `ready {step}`, `shelve {step}`, `autopilot {step, car, on}`. Every action carries
  the step, so a late or repeated one is refused (AX-NET-1). The room is `simultaneous`.
- **Computer cars** are not seats. When every human plan is in, the engine plans each computer car with `ai.ts` from
  `carView(state, car)`, the same projection a person would get. Bot *seats* (a quitter, the hub's "add a bot") play
  through the room's normal bot path with the same driver.
- **Projection** (`project(state, seat)`): your hand, your deck's contents (counts, never order), your discard; for
  everyone the public table (positions, gears after reveal, engine and discard counts, hand sizes, revealed plans,
  the log). The seed, deck orders, other hands and unrevealed plans never appear (AX-PRV-1).
- **History rows** keep only the action type (`historyAction`), since a plan names cards before its reveal.

## 3. Circuits: four layers

`content/circuits.ts` gives, per circuit: control points (geometry), `length` and per-space lane counts (logical
spaces), `corners` (logic), `sectors`, `tunnels`, `passes`, `gravel` (module overlays), `scenery` (props with a
kind, position along the track, side and offset) and `laps`. `geometry.ts` samples the spline by arc length, so the
board positions of space *i* and its lanes come from the spline, and nothing in the rules reads them. A sharp bend is
only a corner if `corners` says so (AX-CRN-1).

## 4. Room hooks added

- `GameModule.retainMs?(state, status)`: how long the room survives without a change. The core falls back to
  `RETENTION_MS`. Apex returns the AX-RET-1 table.
- A host-only `close` message deletes the room for everyone (storage, alarm, sockets). Any game may use it.

Both are optional and other games are unchanged.

## 5. Absent drivers

`meta.graceMs` is very long, so the room never puts a bot in a seat on its own. Instead `tick(state, now, online)`
records who is online; when the table waits on someone offline it pauses (AX-NET-2). Any connected player may send
`autopilot`, and then the engine plans that car with the computer driver while its owner is away (AX-NET-3).

## 6. Replays

At every reveal the engine appends the round's plans and later reactions to `race.replay`. When the race ends the
record is closed with the seed. `replay.ts` exports `{format: 'apex66-replay', version: 1, …}` and re-simulates it with
the same engine; `tests/apex/replay.test.ts` checks that re-simulation reproduces the final standings and every
car's position. Replays of earlier races in a season are kept (they are small: about 2 KB a race).

## 7. Costs

Everything is static or synthesized: circuit art and scenery are SVG drawn from data in the client, sounds are
synthesized with the shared `sound.ts` helpers. No new binding, no paid product. `npm run measure:apex` reports
state size and rows written per race (APEX_BALANCE.md, Storage).

## 8. Asset manifest

`ui/assets.ts` lists every visual by a stable key (cars, scenery props, card faces, poster, weather badges) with an
SVG fallback component. A key may later point at a raster file under `public/art/apex/`; nothing else would change.
