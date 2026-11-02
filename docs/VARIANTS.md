# Variants

All variants come from the AMIGO 25th-anniversary rulebook. With every option off, the game is exactly the Rio Grande
base game. Test **V0** checks that the base deck, fields and flow are unchanged.

The rules engine is the only authority on what can be combined: `validateConfig` in `rules/config.ts`.

- **Server:** refuses to start a game with an unsupported combination.
- **Lobby:** switching an option on also switches off anything it conflicts with, and shows why a configuration cannot
  start.
- **Visibility:** options that cannot work at the current player count stay visible but are marked.

Every option listed below is fully implemented and tested. Nothing incomplete is offered.

| Option | Players | Combines with | Tests |
|---|---|---|---|
| Three New Bean Types (V1) | 3–5 | Magpie | V1.x, simulations `v1-3`, `v1-5-magpie`, e2e 4-player game |
| The Field Bean (V2) | 4–5 | Magpie | V2.x, simulations `v2-4`, `v2-5-magpie`, e2e 5-player game |
| AMIGO Bean Coin (V4) | 3–5 | nothing | V4.x, simulations `coin-3`, `coin-5`, e2e 4-player game |
| Magpie Bean (V5) | 3–5 | V1 or V2 | V5.x, simulation `magpie-4`, e2e 4-player game |
| The Duel | 2 only | — | always refused (R1.6) |

## V1 — Three New Bean Types

| Bean | Cards | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Coffee | 24 | 4 | 7 | 10 | 12 |
| Brandy (Wax) | 22 | 4 | 7 | 9 | 11 |
| Cocoa | 4 | – | 2 | 3 | 4 |

- **V1.1 Deck:** with three players, add Brandy and Coffee. With four or five players, add Cocoa and Brandy.
- **V1.2 Drawing:** in phase 4, instead of the active player drawing three, every player draws one card, starting with
  the active player and going left.
- **V1.3 End of game:** with three players, the game ends when the draw pile runs out the **second** time. With four
  or five players it ends on the third time, as in the base game.

## V2 — The Field Bean (4–5 players)

- **V2.1 Deck and drawing:** the deck is the base deck plus 3 Field Beans and 22 Brandy Beans. Each player has two
  fields. Phase 4 uses the V1 rule: everyone draws one card.
- **V2.2 Two Field Beans:** harvesting exactly two Field Beans pays no coins. Instead the player gains a permanent
  third bean field.
- **V2.3 Three Field Beans:** harvesting three Field Beans pays 3 coins. A player who already has a third field never
  gets a second extra one.
- **V2.4 One Field Bean:** harvesting a single Field Bean pays nothing.

## V4 — AMIGO Bean Coin

- **V4.1 Start:** the Bean Coin begins with the player to the right of the starting player.
- **V4.2 Claiming:** in their own turn, when no other decision is pending, the active player may claim the coin. Their
  fields must currently be worth at least 6 coins with three players, or 5 with four or five.
- **V4.3 Handing over:** the holder may simply hand the coin over.
- **V4.4 Resisting:**
  1. The claimant draws a random card from the holder's hand.
  2. The card is revealed to everyone, and the claimant must plant it at once, harvesting first if needed.
  3. The claimant takes the coin.
- **V4.5 A Blue Bean blocks the claim:** if the drawn card is a Blue Bean, the holder keeps the coin. The claimant
  still plants the Blue Bean and cannot claim again this turn (**V4.9:** the block resets next turn).
- **V4.6 Empty hand:** a holder with no cards cannot resist; the coin moves at once.
- **V4.7 Phase-4 draw:** the holder of the coin draws 4 cards. A player whose fields are worth less than 1 coin draws 2.
  Everyone else draws 3.
  - **Interpretation:** the "under 1 coin" check uses what all of the active player's fields would pay if harvested
    now (`fieldsValue`). When both conditions apply, the holder rule wins (4 cards).
- **V4.8 Scoring:** the Bean Coin is worth no points but wins ties.

**Why base game only.** The anniversary rules present the Bean Coin for the base deck. Its thresholds (6/5) and draw
counts assume the base draw rule, while V1/V2 replace the draw rule. Combining them would mean inventing rules, so
the combination is refused.

**Why not with the Magpie.** A resisted claim makes the claimant plant a random hand card. That card could be a
Magpie, which can never be planted, and neither rulebook says what happens then. Rather than improvise, this
combination is refused (see DECISIONS.md).

## V5 — Magpie Bean

- **V5.1 Deck:** six Magpie Beans are added to whichever deck is in use.
- **V5.2 Playing it:** a Magpie is never planted. When it is the front card in phase 1, it must be played instead of
  planted, and it counts as one of the phase's two cards.
- **V5.3 The steal:**
  1. The active player discards the Magpie.
  2. They may then steal the **top** bean of one field from each of up to two different other players.
  3. Each stolen bean is planted at once into one of the thief's own fields, harvesting first if needed.
- **V5.4 During and after the steal:**
  - While a steal is in progress, victims cannot harvest to dodge it.
  - The thief may stop early ("Stop stealing").
- **V5.5 Nothing to steal:** if no other player has a bean in a field, the Magpie is simply discarded.
- **V5.6 Magpies from trading:** a Magpie received or kept in phase 2 cannot be planted. In phase 3 it goes to the back
  of the hand instead. **Interpretation:** this is the only placement that keeps hand order intact and leaves the card
  playable.
