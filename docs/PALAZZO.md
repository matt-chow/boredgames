# Palazzo

A hidden-influence bluffing game for 2 to 6 people at a Renaissance palazzo. Each player holds two hidden influence
cards and a purse of coins. On their turn a player takes one action, and may claim any role to do it, held or not.
Anyone may challenge a claim. The last player with influence wins. The title, roles, rules text, art and interface are
original to this project.

This file gives every rule an ID and records how each unclear case was decided. Tests in `tests/palazzo` are named with
these IDs. The rules live in `src/games/palazzo/rules` (`roles.ts` is the role and action registry, `engine.ts` the
reducer). The screens live in `src/games/palazzo/ui`.

## Setup (PZ-SET\*)

- **PZ-SET1.** The deck is 15 cards: three each of the Chancellor, Magistrate, Bravo, Envoy and Sentinel. Card ids are
  shuffled independently of roles, so an id says nothing about a card.
- **PZ-SET2.** Each player is dealt two hidden cards. The rest form the deck, which only the server sees.
- **PZ-SET3.** Everyone starts with 2 coins. In a two-player game the first player starts with 1.
- **PZ-SET4.** Optional two-player draft: each player is dealt three cards, keeps two and returns one. The returned
  cards are shuffled into the deck before the first turn. Returns are made at the same time, without a clock. The
  setting does nothing at three or more players.
- **PZ-SET5.** The first player is chosen at random. In a rematch the previous winner goes first if they are still
  seated, and otherwise the opener is chosen at random.
- **PZ-SET6.** The host sets the response timer (10, 15, 20 or 30 seconds, default 15), the disconnect policy (pause or
  continue, default pause) and the draft (default off). The server validates them, and they are locked once the game
  starts.

## Roles and actions (PZ-TURN\*, PZ-ACT\*, PZ-ROLE\*)

| Action | Claim | Cost | Effect | Blocked by |
|---|---|---|---|---|
| Income | — | 0 | +1 coin | — |
| Levy | — | 0 | +2 coins | Magistrate, claimed by any opponent |
| Depose | — | 7 | Target loses an influence | — |
| Collect | Chancellor | 0 | +3 coins | — |
| Seize | Magistrate | 0 | Take up to 2 coins from the target | Chancellor, claimed by the target |
| Strike | Bravo | 3 | Target loses an influence | Sentinel, claimed by the target |
| Parley | Envoy | 0 | +1 coin, draw 1, return 1 | — |
| Inspect | Sentinel | 0 | Privately see one of the target's two hidden cards | — |

- **PZ-TURN1.** Turns go round the table in seat order and skip players who are out.
- **PZ-TURN2.** A target must be another player who is still in.
- **PZ-TURN3.** The cost is paid when the action is declared.
- **PZ-ACT1.** Income cannot be challenged or blocked.
- **PZ-ACT2.** Levy cannot be challenged, since it claims no role. Any opponent may block it by claiming the
  Magistrate.
- **PZ-ACT3.** Depose cannot be challenged or blocked. A player who starts a turn with 10 or more coins must Depose.
- **PZ-ROLE1.** Collect, claiming the Chancellor: +3 coins.
- **PZ-ROLE2.** Seize, claiming the Magistrate: take up to 2 coins, as many as the target has. It is legal against a
  target with 0 coins. Only the target may block, by claiming the Chancellor.
- **PZ-ROLE3.** Strike, claiming the Bravo: pay 3, and the target loses an influence. Only the target may block, by
  claiming the Sentinel.
- **PZ-ROLE4.** Parley, claiming the Envoy (see PZ-PARL).
- **PZ-ROLE5.** Inspect, claiming the Sentinel (see PZ-SENT).

## Claims, windows and challenges (PZ-RESP\*, PZ-CHAL\*)

- **PZ-RESP1.** A role claim opens a challenge window for every other player still in.
- **PZ-RESP2.** A blockable action then opens a block window for the players allowed to block. Once someone blocks,
  a counter window lets every other player still in challenge the block. The actor may challenge it too.
- **PZ-RESP3.** A window closes early once everyone in it has passed. When its time runs out, everyone still to answer
  is counted as passing (PZ-TIME2).
- **PZ-RESP4.** You can only answer a window you are in, and only once.
- **PZ-CHAL1.** Blocks are claims and can be challenged. A true block stops the action and the challenger loses an
  influence. A false block costs the blocker an influence, and the action goes ahead.
- **PZ-CHAL2.** True claim: the challenger loses an influence. The claimant's proven card goes into the deck, the deck
  is shuffled, and the top card replaces it in the same hand position.
- **PZ-CHAL3.** False claim: the claimant loses an influence and the action fails.
- **PZ-CHAL4.** The first challenge counts. Any other answer to the same window is refused as stale.
- **PZ-CHAL5.** You cannot challenge your own claim, answer twice, or answer a window you are not in.

## Strike (PZ-STRK\*)

- **PZ-STRK1.** If the target challenges a true Strike and loses, they still get the block window.
- **PZ-STRK2.** A Strike exposed as a bluff fails and refunds its 3 coins. A failed action can't be blocked.
- **PZ-STRK3.** A blocked Strike keeps its 3 coins spent.
- **PZ-STRK4.** If the target is out before the Strike resolves, the Strike does nothing and the coins stay spent.
- **PZ-STRK5.** The target claims the Sentinel, the block is challenged, and it was a bluff. The target loses one
  influence for the bluff, and then another to the Strike.

## Parley (PZ-PARL\*)

- **PZ-PARL1.** Parley gives +1 coin and draws the top card for the actor alone.
- **PZ-PARL2.** The actor returns one card: the drawn card or one of their hidden cards. A returned hand card's place
  is taken by the drawn card, so the hand keeps its order. Revealed cards can't be returned. With one influence left
  the actor still keeps exactly one hidden card.
- **PZ-PARL3.** The deck is shuffled after the return. Nobody else learns which card went back. There is no clock on
  the choice (PZ-TIME3).

## Inspect (PZ-SENT\*)

- **PZ-SENT1.** Inspect needs a target with two hidden cards. When it resolves, the server picks one of the target's
  hidden cards at random.
- **PZ-SENT2.** Only the inspecting player learns the role. The public log records only who inspected whom.
- **PZ-SENT3.** What was seen is marked out of date as soon as any of the target's hidden cards change: a reveal, a
  replacement after a proven claim, or any Parley, even when the drawn card is the one returned. Out-of-date knowledge
  stays visible to its owner, struck through, but is never presented as confirmed.

## Losing influence and winning (PZ-LOSE\*, PZ-WIN0)

- **PZ-LOSE1.** A player who loses an influence chooses which hidden card to reveal. There is no clock and no default
  (PZ-TIME3).
- **PZ-LOSE2.** A player with one hidden card left reveals it automatically. Losses are dealt with in the order they
  arose, before anything else happens.
- **PZ-LOSE3.** Revealed cards stay face up for the rest of the game, in their hand position.
- **PZ-WIN0.** The last player with influence wins at once, even partway through an action. Results rank the winner
  first, then everyone else by how long they lasted. No stats or rankings are kept beyond the game.

## Spectators, chat and the log (PZ-SPEC\*, PZ-CHAT\*, PZ-LOG1)

- **PZ-SPEC1.** An eliminated player can't take game actions, their turns are skipped, and they lose any private
  Inspect knowledge. They see what any spectator sees: public information only.
- **PZ-SPEC2.** An eliminated player's chat and reactions reach only other eliminated players until the game ends,
  then everyone.
- **PZ-CHAT1.** Chat (300 characters at most) and reactions are open to every seat at any time, paused or not.
- **PZ-CHAT2.** Chat is never checked against the cards.
- **PZ-CHAT3.** The last 200 chat entries are kept.
- **PZ-LOG1.** The log is public and complete: declarations, challenges and whether they were true, blocks, coin
  moves, revealed roles, eliminations, timeouts, pauses and the win. It never holds a hidden card or the deck.

## Time and connections (PZ-TIME\*, PZ-NET\*)

- **PZ-TIME1.** Challenge, block and counter windows each stay open for the host's timer.
- **PZ-TIME2.** The server closes an expired window itself: the room's alarm wakes at the deadline (`wakeAt`) and runs
  the game's `tick`. No client message is needed.
- **PZ-TIME3.** Mandatory decisions have no clock: choosing an action, revealing a card, a Parley return and the draft.
  Nothing is ever chosen for anyone.
- **PZ-NET1.** Every game action names the decision step it answers. A stale or repeated answer is refused, and a
  retried message id is answered from the record without being applied twice.
- **PZ-NET2.** Policy **pause**: when a player still in loses connection, the table pauses at once and the open
  window's remaining time is stored. Only chat works while paused.
- **PZ-NET3.** When everyone is back, the window resumes with the time it had left, but never less than 5 seconds.
- **PZ-NET4.** Policy **continue**: windows keep running and count an absent player as passing on expiry. The table
  pauses only when the absent player must make a mandatory decision. An eliminated player never pauses the table.
- **PZ-NET5.** Only the seat whose decision it is may make it. The host has no extra power over play or cards. A room
  everyone has left closes after 10 minutes (`meta.graceMs`).
- **PZ-NET6.** Hidden information never leaves the server. Opponents' hidden cards, the deck and its order, the
  Parley draw and Inspect results are absent from every other seat's view, from spectators, the log, history rows,
  acks and errors. History rows hold only the action type. A projection test re-deals every card a viewer can't see
  and checks that their view doesn't change by a byte.
- **PZ-DECK1.** No card is ever created or lost: hands, the deck and a Parley draw always hold the same 15 cards.

## Interface (PZ-UI\*)

- **PZ-UI1.** The table renders only confirmed views. Card moves, banners and highlights use transform and opacity
  only, never delay or block an answer, and can be dismissed. The countdown is computed from the server's clock
  (`view.at` and the deadline), not the device's.
- **PZ-UI2.** Reduced motion (`settings.instant`) turns every animation off.
- **PZ-UI3.** The reference card (every action, claim, cost and block) is always one tap away. On a desk it can be
  pinned beside the chat. On a phone it opens as a sheet over the table. Opening it, or the full rules, never pauses
  the clock.
- **PZ-UI4.** Sound effects are synthesized and off by default.
- **PZ-UI5.** Explanations follow the context. A disabled action says why, the selected action shows its effect, and
  the table warns you when a claim or block you are about to make would be a bluff. That warning is computed on your
  own device from your own cards.

## Interpretations

These points were not fixed by the approved rules, so they record what was chosen.

1. Inspect picks its card when it resolves, among the target's hidden cards at that moment (PZ-SENT1).
2. Every targeted action does nothing if its target is out when it resolves: Seize, Strike, Depose and Inspect alike
   (PZ-STRK4).
3. A resumed window gets at least 5 seconds (PZ-NET3).
4. Mandatory decisions have no timer, because nothing may ever be chosen automatically (PZ-TIME3).
5. Under either policy, eliminated players never pause the game (PZ-NET4).
6. Eliminated players' chat is shown to everyone once the game is over (PZ-SPEC2).
7. Results rank players by elimination order (PZ-WIN0).
8. The actor may challenge a block of their own action, like any other player still in (PZ-RESP2).

**Known limitation.** A connection that drops silently, with no close frame, is noticed only when the server's next
presence check sees it. That can take up to about 100 seconds. Until then the table treats that player as connected.
