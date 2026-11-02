# Bohnanza rules as implemented

**Sources.**

- **Base game:** the Rio Grande Games rulebook, v5.0 (2017 relaunch), is authoritative.
- **Variants and the anniversary bean types:** the AMIGO 25th-anniversary rulebook is authoritative
  (see [VARIANTS.md](VARIANTS.md)).

Rule IDs (R1.1, R4.6, …) are the names of tests in `tests/bohnanza/base-rules.test.ts`, so every rule here traces to
at least one test. Lines marked **Interpretation** cover a point the rulebook leaves open. Each records what we chose
and why. Tests cover their consequences.

The engine is `src/games/bohnanza/rules/engine.ts`. It is a pure reducer: `apply(state, seat, action)` either returns
a new state or rejects the action with a plain-language reason.

## 1. Setup (R1)

| Bean | Cards | 1 coin | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Blue | 20 | 4 | 6 | 8 | 10 |
| Chili | 18 | 3 | 6 | 8 | 9 |
| Stink | 16 | 3 | 5 | 7 | 8 |
| Green | 14 | 3 | 5 | 6 | 7 |
| Soy | 12 | 2 | 4 | 6 | 7 |
| Black-eyed | 10 | 2 | 4 | 5 | 6 |
| Red | 8 | 2 | 3 | 4 | 5 |
| Garden | 6 | – | 2 | 3 | – |

- **R1.1** The base deck is these 104 cards. Coffee, Wax, Cocoa, Field and Magpie are added only by variants.
- **R1.2** Three players get three bean fields each; four or five players get two.
- **R1.3** Each player is dealt five cards, one at a time, and each goes behind the last. The rest form the draw pile.
- **R1.4** The starting player is chosen at random from the room's seed. Play passes to the left (seat order).
- **R1.5** *(implementation)* Card IDs are assigned through an independent permutation, so an ID reveals nothing about
  a card's bean or deck position.
- **R1.6** Player counts other than 3–5 are refused. The Duel (a 2-player variant) is refused.

## 2. Hand order (R2)

- **R2.1** Drawn cards go to the back of the hand, in draw order. **Hand order is never changed by anyone**. The UI
  cannot reorder it, and the engine has no action that does.
- **R2.3** Only the front card may be planted from the hand. Phase 1 allows at most two plants.

## 3. Phase 1: planting (R3)

- **R3.1** A field holds one bean type. The same type may occupy two fields.
- **R3.2** Planting the first card is mandatory. Cards cannot be turned over until it is planted. The second plant is
  optional.
- **R3.3** If the front card fits no field, the player must harvest a field first (R7).
- **R3.4** A player with an empty hand skips phase 1.

## 4. Phase 2: turning over and trading (R4)

- **R4.1** The active player turns over the top two cards of the draw pile. They belong to the active player.
- **R4.2** Only the active player trades. Non-active players may trade or donate only with the active player, never with
  each other.
- **R4.3 / R4.5** The active player may offer either turned-over card and any hand card, from any position, and may ask
  for any beans in return.
- **R4.4** Cards received in a trade cannot be traded again. Cards in fields can never be traded.
- **R4.6** Cards move only when the recipient accepts and supplies exactly the requested bean types.
  - **Interpretation:** when the recipient holds more copies of a requested type than needed, the recipient chooses
    which copies to give. The choice decides which cards move up the hand.
- **R4.7** Donations, meaning cards given for nothing, also need the recipient's acceptance. Non-active players may
  donate only to the active player.
- **R4.8** Trading may go on after both turned-over cards have been traded or planted away. Only the active player
  ends trading.
- **R4.9** **Interpretation (digital negotiation):**
  - Several offers may be open at once.
  - A counteroffer closes the offer it answers.
  - Accepting an offer re-checks every card it involves. A card committed by one accepted trade can no longer satisfy
    any other open offer, which is pruned. Double spending is therefore impossible, including under concurrent
    accept / withdraw (see TESTING.md).
- Non-active players may ask for a specific turned-over card by ID, since those cards are public.
  **Interpretation:** they may ask for hand beans only by type, since hand cards are hidden.
- **Interpretation:** an open offer is public to the table, but hand cards in it are shown by bean type only.
- Trading is possible only in phase 2. An empty offer is refused.

## 5. Phase 3: planting traded and turned-over cards (R5)

- **R5.1** When trading ends:
  - Open offers are void.
  - The active player keeps any unused turned-over cards.
  - Every player then plants all their pending cards (kept and received), in any order, before the turn can continue.
  - Harvesting to make room is allowed at any time.

## 6. Phase 4: drawing (R6)

- **R6.1** The active player draws three cards to the back of the hand. Play then passes to the left.

## 7. Harvesting (R7)

- **R7.1** Any player may harvest any of their fields at any time, including during other players' turns. They need not
  be planting.
- **R7.2** A field pays coins according to the beanometer: the highest printed threshold reached.
- **R7.3** The coin cards are turned to the coin side and go to the player's treasury. The other cards go to the
  discard pile, and the field empties.
- **R7.4** **Bean protection:** a field holding a single bean cannot be harvested while another of the player's fields
  holds more than one.

## 8. Running out of cards (R8)

- **R8.1** When the last card of the draw pile is taken, the discard pile is shuffled to form a new draw pile.
- **R8.2** The game ends when the draw pile runs out for the **third** time.
  - **If this happens while turning over cards in phase 2:** trading and planting finish with the card(s) that could
    be turned over. The game then ends without a phase 4.
  - **If it happens while drawing in phase 4:** the game ends at once.
  - **Interpretation:** if a reshuffle finds an empty discard pile, that counts as the pile running out again.

## 9. End of game (R9)

- **R9.1** At the end, every field is harvested once more. Cards left in hands are worth nothing.
- **R9.2** The player with the most coins wins.
- **R9.3** Ties go to the tied player furthest clockwise from the starting player. Seat order counts as clockwise
  (to the left).

## 10. Undo (H3, server)

The rules decide undo, not the UI. Only `plant`, `plantPending` and `harvest` can be undone, by their author, before
anything else happens. Turning over cards, drawing, trading and every variant action reveal or exchange information, so
they can never be undone.

## Known source discrepancies

- **Wax / Brandy Bean.** The Rio Grande base rules do not include this card. Its count (22) and beanometer
  (4 / 7 / 9 / 11) come from the AMIGO anniversary rulebook. The German edition calls it the Brandy Bean
  (*Weinbrandbohne*); this hub displays "Brandy Bean". If a printed card in your edition differs, change
  `BEANS.wax.meter` in `rules/cards.ts`. The variant tests will show any consequence.
- **Hand size.** Neither rulebook caps the hand, so neither does the engine.
