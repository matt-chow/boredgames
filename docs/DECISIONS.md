# Decisions

Each decision lists what we chose, why, and the alternative we rejected.

### D1. Server-authoritative, no optimistic updates

The client sends intents and renders only confirmed state. Acks return in about 55–75 ms against the live deployment
(see TESTING.md), so optimistic prediction would buy little and would risk animating moves the server then refuses.
Animations always follow the confirmed state.

### D2. Strict version check on every mutating message

A message whose `v` is not the current room version is rejected as `stale`, and the UI says the table changed first.
This lets players act only on what they have actually seen, which matters in a trading game. It also makes
concurrent accept / withdraw and double-tab races resolve to exactly one winner. The cost is the occasional retry when
two players act in the same instant. *Alternative rejected:* per-action merging, which is more complex and harder to
reason about for hidden information.

### D3. Idempotent action IDs

A repeated `seat:id` replays the original outcome and does not run again. The last 256 per room are kept. Retries
after a reconnect therefore cannot double-apply.

### D4. Cookie sessions bound to seats

Each seat gets a random 32-byte token in an HttpOnly, Secure, SameSite=Strict cookie scoped to the room, and the
server stores only its SHA-256 hash. JavaScript never sees the credential, a name or code alone grants nothing, and
same-origin checks block CSRF and cross-site WebSocket use. *Alternative rejected:* tokens in localStorage, which
script injection can read.

### D5. Offers are public; hand cards in them are shown by type

Physical Bohnanza negotiation happens out loud, so everyone sees open offers. Hand cards in an offer are shown as
bean types with masked IDs, so offers reveal no more than saying them aloud would. Turned-over cards are public and
keep their IDs.

### D6. Unsupported variant combinations are refused, not improvised

- **Field Bean + Three New Bean Types:** the two variants define different decks.
- **Bean Coin + V1/V2:** the coin's thresholds and draw counts assume the base draw rule.
- **Bean Coin + Magpie:** a resisted claim could make the claimant plant a Magpie, which can never be planted, and
  the rulebook is silent.
- **The Duel:** a 2-player variant.

The lobby switches off conflicting options automatically and explains why. See VARIANTS.md.

### D7. Bean Coin draw rule

When the active player both holds the coin and has fields worth under 1 coin, they draw 4. The holder rule is listed
first and is the more specific rule. "Worth" means what the fields would pay if harvested now.

### D8. Magpie handling

A Magpie counts as one of the two phase-1 cards. It steals the **top** bean of a field, since that is the only one
physically reachable. A Magpie gained in trading goes to the back of the hand, which keeps hand order intact.

### D9. Wax / Brandy beanometer from the anniversary rules

The base rulebook lacks this card, so its values come from AMIGO's anniversary rules. The data lives in one table
(`rules/cards.ts`). See RULES.md, "Known source discrepancies".

### D10. Original placeholder art, swappable

No publisher artwork is included, since we have no licence to redistribute it. Every card is an original "crate label"
in SVG and CSS, and `ASSET_OVERRIDES` lets licensed images replace it without touching rules or networking. See
ASSETS.md.

### D11. Self-hosted font, no third-party requests in production

Labels use Big Shoulders Stencil (SIL OFL, licence in `public/fonts/OFL.txt`), served from our own origin. Body text
uses the system UI stack. The CSP allows only `'self'`, so nothing is hotlinked.

### D12. Lazy-loaded game UI

The hub, lobby and connection code form the initial bundle (about 41 KB gzipped JS). Each game's table is a separate
chunk that loads when a game starts. Adding games does not slow the hub.

### D13. Spatial layout keeps the trading dock visible

Showing and hiding the dock re-fitted the camera and made the table jump. On wide screens the dock is always present;
on phones (compact layout) it is a collapsible bottom sheet that opens itself when an offer arrives.

### D14. Fast reconnect detection

The client pings every 20 s and treats 8 s without a pong as a dead socket. It also reacts at once to the browser's
`offline` event. Pings are answered by the Durable Object's hibernation auto-response, so idle rooms stay asleep and
cost nothing.

### D15. Lobby changes are serialised

While a lobby change is in flight, the switches are briefly locked, though not visually dimmed. Each toggle is then
computed from confirmed config. Without this, fast toggles on a real network sent a second change built on the old
version, which D2 then rejected. The live smoke test found this; local tests had not.

### D16. Host leaving never ends the game

Seats belong to players. If the host goes offline, any seated player may use host controls such as starting and
configuring. In the lobby, leaving passes the host role to the next seat.

### D17. Retention

Lobbies are deleted after 24 h idle, games in progress after 30 days, and finished games after 7 days, by Durable
Object alarm. Long enough to pause a game over a holiday; short enough that the free storage quota never fills.

### D18. Bots decide from their own projection

A bot gets exactly what a human in its seat would see and nothing else, and the server applies its moves like any
other action. This keeps the hidden-information guarantee intact by construction. When several bots could act
(during trading), the one with the soonest move goes first. Otherwise the active bot would end trading before its
partner could answer an offer. The Bohnanza bot is deliberately simple: it is there to let one person try the game
and to exercise the server, not to play well.

### D19. Quitting: a bot takes over if people remain, otherwise the game ends

A player may quit a game in progress from Settings, after a confirmation. What happens depends on who is left:

- **Other people are still seated** (and the game has computer players): a bot takes the seat as it stands (hand,
  fields, coins), named after the player with "(bot)", so everyone else can finish. Seat numbers are part of the game
  state, so the seat is kept, not removed. The others get a toast; the host role passes to the next person; undo is
  cleared. The quitter's token loses the seat, so a refresh or another tab cannot reclaim it.
- **Only bots would be left**, such as a practice game (or the game has no computer players): the game ends. Everyone
  still connected is told who quit, every socket closes, and the Durable Object deletes the room at once instead of
  waiting out its retention window (D17), so no bot plays on for nobody and nothing stays stored.

Either way quitting does not depend on the table, so it is never rejected as stale. A lobby leave still only frees the
seat, and leaving a finished game is still refused; the results screen has its own way back to the hub.

### D20. A generic deck-building engine, not yet a game
`src/engine/deckbuilder` is a card-agnostic engine: card behaviour is typed JSON data run by an interpreter, and all
pending work is a JSON stack, so a game can stop at any decision and resume after a reload. It uses the existing
`GameModule` contract, so the server doesn't change. It is not registered in the hub and contains no game content;
only a test fixture exercises it. Code from `paulbatum/Dominion` (MIT) was not reused, because its object graph doesn't
persist. Scope and licensing questions are in DECKBUILDER_LICENSING.md, and the design is in DECKBUILDER.md.

### D21. The deck table is built on a dev-only bench, before any card set exists
No authorised card set exists yet, and inventing a catalog needs the owner's approval. The UI and infrastructure can
still be built and tested, so they run on the fixture ruleset as a `deckbench` game. It exists only under
`npm run dev:bench`, so D20's "not registered" still holds for production.

- **Staying out of builds:** a literal `__DECK_BENCH__` guard at each site, an alias that stubs the module in builds,
  and `scripts/no-bench.mjs`, which fails the build if anything is left. All three are needed: the first version used
  a module-level constant, and the production bundles contained the fixture cards.
- **Market config:** `GameModule` gains an optional `sanitizeConfig`, so a game can accept structured config while the
  server stays game-agnostic. Boolean-only games leave it out and behave as before. A game can add a lobby section
  through `GAME_SETUP`.
- **Fixed tilt rather than true isometric:** the brief asks for a fixed-isometric view. The table reuses Bohnanza's
  camera tilt with no rotation, because a 45° view skews the card text players have to read. This is a documented
  difference from the brief, for the owner to confirm.
- **`stateVersion` stays 1:** the new `play-treasures` frame and action only add to the shape, and no deck game has ever
  been persisted outside a development machine.

### D22. General mechanics, and no Dominion card set
The owner asked to reassess implementing Dominion Second Edition's base game with the Bohnanza method. The comparison is
in DECKBUILDER_LICENSING.md. Claude won't write that card set, its setup or a card-by-card mapping, in any form, so
this is a limit on Claude's work and not a legal finding. The engine audit did find general gaps, so these were added
as composable effects: `until`, zone and variable counts, combined conditions, whole-hand references, the trash as a
choice source, `by` and `player` for acting across seats, `pick`, `select`, `pass-up`, `gain-card`, one-shot triggers,
variable filters and points by kind of card.

- **No new decision kinds:** several picks are repeated option prompts, so the table UI and the wire format don't change.
- **`stateVersion` stays 1:** every change only adds to the shape, and no deck game has ever been persisted outside
  development (as in D21).
- **Privacy follows the decision, not the card's owner:** `by` shows cards only through `pending.cards`, which is sent
  only to the deciding seat. Limbo stays private.

### D23. Clockwork Commons is the first card set, and deck state is now versioned from here on
The owner supplied an original card file and asked for it to be built, so the deck engine is now registered in the hub,
replacing D20's "not registered" and D21's dev-only restriction for this game. The bench stays dev-only.

- **Rules are data:** cards and Public Works are JSON effects on the generic engine, and the engine additions are all
  optional `Ruleset` fields, so `src/server` didn't need to know about the game.
- **`stateVersion` stays 1 for this release:** no deck game had been persisted outside development before it. From this
  deployment on, deck games live in production, so **any further change to the state's shape needs a version bump and a
  `migrate` step**.
- **Balance results didn't change any card:** the sample is too small to override the owner's designs (CLOCKWORK.md).

### D24. Staging is a separate Worker with its own Durable Objects
`env.staging` in `wrangler.jsonc` deploys `boredgames-staging`. It has its own Durable Object namespace, so no room or
session is shared with production. The Cloudflare Vite plugin picks the environment at build time, so `npm run
deploy:staging` sets it, and refuses to publish a build not named for staging.

### D25. Kingdom & Commerce names avoid Dominion's
The brief's rename offered examples such as Grand Market, Merchant Guild, Royal Steward and Noble Estate, and asked for a
medieval economic kingdom-builder. That sits close to Dominion in genre, and those are or closely echo its card names and
vocabulary. No Dominion card name was used, so a card that the brief illustrated with one has a different name. Mechanics
and balance weren't touched. The owner's brief took precedence everywhere it was specific: the terms in the old-to-new table
are exactly as requested.

**Updated by D29:** the owner later specified Noble Estate by name for a basic card.

### D26. Inside Kingdom & Commerce, a bright gold takes the signal role
Sprout green on burgundy and ivory fought with the palette. So inside `[data-game-theme='clockwork']`, `--sprout` is a brighter
gold (`#edcb80`) that still means only "legal / your move". Antique gold on frames is duller and thinner, so the two read
apart. The hub and Bohnanza keep sprout, and the role itself doesn't change.

### D27. A rename reworded at projection, not in state
Prompts and option labels are copied into saved state, so rooms saved before the rename hold the old words. Rewriting them
would mean a migration and a `stateVersion` bump for no change in meaning, and a rollback couldn't undo it. Instead the
ruleset's `present` rewords text as a view is built. State shape and `stateVersion` are unchanged, so a rollback to the
previous build can still read every room. The old words stay in `legacy.ts` for as long as such rooms can exist.

### D28. The game panel shows settings but doesn't edit them
The panel lists each game's settings read-only, and the lobby stays the only place they are chosen. A second editor would
need its own validation and a way to hand values to the room, and the server would still have to check them. Opening a table
takes one more step in exchange for one authority.

### D29. The v3.0 basics use the owner's names and numbers
Coin Purse, Silver Chest, Royal Treasury, Homestead, Noble Estate and Grand Duchy, with their costs and values, are exactly as the
v3.0 brief gives them, on the old ids. A permanent Currency-and-points supply is the genre's normal shape. The brief also asked not to
recreate a published catalogue, so what's new in Crown Decrees is built on Influence and Crown Projects, not on another game's cards.

### D30. Rules are versioned by edition, not rewritten in place
A game stores `rulesVersion` and runs on that edition's frozen definitions. The alternative, rewriting saved rooms to new cards,
would have changed games in progress and been destructive. The cost is keeping `RULES_V2` forever, or until no v2 room can remain.

### D31. Renown privacy is a projection rule
Rival totals are left out of the view on the server, not hidden by the UI. Crown Project completions stay public because the
table needs them to play, so totals can be partly inferred. That was accepted: the brief keeps public rewards visible.

### D32. Migrating a room migrates its undo
`RoomCore` migrates the outstanding undo row with the state, because it holds a whole older state. Found by reading the code while
writing KC3-VER-6. This is in the game-agnostic server, so it applies to any game's future migration.

### D33. The guides are data, checked against the engine
Each game's guide is a typed document in its `ui` folder, drawn by one shared `Guide.svelte`. GUIDE-* tests compare its numbers
with the rulesets and replay its worked examples on the real engine, so a rules change fails until the guide is corrected. They
check the scenarios, not every sentence: prose can still drift.

### D34. A bot fix applies only to new editions
The v3 bot stops trashing its own Renown only when the game's `rulesVersion` is 3 or higher. Bots are part of how a room plays, so
fixing them everywhere would have changed rooms already in progress and the golden games that prove v2 hasn't drifted. The cost is
that v2 rooms keep the weaker bot until they end.
