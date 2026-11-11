# Architecture

```
 Browser (Svelte 5)                         Cloudflare
 ┌──────────────────────────────┐   HTTPS   ┌──────────────────────────────┐
 │ Hub UI  (src/hub)            │──/api/──▶ │ Worker (src/server/worker.ts)│
 │  Hub · RoomPage · Lobby      │           │  routing, cookies, CSRF,     │
 │ Sync    (client/lib/         │◀──/ws/──▶ │  token hashing               │
 │  connection.svelte.ts)       │  WebSocket└──────────────┬───────────────┘
 │ Game UI (games/*/ui, lazy)   │                          │ one stub per room code
 │ Shared visuals, motion,      │           ┌──────────────▼───────────────┐
 │  sound, settings             │           │ RoomDO (src/server/room.ts)  │
 └──────────────────────────────┘           │  hibernating WebSockets,     │
                                            │  SQLite store, alarm cleanup │
                                            │ ┌──────────────────────────┐ │
                                            │ │ RoomCore (core.ts)       │ │
                                            │ │  lifecycle, seats, sync, │ │
                                            │ │  versioning, undo, dedupe│ │
                                            │ │ ┌──────────────────────┐ │ │
                                            │ │ │ GameModule (rules)   │ │ │
                                            │ │ │ pure TS, seeded RNG  │ │ │
                                            │ │ └──────────────────────┘ │ │
                                            │ └──────────────────────────┘ │
                                            └──────────────────────────────┘
```

## Layers

| Layer | Path | Depends on |
|---|---|---|
| Game-module contract, seeded RNG | `src/engine` | nothing |
| Bohnanza rules | `src/games/bohnanza/rules` | engine |
| Second test game (Tally) | `src/games/tally` | engine |
| Deck-building engine | `src/engine/deckbuilder` | engine |
| Deck table UI, with a dev-only fixture game (D21) | `src/games/deck/ui`, `src/games/deckbench` | client libs, deck engine |
| Registries | `src/games/registry.ts` (rules), `src/games/ui.ts` (lazy UI) | games |
| Wire protocol | `src/shared/protocol.ts` | engine types |
| Room lifecycle, sync, persistence interface | `src/server/core.ts` | engine, protocol (no Cloudflare APIs) |
| Durable Object + SQLite store | `src/server/room.ts` | core, Cloudflare |
| Worker routing, sessions, CSRF | `src/server/worker.ts` | room, protocol |
| Client libraries | `src/client/lib` | protocol |
| Hub UI (name, create, join, lobby, settings) | `src/hub` | client libs |
| Bohnanza table UI | `src/games/bohnanza/ui` | client libs, rules *types* and read-only helpers |

`RoomCore` runs unchanged under Vitest with an in-memory store (`MemoryStore`). That is how lifecycle, sync and undo
are unit-tested without a Workers runtime.

## The game-module interface

`src/engine/types.ts` defines `GameModule<Config, State, Action, View>`:

- **metadata:** `meta` (id, name, min/max players, `stateVersion`).
- **configuration:** `options`, `defaultConfig`, `validateConfig`, and an optional `sanitizeConfig` for settings that
  aren't booleans. A game can add its own lobby section through `GAME_SETUP` in `src/games/ui.ts`.
- **setup:** `setup({ playerCount, seed, config })`. All randomness comes from an RNG whose state is carried in the
  game state, so a game is reproducible from its seed and action log.
- **legal actions and transitions:** `apply(state, seat, action)` returns `{ ok, state, undoable }` or
  `{ ok: false, code, error }`, and never mutates its input. Illegal moves come back as explanations.
- **turns:** `actors(state)`, the seats that may or must act now.
- **projection:** `project(state, viewer)` builds the only data a seat ever receives.
- **terminal state and scoring:** `isOver`, `results`.
- **persistence upgrades:** optional `migrate(state, fromVersion)`.
- **computer players:** optional `bot(view, standIn?)`; `standIn` is true when the bot covers an absent person. It returns candidate actions, best first, and a delay; it
  receives only the bot seat's projection, so it cannot see hidden cards.
- **UI registration:** one lazy entry in `GAME_UI`. Each table receives `{ conn, room }`. The hub lists games from
  `src/hub/catalog.ts`, which a unit test keeps in step with `LISTED_GAMES`.

Kingdom & Commerce (`src/games/clockwork`, first released as Clockwork Commons) is data on the generic deck engine
(`src/engine/deckbuilder`), with a shared table in `src/games/deck/ui`. The room core needed no game-specific change for it.

**Presentation is per game; everything functional is shared.** Three things vary:

- `src/hub/catalog.ts`: one data entry per game on the home page (box cover, fan, colours, pitch, player counts, length,
  settings shown). A game's fan is its own `ui/Fan.svelte`, loaded on demand. `GameFeature`, `CardFan`, `GamePanel` and
  `RoomList` hold no game-specific code.
- `GAME_THEME` in `src/games/ui.ts`: an optional lazy stylesheet. `RoomPage` puts `data-game-theme` around the room, and
  the stylesheet's rules all start from that attribute, so it restyles through tokens and can't reach anything else.
- A ruleset's optional `present(text)`: rewords text saved in state as a view is built, so a game can be renamed without
  touching saved rooms or changing `stateVersion`.

The hub's guides follow the same split. `src/hub/Guide.svelte` draws levels, contents, search and collapsible sections from
data that each game supplies in `ui/guide.ts`, loaded through `guide` in the catalog. `tests/guides.test.ts` checks the
numbers and worked examples against the real rules.

**Rule editions are saved with the game.** A deck-builder game records `rulesVersion` when it's created, and the engine
reads cards, Crown Projects and scoring for that edition. New Kingdom & Commerce games start on the newest edition, and
games already in play finish on the one they began with (CLOCKWORK.md, Editions). The newest is edition 4, with the final
Crown Project rules and a finished last round. Bots read the edition from their view too, so older games keep their old bot
decisions. A room's guide also follows its edition (`guideFor`).

**Card art is static.** Kingdom & Commerce's illustrations are SVG files in `public/cards/`, served by the assets binding and
loaded with `<img loading="lazy">`, so they cost no Worker requests beyond the free static tier and no inline DOM.

Networking, camera, drag and drop, animation, settings and accessibility aren't themed and aren't duplicated.

The interface was shaped around one real game plus a deliberately tiny second one (`tally`). Tally exists to prove
that the room core is game-agnostic; it is not listed in the hub.

## Sync protocol (`src/shared/protocol.ts`)

**Client → server:**

- Game actions: `{ t: 'act', id, v, a }`.
- Room commands, each with its own `id` and `v`: `undo`, `config`, `start`, `kick`, `leave`, `rematch`. In the lobby
  `leave` frees the seat; during a game a bot takes the seat if other people remain, otherwise the game ends and the room is deleted (D19).
- Keep-alive: `{ t: 'ping' }`.

**Server → client:**

- `room`: the full `RoomView` for that seat, sent on connect and after every committed change.
- `ack`: `{ id, ok, v, code?, error? }`.
- `bye`: the seat was removed or given up, or someone quit and the game ended (`by` names them).
- `pong`.

Every mutating message carries a client-generated action ID and the room version the client last saw. The server then:

1. Authenticates the socket. The seat comes from the cookie-derived token hash and is fixed when the socket connects.
2. Deduplicates on `seat:id` (the last 256 per room). A repeated ID returns the original outcome and does not run again.
3. Rejects the message as `stale` if `v` is not the current version. Clients act only on what they have seen.
4. Validates through the module's `apply`.
5. On success, commits atomically: one SQLite transaction writes meta, state, undo row and history, and bumps the version.
6. Acks the sender and broadcasts a fresh projection to every connected seat.

Messages are capped at 16 KB and rate-limited per socket (token bucket: burst 20, refill 10/s).

The client (`RoomConnection`) keeps a single socket per room:

- **Keep-alive:** it pings every 20 s. The Durable Object answers with a hibernation auto-response, so it stays asleep.
- **Dropped connections:** the socket is treated as dead after 8 s without a pong, or immediately on the browser's
  `offline` event. The client then reconnects with backoff (250 ms → 2 s).
- **During a reconnect:** the UI shows a banner. A fresh snapshot replaces local state on reconnect.

## Sessions and security

- **Seat tokens:** taking a seat sets `bg_<CODE>`, an HttpOnly, Secure, SameSite=Strict cookie holding a 32-byte
  random token. The Worker passes only its SHA-256 hash to the Durable Object, and only hashes are stored. A display
  name or room code alone grants nothing.
- **Origin checks:** every state-changing request and every WebSocket upgrade must come from the site's own origin,
  which guards against CSRF and cross-site WebSocket hijacking.
- **Response headers:** `public/_headers` sets a strict CSP (`default-src 'self'`, no inline script), `nosniff`,
  `no-referrer` and a restrictive Permissions-Policy.
- **Privacy:** the public room summary (`GET /api/rooms/:code`) holds only names, status and options. Hands and the
  deck exist only in the Durable Object.
  - Card IDs are assigned through an independent permutation, so an ID reveals nothing.
  - Open offers show hand cards by bean type only.
  - The log, history and error messages never name hidden cards.
- **Local storage:** holds only conveniences (your last display name, recent rooms, settings), never credentials.

## Persistence (`RoomDO`, SQLite)

| Table | Contents |
|---|---|
| `meta` | room config, status, version, timestamps, schema and state versions, the game seed (never sent to clients) |
| `seats` | seat order, display name, token **hash**, join time |
| `blobs` | game state, the undo snapshot and any steps linked to it |
| `actions` | dedupe outcomes for the last 256 action IDs |
| `history` | every committed change: version, seat, kind, public data, time |

- **Recovery:** a restart, hibernation or redeploy rebuilds `RoomCore` from these tables. The test "a fresh core over
  the same store resumes exactly" covers this.
- **Retention:** a Durable Object alarm deletes the room's storage after a period with no change. Lobby rooms go
  after 24 hours, games in progress after 30 days, and finished games after 7 days.
- **Bots:** a bot seat has the token hash `bot:<n>`, which cannot collide with a SHA-256 hex hash, so no cookie can
  claim it. The host seats bots at create time ("Practise with bots" seats `minPlayers - 1`) or with "Add a bot" in
  the lobby. One Durable Object alarm serves both bots and retention. When a bot may act, it fires at
  `updatedAt + delay`, plays the soonest due bot's first legal candidate and broadcasts the result. Otherwise it fires
  at the retention deadline. Bot moves are never undoable. A bot that returns no legal move is logged and left
  alone until the state changes, so a broken bot cannot spin the alarm.
- **Host leaving:** this does not end the game. Seats belong to players, not to the host. When the host is offline,
  any seated player may use host controls.

## Undo

The engine marks an action `undoable` only when it revealed nothing and affected only the actor: in Bohnanza, planting from
hand, planting a pending card, or harvesting. The room keeps an undo snapshot, owned by that action's author. Any later
commit bumps the version and invalidates it, so an undo can never rewind someone else's move or expose what a
reveal showed.

A game can set `meta.undoSteps`. The snapshot then links back to that player's previous undoable action, up to that many
steps, so they can be taken back one at a time. An action that isn't undoable clears the links. Bohnanza leaves it unset and
keeps one step. Deck games use 8, which is about 230 KB in a late 6-player game, well below a Durable Object row's limit.
Rows saved before this have no links and undo one step.

## Client rendering and motion

- **Confirmed state only:** the table renders the latest confirmed `RoomView`. Cards have stable IDs.
- **FLIP animations:**
  1. Before applying a new view, `motion.ts` snapshots card rects.
  2. After Svelte updates, cards fly from old rects to new ones (deck → hand, hand → field, field → discard, and so on).
  3. Only `transform` and `opacity` are animated, via the Web Animations API.
  4. Snapshots record each card's 2D rotation and per-axis size, so a card leaving the fanned hand or landing on the
     tilted table turns and squashes smoothly instead of snapping. Moves under 48 px (a hand closing up) slide quietly
     with no lift or pop.
- **Drag drops:** while a dropped card's move is in flight to the server, its drag ghost stays where it was dropped
  (`hold`). Nothing is planted early: the next confirmed view flies the card from the ghost to wherever the server put
  it, and a refusal (or 1.5 s without an answer) returns it to the hand (`release`).
- **Interruptions:** a newer state calls `finishAll()` first, so a stale animation never lingers.
- **Settings:** reduced motion, low-performance mode and sound live in `settings.svelte.ts`.
- **Camera:** a fixed isometric tilt (`rotateX(20deg)`) with zoom, pan and reset, but no rotation. Nothing runs
  per frame when the table is idle.

## Dead Drop

Dead Drop (`src/games/deaddrop`) is a plain `GameModule` with no bot. It uses two optional `GameMeta` flags: `simultaneous`, under which the
room doesn't reject an action for an old version, because the rules refuse what is really stale by its round; and `readyCheck`, which adds lobby ready states. `apply` and `setup` receive the room's clock for timestamps and inactivity limits, and `historyAction` redacts secrets from history rows. See DEADDROP.md, D44 to D48.

## Sealed Correspondence

Sealed Correspondence (`src/games/sealed`) is a plain `GameModule` without a bot. Like Miners & Saboteurs it sets
`simultaneous`: chat and reactions may come from any seat, and every turn action carries its turn number, so a stale one
is refused. It adds one optional field to `GameMeta`, `graceMs`, the presence grace before a seat counts as away (90 s
here; other games keep the room default). With no bot to step in, an away seat just waits. Leaving mid-game ends the
room for everyone, with no winner. The table animates from snapshots of confirmed views (`client/lib/motion`). Cards
carry stable `data-card` ids, so a card can be followed from the deck or a seat into a hand or pile. See SEALED.md and
D54–D55.

## Miners & Saboteurs

Miners & Saboteurs (`src/games/mines`) is a plain `GameModule` with a bot. It sets `simultaneous`, because chat and
reactions are actions any seat may send at any time, and every turn action carries its turn number so the rules refuse a
stale one. Two shared changes came with it, both harmless to other games:

- The room refuses `config` once the game has started (`started`).
- `bot(view, standIn)` tells a bot whether it is covering for an absent person, so the away policy can choose between
  waiting and passing.

v1.1 animates the table from its public log. Log lines and chat share a rising id, so a client presents only the lines
it has not seen and a reload replays nothing (MINES.md, Presentation). The effects layer (`ui/fx.ts`) is a fixed
overlay of transform and opacity animations that every new view finishes at once. `SettingsMenu` gained an optional
`children` snippet for a game's own settings, and `sound.ts` exports its synth helpers. Other games are unchanged.

See MINES.md and D49 to D52.
