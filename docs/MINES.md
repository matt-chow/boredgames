# Miners & Saboteurs

An original hidden-role tunnel-laying game for 2 to 10 players. The names, card text, art and interface are all original
to this project. This file gives every rule an ID and records how each unclear case was decided (the rules audit). IDs
name tests in `tests/mines`. The rules are in `src/games/mines/rules`, with the card registry in `cards.ts`, and the
screens are in `src/games/mines/ui`.

There are three modes. The host picks one in the lobby, and it is fixed once the game starts.

| Mode | Players | Deck | Hand | Roles |
|---|---|---|---|---|
| Classic Mining | 3–10 | 40 tunnels + 27 actions | 6 / 5 / 4 by count | miners and saboteurs, one more than players |
| Expanded Mining | 2–10 | classic + 30 tunnels + 21 actions = 118 | 6 | 15 roles |
| Prospector Duel | 2 | classic | 6 | none |

## Cards (MS-C-INV1, MS-X-INV1)

The registry in `cards.ts` is the single source for the rules, the encyclopedia, the guide and the art script. Counts:

- **Classic tunnels (40):**
  - cross 5, tee (vertical) 5, tee (horizontal) 5, straight (vertical) 4, straight (horizontal) 3, bend left 5, bend right 4
  - nine one-off dead ends
- **Classic actions (27):**
  - breaks: 3 of each tool
  - single-tool fixes: 2 of each tool
  - two-tool fixes: 1 of each pair
  - survey 6, cave-in 3
- **Expanded additions (51):**
  - gates: 6
  - ladders: 4
  - overpass 2, twin bends 2
  - crystal tunnels: 10
  - plain tunnels: 6
  - actions: 1 cave-in, 4 theft, 3 guard, 2 hand swap, 2 inspect, 2 role swap, 3 trap, 4 free
- **Gold (MS-C-GOLD1):** classic reward cards are 16 worth 1, 8 worth 2 and 4 worth 3. Expanded gold is whole tokens
  (MS-X-GOLD1).

## The mine (MS-GEO\*)

- **MS-GEO1/2.** Cards lie on a grid and can be laid either way up, never sideways. A half turn swaps each opening for
  the one opposite it.
- **MS-GEO3.** A laid tunnel must:
  - sit beside the mine
  - match every neighbour edge for edge
  - join the entrance through open tunnels
- **MS-GEO4.** A face-down destination puts no constraint on its neighbours.
- **MS-GEO5.** A joined tunnel that opens onto a destination turns it face up. Coal is turned to meet the tunnel.
  Reaching the gold ends the round.
- **MS-GEO6.** The two tunnels of an overpass never join.
- **MS-X-LAD1.** A ladder counts as joined to the entrance wherever it touches the mine, but never beside a destination.
- **MS-X-DOOR1.** A gate lets only its own crew through. To the other crew it is a wall.
- **MS-GEO7.** Tunnels are built inside the starting area: the 9 × 5 block from the entrance column to the
  destination column (x 0..8, y −2..2). A tunnel may go outside it only when none of the tunnel cards in the mover's
  hand fits anywhere inside it. All the other placement rules still apply out there. There is no direction rule:
  building west, back toward the entrance, is fine. The board draws the area's outline, and the hand bar says when
  the area is full for you.
- **Layout.** The entrance is at (0,0). The destinations are at (8,−2), (8,0) and (8,2). The board edge is fixed at
  x −9..17 and y −9..9. That edge is a shortcut, noted in the code.

## Turns (MS-TURN\*, MS-C-TURN1, MS-TIME\*)

- **MS-TURN1.** Who opens the first round is drawn by lot.
- **MS-TURN4.** Each later round opens with the player after whoever played last.
- **MS-TURN2.** On your turn you do one of three things: lay a tunnel, play an action, or discard. You then draw one
  card while the deck lasts.
- **MS-C-TURN1.** A pass discards exactly one card in Classic and the Duel, and one to three in Expanded.
- **MS-TURN3.** Once the deck is gone, a player with an empty hand is skipped. The round ends dry when every hand is
  empty.
- **MS-TIME1/2.** Once the turn timer runs out, any seat may end that turn. The turn ends with a pass of the first card
  in hand, which is not a strategic choice.

## Actions (MS-C-ACT\*, MS-C-TOOL1)

- **MS-C-ACT1, MS-C-TOOL1.**
  - A break targets another player, never the same tool twice on one player.
  - Anyone with a broken tool cannot lay tunnels.
- **MS-C-ACT2.** A fix mends one named tool on anyone, yourself included. A two-tool fix mends one of the two, and the
  player who plays it chooses which.
- **MS-C-ACT3.** A survey shows one face-down destination, to its player only.
- **MS-C-ACT4.** A cave-in removes any tunnel, never the entrance or a destination.

## Classic pay (MS-C-ROLE1, MS-C-HAND1, MS-C-DRAFT\*, MS-C-PAY\*)

- **MS-C-ROLE1.** The role pool holds one more card than there are players. The one left over stays hidden.
- **MS-C-ROLE2.** Every round deals at least one saboteur. If the shuffle seats none, one dealt role (chosen at
  random) trades places with a set-aside saboteur. The pool keeps its make-up, and the leftover stays hidden.

  | Players | Miners | Saboteurs |
  |---|---|---|
  | 3 | 3 | 1 |
  | 4 | 4 | 1 |
  | 5 | 4 | 2 |
  | 6 | 5 | 2 |
  | 7 | 5 | 3 |
  | 8 | 6 | 3 |
  | 9 | 7 | 3 |
  | 10 | 7 | 4 |

- **MS-C-HAND1.** Hands are 6 cards for 3–5 players, 5 for 6–7, and 4 for 8–10.
- **MS-C-DRAFT1.** When the gold is reached, as many reward cards as players are drawn (at most 9). The finder picks
  first. The rest then go to miners only, against the turn order.
- **MS-C-DRAFT2.** A saboteur who opens the gold passes the first pick to the next miner.
- **MS-C-PAY2.** In a dry round, each saboteur dealt is paid by how many were dealt: 1 → 4, 2 or 3 → 3 each, 4 → 2 each.
- **MS-C-PAY3.** If no saboteur was dealt, nobody is paid for a dry round.

## Expanded (MS-X-\*)

**Set-up**

- **MS-X-SETUP1.** Each round, 10 cards are set aside unseen and every player is dealt 6.
- **MS-X-ROLE1.** Roles are dealt from 15: green 4, blue 4, saboteur 3, foreman 1, opportunist 1, seeker 2.
- **MS-X-ROLE2.** The deal seats at least one saboteur, as MS-C-ROLE2. This is the deal only: a role swap later in
  the round may leave the table with none.

**Who wins**

- **MS-X-WIN1/2.** When the gold is reached:
  - A crew finder whose own route is open wins for its crew.
  - If only the other crew's route is open, that crew wins instead.
- **MS-X-WIN3.** A neutral finder lets every crew with an open route win. A route that crosses both colours lets only
  the opportunist win.
- **The foreman** wins with any crew. **The opportunist** wins with whoever wins.
- **MS-X-WIN4.** A dry round pays the saboteurs and the opportunist, if they are not locked in.

**Pay**

- **MS-X-PAY1.** Each winner is paid by how many won: 1 → 5, 2 → 4, 3 → 3, 4 → 2, 5 or more → 1. The foreman gets
  1 less and the opportunist 2 less.
- **MS-X-SEEK1.** The seekers split the crystals showing, rounded down, whoever wins the round.

**Actions**

- **MS-X-TRAP1.** A locked-in player cannot dig and is paid nothing. A rope frees them.
- **MS-X-SWAP1.** Swapping hands trades whole hands. The other player then draws one card. The player who played the
  swap does not.
- **MS-X-INSP1/HAT1.** An inspect result is a lasting private record, marked with its round. A role swap gives a new
  role from the roles nobody was dealt.
- **MS-X-THEFT2.** Each player may have one Pickpocket in front of them. A Strongbox removes one. Discarding two cards
  clears a card in front of you.
- **MS-X-THEFT1.** At payout, the last Pickpocket laid steals first, then the others in turn order. A thief with nobody
  to rob steals nothing.

## Duel (MS-D-\*)

- **MS-D-SETUP1.** There are no roles. Each player gets 6 cards from the classic deck.
- **MS-D-PAY1.** The finder gets 3 and the other player 1. A dry round pays nobody.

## Game end and the room (MS-END\*, MS-ROOM\*, MS-AWAY1, MS-SEC\*, MS-CFG1)

**Game end**

- **MS-END1.** The game lasts the chosen 1, 3, 5 or 10 rounds. Ties share first place.
- **MS-END2.** A gold target of 10, 15, 20 or 30 ends the game only after a whole round.

**Settings**

- **MS-CFG1, MS-ROOM1.** Each mode has its own player range, and only the listed settings are accepted. Settings lock
  when the game starts.

**Connections and timing**

- **MS-ROOM2/3, MS-SEC1.**
  - A retried message counts once.
  - A move for a turn already gone by is refused.
  - Chat never makes a move stale.
- **MS-ROOM4, MS-AWAY1.** After the 60-second grace period, a stand-in takes the seat. Under "pause" it waits; under
  "autopass" it discards. When the player returns, the seat is theirs again.
- **MS-ROOM5.** Anyone can call the turn timer once it runs out.

**Hidden information**

- **MS-ROOM7.** History rows and action records hold no card, square, target or chat.
- **MS-ROOM8, MS-SEC2.**
  - A view carries only your own hand and role.
  - Card ids follow shuffled order, so they say nothing about the card.
  - Unreached destinations stay hidden, even after the round.

## Presentation (MS-LOG*, MS-FX*)

The table is animated only from confirmed public lines. The client never guesses.

- **MS-LOG1.** Log lines and chat share one rising id, and each line carries the server's time. Every move ends with a
  public draw line: how many cards the mover drew (a count, never the card) and whose turn it is now.
- **MS-LOG2.** A saved game from before ids (state version 1) gets ids on its log lines, numbered after its chat.
- **MS-FX1.** A view presents only lines with an id above the last view's highest. A resent or reconnected view
  presents nothing twice, and a first view (a join, a reload) replays nothing. Chat is never a board event.
- **MS-FX2.** "Next" comes from public counts: the next seat in order, skipping empty hands once the deck is gone.
- **MS-FX3.** Presentation lines carry no hand, card list, role or deck order.
- **MS-ATTR1.** Tap or click a card on the board to see its picture, its text and who laid it. The entrance and
  turned destinations say "Setup card". The seat is public (the log names it too), stored with the card, and
  survives reloads, role changes and the board view switch.
- **MS-ATTR2.** Every player in the room sees the same maker for a card, before and after the room reloads.

**How lines become effects** (`ui/events.ts` picks them, `ui/fx.ts` draws them, `ui/Table.svelte` sequences them):

| Line | On the table |
|---|---|
| Laid a tunnel | Your card flies from your hand; an opponent's flies face-down from their fan and turns face up as it lands. Dust and chips when it settles (about 460 ms of flight) |
| Action on a player | The card flies to their avatar. A break shakes it with sparks; a repair, freeing or guard swells it with a warm glow |
| Cave-in | The tunnel shakes, falls away with rocks and dust, and the board shakes (about 800 ms) |
| Survey | The card flies to the destination, which swells; only the surveyor sees the face, in their own panel |
| Discard or clear | Face-down cards fly to the discard pile |
| Draw | Card backs fly from the deck to the hand or fan, staggered |
| Reveal | The destination turns over (about 900 ms): a gold shimmer, or a quiet coal puff |
| Round, pick, theft | A note by the place or avatar |

- Notes are short bubbles by the place or the avatar: at most three, gone after 2.8 s, stacked so they never overlap.
- More than eight new lines at once (a reconnect after a long gap) shows notes only, with no replay.
- Any new view, any press, or Escape lands every animation at once. Animations never block a move.
- Fast animations (a setting) and low-performance mode shorten everything to about half. Reduced motion turns it off.
- Sounds are synthesized with Web Audio (no files). They start only after a gesture and follow the master mute.
  Ambience is off by default. The mine's sound settings live in the browser (`mines.prefs`).

## Rules audit: decisions on unclear cases

The modes are specified in the project brief. Where the brief is silent, the interpretation below was chosen and
tested. Nothing was added that the brief does not imply.

| Case | Decision | Test |
|---|---|---|
| How many cards a Classic pass discards | Exactly one. Discarding several is an Expanded rule. | MS-C-TURN1 |
| Discarding two cards to clear a card in front of you | Expanded only | MS-X-THEFT2 |
| A destination is reached while other neighbours do not match it | The destination is placed turned to meet the tunnel that reached it. Other neighbours are ignored. | MS-GEO5 |
| Unreached destinations at round end | They stay face down and are never sent to clients. | MS-ROOM8 |
| Classic dry round with no saboteur dealt | Nobody is paid. Since MS-C-ROLE2 a deal always seats a saboteur, so this only covers staged games. | MS-C-PAY3 |
| A round deals no saboteur | One dealt role trades places with a set-aside saboteur, at random | MS-C-ROLE2, MS-X-ROLE2 |
| Placing outside the starting area | Allowed only when no tunnel card in hand fits inside. Action cards don't count. | MS-GEO7 |
| Classic reward cards run out in a long game | A fresh set is shuffled in. This is a shortcut, noted in the code. | — |
| Who opens later rounds, in every mode including the Duel | The player after whoever played last | MS-TURN4 |
| A thief with nobody to rob | Steals nothing, and play goes on. | MS-X-THEFT1 |
| A Pickpocket held by a locked-in player | Does nothing | MS-X-THEFT1 |
| An inspect result after a role swap | Kept, marked with its round and "may have changed" | MS-X-INSP1/HAT1 |
| A timed-out turn | A pass of the first card in hand. Never a tunnel or an action. | MS-TIME1/2 |
| Expanded crystal pay with one seeker locked in | The share is computed over the seekers dealt. The locked-in seeker's share is lost. | MS-X-SEEK1 |

Balance is in [MINES_BALANCE.md](MINES_BALANCE.md).
