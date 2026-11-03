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
