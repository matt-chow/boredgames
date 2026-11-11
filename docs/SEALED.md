# Sealed Correspondence

A deduction card game for 2 to 6 players at a Renaissance court. Each player holds one sealed letter, a member of the
court, and tries to stay in the round or to hold the highest card when the deck runs out. The character names, card
text, art and interface are original to this project.

This file gives every rule an ID and records how each unclear case was decided. Tests in `tests/sealed` are named with
these IDs. The rules live in `src/games/sealed/rules`; the card registry is `cards.ts`. The screens live in
`src/games/sealed/ui`.

## Rulesets (SC-DECK\*, SC-SET6)

The host chooses a ruleset in the lobby. It is fixed once the game starts.

| Value | Character | Ability | Classic | Expanded |
|---|---|---|---|---|
| 9 | Heir | Out if played or discarded | 1 | 1 |
| 8 | Dowager | Must be played beside the Ambassador or Magistrate | 1 | 1 |
| 7 | Ambassador | Trade hands with another player | 1 | 1 |
| 6 | Archivist | Draw two, keep one, file the rest under the deck | 0 | 2 |
| 5 | Magistrate | A player (you may choose yourself) discards and draws | 2 | 2 |
| 4 | Confessor | Nobody can choose you until your next turn | 2 | 2 |
| 3 | Duelist | Compare cards in secret; the lower is out | 2 | 2 |
| 2 | Scribe | Look at a player's card | 2 | 2 |
| 1 | Censor | Name a non-Censor character; if the player holds it, they are out | 5 | 6 |
| 0 | Informant | A favor at round end if you alone, still in, played or discarded one | 0 | 2 |
| | **Total** | | **16** | **21** |

- **SC-DECK1/2.** Classic is exactly 16 cards and Expanded is exactly 21. Every card has a stable id, separate from
  its character.
- **SC-DECK3.** Values run from 9 down to 0. Each value is one character.
- **SC-SET6.** Classic is for 2–4 players and Expanded for 2–6. The game never switches rulesets on its own. A lobby
  with 5 or 6 players on Classic cannot start. The host sees "switch to the Expanded ruleset" and a button that does
  it. Once the game starts the ruleset is locked.
- **SC-SET7.** Settings are checked at the trust boundary. An unknown ruleset, a target outside 0–15 (0 means the
  recommended target) or a timer other than off/15/30/45/60 is refused with a message, and the setting stays as it was.

## Setup and turns (SC-SET\*, SC-TURN\*)

- **SC-SET1–4.** Every round, the server shuffles the deck. It sets aside 1 card face down, the reserve. With 2 players
  it also turns 3 cards face up for all to see. Each player is dealt 1 card. The opener then draws.
- **SC-TURN1.** The first round's opener is drawn by lot from the room's seed.
- **SC-TURN2.** Only the current player acts. Every action carries the turn number its sender saw, and an action for a
  different turn is refused as stale.
- **SC-TURN3.** *Interpretation:* between rounds the table shows the round's result. The next opener, the round's
  winner, starts the next round with "Deal". If several players won, the opener is one of them drawn by lot. Nobody
  else can deal. This gives everyone time to see the showdown. It needs no clock.
- **Interpretation (draw).** A player draws automatically when their turn begins, so there is no separate draw
  action. A player who is out is skipped.

## Choosing players (SC-TGT\*, SC-CON\*)

- **SC-TGT1.** A player under the Confessor's protection cannot be chosen by anyone else.
- **SC-TGT2.** A player who is out cannot be chosen.
- **SC-TGT3.** The Ambassador, Duelist, Scribe and Censor choose another player. If no other player can be chosen, the
  card is still played. It takes no target and has no effect, and the log says so.
- **SC-CON2.** Protection starts when the Confessor is played. It ends when its owner's next turn begins, or when the
  round ends.

## Cards (SC-HEIR1 … SC-INF3)

- **SC-HEIR1.** Playing the Heir puts its owner out. So does discarding it for any reason: to the Magistrate, or when
  put out. The other card in hand is shown, as for anyone who goes out.
- **SC-DOW1.** A player holding the Dowager with the Ambassador or the Magistrate must play the Dowager. The server
  refuses the other card.
- **SC-DOW2.** The Dowager may be played at any time. The log and every view only say that it was played, never
  whether it was forced.
- **SC-AMB1.** The Ambassador's owner and the chosen player trade their remaining cards. Each of the two learns their
  new card privately.
- **SC-ARC1/2 (Expanded).** The Archivist's owner draws two cards (fewer if the deck is short). They keep one card from
  their whole hand and put the rest under the deck in the order they choose, top to bottom. *Interpretation:* the
  order is secret. The log only says how many cards were filed.
- **SC-ARC3.** With one card left in the deck the Archivist draws one. With none it does nothing.
- **SC-ARC4.** The Dowager rule does not apply to the Archivist's keep.
- **SC-MAG1/2.** The Magistrate may choose its own owner, even when the owner is protected. If no other player can be
  chosen, it must choose its owner.
- **SC-MAG3.** The chosen player discards their card and draws a new one. If the deck is empty they take the reserve
  card instead.
- **SC-MAG4.** A discarded card has no effect, except the Heir (SC-HEIR1). It is placed face up in its owner's played
  cards and marked as discarded.
- **SC-DUE1/2.** The Duelist's owner and the chosen player compare cards privately. The lower card's holder is out,
  and that card is shown. On a tie nothing happens and nothing is shown. Only the two of them see both cards.
- **SC-SCR1.** The Scribe shows the chosen player's card to the Scribe's owner only.
- **SC-CEN1.** The Censor names any character except the Censor. If the chosen player holds it they are out.
  Otherwise nothing happens. *Interpretation:* in Classic, naming the Archivist or Informant is allowed. Nobody can hold
  them, so the guess always misses. The screen only offers the characters in the ruleset.
- **SC-CEN2.** The Informant can be named.
- **SC-INF1 (Expanded).** At the end of a round, if exactly one player still in played or discarded an Informant this
  round, they gain one favor. This favor is in addition to any round win.
- **SC-INF2.** If two or more players still in did so, nobody gets the Informant's favor. An Informant played by a
  player who later went out does not count.
- **SC-INF3.** An Informant discarded to the Magistrate counts as discarded.

## Rounds and winning (SC-END\*, SC-WIN\*)

- **SC-END1.** When only one player is still in, they win the round and gain a favor. There is no showdown.
- **SC-END2.** When a turn ends with the deck empty, every player still in shows their card. Everyone tied for the
  highest card gains a favor. The reserve card is turned face up when any round ends.
- **SC-WIN1.** Default targets by player count are 2→6, 3→5, 4→4, 5→3 and 6→3. The host may set any target from 1
  to 15 instead.
- **SC-WIN2.** The game ends as soon as anyone reaches the target. Everyone who reaches it in that round wins
  together. Below the target the next round is dealt.

## Table and network (SC-NET\*, SC-SEC1, SC-CHAT1)

- **SC-NET1.** Every action has a message id. A retried action counts once. An action for a turn that has passed is
  refused.
- **SC-NET2.** Malformed actions are refused with a code, never thrown.
- **SC-NET3.** If a player disconnects, their seat is held. Everyone sees a 90 second grace period. After it, the
  game stays paused until they return. There are no bots, and nobody plays for an absent player.
- **SC-NET4/5.** `apply` never mutates its input, and nothing is undoable.
- **SC-NET6.** Any player may end an abandoned game from the menu by quitting. It ends for everyone with no winner.
- **SC-TIME1.** The optional turn timer (15/30/45/60 s, off by default) only warns. When time runs out, the current
  player's status shows "Over time" and a soft tone plays. Nothing is ever played automatically.
- **SC-SEC1.** Each view is built by `project(state, seat)`. It carries:
  - the viewer's own hand;
  - what the viewer has privately learned (Scribe peeks, duels, trades);
  - public facts.

  Nobody else's hand, the deck order or the reserve leaves the server before the round ends. History rows and stored
  actions hold only the action type: no cards, targets, guesses or chat.
- **SC-CHAT1.** Chat and reactions work in every phase and never change the turn.

## Randomness

The room seeds each game from `crypto.getRandomValues`. Shuffles then use the engine's seeded sfc32 generator, so tests
and simulations replay exactly. The generator's state is kept server-side and never appears in a view.
