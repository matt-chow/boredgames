# Five-expansion manifest

**Status: design proposal for owner review. Nothing is implemented.** This file is the authoritative specification
for a later implementation. The implementation steps are in
[EXPANSION_IMPLEMENTATION_PLAN.md](EXPANSION_IMPLEMENTATION_PLAN.md), and the analysis is in
[EXPANSION_BALANCE_REVIEW.md](EXPANSION_BALANCE_REVIEW.md).

## Ground rules every card follows

- **Works without Crown Projects.** No card reads, discounts, surcharges or reacts to Crown Projects.
- **Only existing resources.** Coins, Buys, Actions, Influence and Renown (cards and tokens), using the existing types:
  Action, Attack, Reaction, Establishment, Currency and Renown.
- **None of the excluded mechanics.** No new currency, phase, supply type, persistent status, extra turn or Debt.
- **No Royal Debt.** No new card gives it, so the `RUST_MAKERS` list is unchanged.
- **Unchanged structure.** The 10-pile market, the game-end rules, the Influence cap of 8 and the conversion of at
  most 2 Coins per turn all stay as they are.
- **Bounded effects.** Every repeat or loop is limited by cards in hand, Actions or Influence. Nothing grants an
  extra turn or replays without limit.
- **Rules text in house style.** "+1 Action. Gain 1 Influence." Influence is *gained*, *spent* or *lost*; Renown
  from a token is written "+1 Renown".
- **Stable keys.** Keys are new snake_case names. No existing key, name or rule changes.
- **Engine notes.** "Engine" lists the existing ops a card needs. **NEW** marks anything the engine cannot express
  today, and **VERIFY** marks behaviour to confirm before implementing.

### Proposed sets

| Set key | Name | Cards | Identity |
|---|---|---|---|
| `republics` | The Merchant Republics | 14 | Currency economy, +Buy, Currency cost cuts, deals with an opponent |
| `houses` | Houses of Influence | 13 | Politics: opponent-chosen outcomes, Influence sinks, measured attacks and reactions |
| `masters` | Masters & Apprentices | 15 | Action chains, playing twice, upgrades, thinning, draw |
| `ports` | Ports & Provinces | 14 | Trading, gaining, discard and deck manipulation, ordinary Establishments, flexible buying |
| `glory` | Glory of the Realm | 13 | Renown, Homestead play, alternative scoring, endgame timing |
| | **Total** | **69** | |

## Card index

| # | Key | Name | Set | Type | Cost |
|---|---|---|---|---|---|
| A1 | `coin_clipper` | Coin Clipper | republics | Action | 2 |
| A2 | `promissory_note` | Promissory Note | republics | Currency | 2 |
| A3 | `florin_table` | Florin Table | republics | Action | 3 |
| A4 | `fondaco` | Fondaco | republics | Action | 3 |
| A5 | `underwriter` | Underwriter | republics | Action · Reaction | 3 |
| A6 | `lending_house` | Lending House | republics | Action | 3 |
| A7 | `wholesaler` | Wholesaler | republics | Action | 4 |
| A8 | `bookkeeper` | Bookkeeper | republics | Action | 4 |
| A9 | `partnership` | Partnership | republics | Action | 4 |
| A10 | `gilder` | Gilder | republics | Action | 5 |
| A11 | `ledger_hall` | Ledger Hall | republics | Renown | 5 |
| A12 | `compound_interest` | Compound Interest | republics | Establishment | 5 |
| A13 | `bourse` | Bourse | republics | Action | 5 |
| A14 | `gold_florin` | Gold Florin | republics | Currency | 6 |
| B1 | `household_guard` | Household Guard | houses | Action · Reaction | 2 |
| B2 | `antechamber` | Antechamber | houses | Action | 3 |
| B3 | `bribed_magistrate` | Bribed Magistrate | houses | Action · Attack | 3 |
| B4 | `counter_intrigue` | Counter-Intrigue | houses | Action · Reaction | 3 |
| B5 | `whispered_promise` | Whispered Promise | houses | Establishment | 3 |
| B6 | `signoria` | Signoria | houses | Action | 4 |
| B7 | `hollow_title` | Hollow Title | houses | Action · Attack | 4 |
| B8 | `purchased_office` | Purchased Office | houses | Action | 4 |
| B9 | `court_purge` | Court Purge | houses | Action | 4 |
| B10 | `family_crest` | Family Crest | houses | Renown | 4 |
| B11 | `marriage_pact` | Marriage Pact | houses | Action · Renown | 5 |
| B12 | `majordomo` | Majordomo | houses | Action | 5 |
| B13 | `palace_intrigue` | Palace Intrigue | houses | Action | 6 |
| C1 | `sweeper` | Sweeper | masters | Action | 2 |
| C2 | `sketchbook` | Sketchbook | masters | Action | 2 |
| C3 | `bottega` | Bottega | masters | Action | 3 |
| C4 | `guild_diploma` | Guild Diploma | masters | Action · Renown | 3 |
| C5 | `woodcarver` | Woodcarver | masters | Action | 3 |
| C6 | `promotion` | Promotion | masters | Action | 4 |
| C7 | `masters_hand` | Master's Hand | masters | Action | 4 |
| C8 | `open_studio` | Open Studio | masters | Action | 4 |
| C9 | `study_hall` | Study Hall | masters | Action | 4 |
| C10 | `patternmaker` | Patternmaker | masters | Action | 4 |
| C11 | `atelier` | Atelier | masters | Action | 4 |
| C12 | `schoolroom` | Schoolroom | masters | Action | 4 |
| C13 | `lecture_hall` | Lecture Hall | masters | Action | 5 |
| C14 | `masters_fee` | Master's Fee | masters | Action | 5 |
| C15 | `maestro` | Maestro | masters | Action | 6 |
| D1 | `harbour_pilot` | Harbour Pilot | ports | Establishment | 2 |
| D2 | `dockhand` | Dockhand | ports | Action | 2 |
| D3 | `barter_post` | Barter Post | ports | Action | 3 |
| D4 | `quayside_sale` | Quayside Sale | ports | Action | 3 |
| D5 | `ferry_landing` | Ferry Landing | ports | Establishment | 3 |
| D6 | `chandler` | Chandler | ports | Action | 4 |
| D7 | `bonded_store` | Bonded Store | ports | Establishment | 4 |
| D8 | `trade_agreement` | Trade Agreement | ports | Action | 4 |
| D9 | `cargo_manifest` | Cargo Manifest | ports | Action | 4 |
| D10 | `grain_hoy` | Grain Hoy | ports | Establishment | 5 |
| D11 | `hiring_day` | Hiring Day | ports | Action | 5 |
| D12 | `customs_cutter` | Customs Cutter | ports | Action · Attack | 5 |
| D13 | `landing_rights` | Landing Rights | ports | Action | 5 |
| D14 | `galleass` | Galleass | ports | Establishment | 6 |
| E1 | `tenant_farmer` | Tenant Farmer | glory | Action | 2 |
| E2 | `manor_court` | Manor Court | glory | Action | 3 |
| E3 | `votive_offering` | Votive Offering | glory | Action | 3 |
| E4 | `banner_bearer` | Banner Bearer | glory | Action | 3 |
| E5 | `laurel_wreath` | Laurel Wreath | glory | Currency | 4 |
| E6 | `land_grant` | Land Grant | glory | Action | 4 |
| E7 | `grand_muster` | Grand Muster | glory | Action | 4 |
| E8 | `memorial_statue` | Memorial Statue | glory | Renown | 4 |
| E9 | `point_of_honour` | Point of Honour | glory | Action · Attack | 4 |
| E10 | `honour_guard` | Honour Guard | glory | Action · Reaction | 4 |
| E11 | `victory_parade` | Victory Parade | glory | Action | 5 |
| E12 | `chivalric_order` | Chivalric Order | glory | Renown | 5 |
| E13 | `royal_jubilee` | Royal Jubilee | glory | Action | 6 |

---

## A. The Merchant Republics (`republics`)

The city-states of bankers and traders. The set gives Money and Currency-heavy decks real tools: Currency cost cuts,
Currency-to-hand gainers, a Currency-counting Renown card and Buys. It generates **no** Influence. Its one Influence
card is a sink. Merchant interaction is cooperative and competitive at once: deals where an opponent picks who
benefits, and a reaction to an opponent's expensive buy.

### A1 · Coin Clipper

`coin_clipper` · Action · cost 2 · complexity **low**

- **Effect:** +1 Action. You may trash a Bronze from your hand. If you do, +1 Coin and +1 Buy.
- **Timing:** Action phase. Optional. Only Bronze qualifies.
- **Purpose:** Thins Bronze without losing tempo, because the Coin the Bronze would have made is refunded. It gives
  Money and Currency decks a thinning option that does not depend on Influence.
- **Dominion reference:** Moneylender (Base), partial. It is terminal and trashes Copper for a Coin surplus.
- **Closest K&C:** Royal Tax Collector (terminal, any Currency, gives Influence) and Burden Relief (non-Currency cards
  only).
- **How it differs:** It is non-terminal, only takes Bronze, and adds a Buy instead of Influence or a surplus.
- **Engine:** existing. `actions`, `choose-cards` (hand, filter key `scrap`, 0–1), `if has`, `move` to trash,
  `coins`, `buys`.
- **Balance:** Low power, a good opener. Fewer Bronzes slightly weakens Ledger Hall, which is an intended tension.
- **Strategic note:** Opening with Coin Clipper and Silver means trashing Bronze through the first shuffles.

### A2 · Promissory Note

`promissory_note` · Currency · cost 2 · complexity **low**

- **Effect:** +1 Coin. +1 Buy. You may trash this card. If you do, +2 Coins.
- **Timing:** Buy phase, when played.
- **Purpose:** A choice of a cheap Currency with a Buy, or a one-time burst of 3 Coins to reach a key 5 or 6 early.
- **Dominion reference:** one-shot Treasure family (Prosperity, Dark Ages), shared.
- **Closest K&C:** Bronze, and Favour Purse (+1 Coin and Influence).
- **How it differs:** It carries a Buy and can be cashed in once. No K&C card trashes itself for value.
- **Engine:** existing. A Currency with `effects`: `buys`, `may` then `move` source to trash and `coins 2`.
  **VERIFY** that a Currency in play can move `source` to the trash.
- **Balance:** Bounded by being single-use. It triggers Reclamation Guild (+1 Coin per trash), which is fine.

### A3 · Florin Table

`florin_table` · Action · cost 3 · complexity **low**

- **Effect:** +1 Action. +1 Buy. You may discard a Currency card from your hand. If you do, +2 Coins.
- **Timing:** Action phase. The discarded Currency is not played.
- **Purpose:** Non-terminal economy. Bronze becomes worth 2, Silver stays level and Gold loses 1. Each play is a
  real choice about which Currency to give up.
- **Dominion reference:** Baron (Intrigue), partial. It discards a specific card type for Coins.
- **Closest K&C:** Favour Broker (discards 2 cards for Influence) and Tally Clerk (+Action, +Buy).
- **How it differs:** It discards Currency, pays Coins rather than Influence, and has no terminal penalty or gain.
- **Engine:** existing. `choose-cards` (hand, filter `treasure`, 0–1), `move` to discard, `if has`, `coins`.
- **Balance:** At best it works like +1 Action, +1 Buy, +1 Coin at cost 3. That is modest.

### A4 · Fondaco

`fondaco` · Action · cost 3 · complexity **low**

- **Effect:** Draw 1. +2 Actions. If you have a Currency costing 3 or more in your hand, +1 Buy.
- **Timing:** The check happens after the draw.
- **Purpose:** The set's village. It rewards a deck that has bought Silver or better.
- **Dominion reference:** Village (Base) and Worker's Village (Prosperity), partial.
- **Closest K&C:** Morning Bell (village with an Influence rider) and Antechamber (B2).
- **How it differs:** Its rider is a conditional Buy, not Influence or extra draw.
- **Engine:** existing. `draw`, `actions`, `if inHand { type: treasure, minCost: 3 }`, `buys`.
- **Balance:** Neutral. A village that gives no Influence slightly favours non-Influence engines.

### A5 · Underwriter

`underwriter` · Action · Reaction · cost 3 · complexity **medium**

- **Effect:** +1 Action. +1 Coin. When another player buys a card costing 6 or more, you may reveal this from your
  hand to gain a Silver.
- **Timing:** The reaction happens during another player's turn, straight after their buy, using the cost they paid.
  It does not react to Attacks.
- **Purpose:** A merchant hedge. Big buys by rivals feed your economy, which acts as a mild catch-up at the end.
- **Dominion reference:** Fool's Gold (Hinterlands), partial. That card reacts to an opponent gaining a Province.
- **Closest K&C:** Bellman (reacts to others completing Projects) and Royal Runner (reveals for Influence).
- **How it differs:** It is triggered by a rival's purchase, rewards Silver, and has no Project or Attack link.
- **Engine:** existing. A card trigger `{ on: 'buy', where: 'hand', scope: 'others', optional }`, then
  `if gte [costOf event, 6]`, then `gain cog`. The typeLine is "Action · Reaction". **VERIFY** that the `reaction`
  type does not make the attack-reaction prompt offer it, because it has no `reaction` field.
- **Balance:** At 6 players with several copies in hand, the Silver pile could run low. This has a small effect on
  the end of the game because basic piles count toward `emptyPiles` but not toward the three-pile ending.

### A6 · Lending House

`lending_house` · Action · cost 3 · complexity **low**

- **Effect:** +1 Buy. +1 Coin. You may put a Currency card from your hand on top of your deck. If you do, +2 Coins.
- **Timing:** Action phase.
- **Purpose:** Turns a Currency into Coins now and a known card next turn. Topping a Gold costs 1 Coin now to
  guarantee it next turn; topping a Bronze gains 1 Coin but clogs the next hand.
- **Dominion reference:** no clear equivalent. It shares the topdecking mechanic with several cards.
- **Closest K&C:** Florin Table (A3) and Keeper of the Rolls (topdecks).
- **How it differs:** It is terminal and puts the card on the deck instead of discarding it, which links this turn
  and the next.
- **Engine:** existing. `choose-cards` (hand, `treasure`, 0–1), `move` to deck, `if has`, `coins`.
- **Balance:** Low. It overlaps in feel with Florin Table, but the decision is different. If the set gets cut, this
  card goes first.

### A7 · Wholesaler

`wholesaler` · Action · cost 4 · complexity **low**

- **Effect:** +1 Action. +1 Buy. This turn, Currency cards cost 1 Coin less, but not less than 0.
- **Timing:** Lasts until cleanup. Copies stack.
- **Purpose:** The first `cost-mod` card in the game. It lets a Money deck turn spare Buys into Silver at 2 and Gold
  at 5.
- **Dominion reference:** Bridge (Intrigue), partial. That card is terminal, gives a Coin, and reduces every card.
- **Closest K&C:** Surveyor, which reduces Projects only.
- **How it differs:** It is non-terminal, gives no Coins and only reduces Currency, so Renown and Kingdom cards are
  unaffected.
- **Engine:** existing. `actions`, `buys`, `cost-mod { delta: -1, filter: { type: 'treasure' } }`. The cost floor of
  0 is already in `costOf`.
- **Balance:** Two copies in play make Gold cost 4. It cannot reduce Renown or Projects, so it does not speed up the
  end of the game. It helps Money, which underperforms.

### A8 · Bookkeeper

`bookkeeper` · Action · cost 4 · complexity **low**

- **Effect:** Reveal the top 4 cards of your deck. Put the Currency cards among them into your hand and discard the
  rest.
- **Timing:** Action phase. The reveal is public.
- **Purpose:** Draw that scales with Currency density. It is strong in Money decks and weak in Action engines.
- **Dominion reference:** Adventurer (Base, first edition), partial. That card reveals until 2 Treasures.
- **Closest K&C:** Hall of Archives (reveals until 1 card of a chosen type).
- **How it differs:** It uses a fixed window of 4, takes all the Currencies and discards everything else.
- **Engine:** existing. `reveal 4 as r`, `select { var: r } filter treasure as t`, `move t` to hand, `move { rest: r }`
  to discard. **VERIFY** that `rest` excludes cards already moved by `select`.
- **Balance:** In a deck that is 60% Currency it averages about 2.4 cards. It can discard Actions, which is a cost for
  engines.

### A9 · Partnership

`partnership` · Action · cost 4 · complexity **medium**

- **Effect:** +1 Buy. Choose an opponent. They choose one: they gain a Silver and you get +3 Coins; or you gain a
  Silver and get +1 Coin.
- **Timing:** The chosen opponent decides immediately.
- **Purpose:** A merchant deal. The opponent weighs helping you now (+3 Coins) against letting you build (Silver).
  Thin engines refuse Silvers; Money decks welcome them.
- **Dominion reference:** no clear equivalent. It shares the "opponent chooses your benefit" mechanic.
- **Closest K&C:** Licensing Hall (the opponent chooses whether to discard) and Alms House (an opponent benefits).
- **How it differs:** The choice moves a basic card into one deck or the other, and it gives no Influence.
- **Engine:** existing. `buys`, `choose-player as opp`, `choose { by: { var: opp }, options: [...] }` with
  `on-player`, `gain cog` and `coins`.
- **Balance:** Kingmaking is limited to one Silver. At 2 players it is a pure duel decision. Bots need a simple
  rule for the opponent's side.

### A10 · Gilder

`gilder` · Action · cost 5 · complexity **low**

- **Effect:** +1 Buy. Gain a Currency card costing up to 4 Coins to your hand.
- **Timing:** Action phase. The gained Currency can be played this turn.
- **Purpose:** Grows the economy now and later. It can fetch Silver or a Kingdom Currency such as Promissory Note,
  Trade Bonds or Laurel Wreath.
- **Dominion reference:** Explorer (Seaside), partial. That card gains Silver or Gold to hand depending on a reveal.
- **Closest K&C:** Treadwheel Crane (gains a card costing ≤2 and gives +2 Coins) and Mintmaster.
- **How it differs:** It gains Currency, to hand, with a Buy. There is no trash and no reveal.
- **Engine:** existing. `buys`, `choose-pile { type: treasure, maxCost: 4 } as p`, `gain { var: p } to hand`.
- **Balance:** It acts like +2 Coins and +Buy plus a lasting Silver. At cost 5 that sits alongside Guild Banquet.

### A11 · Ledger Hall

`ledger_hall` · Renown · cost 5 · complexity **low**

- **Effect:** Worth 1 Renown per 4 Currency cards you own.
- **Timing:** End of game.
- **Purpose:** A scoring target for Money. Twenty Currencies make it worth 5 Renown.
- **Dominion reference:** Feodum (Dark Ages), partial. That card counts Silvers only. Gardens (Base) is shared.
- **Closest K&C:** Guild Register (1 per 2 Establishments) and Noble Council (1 per Homestead).
- **How it differs:** It counts every Currency, Bronze included.
- **Engine:** existing. `vp: { per: 4, each: 1, of: { type: 'treasure' } }`.
- **Balance:** **Watch the free-Bronze line.** Bronze costs 0, so every spare Buy can add a Bronze. That is the same
  Gardens-and-Copper pattern. It is limited by the Bronze pile size and by diluting the deck. Bench test it against
  a Wholesaler and +Buy rush. If it is too strong, per 5 is the knob.

### A12 · Compound Interest

`compound_interest` · Establishment · cost 5 · complexity **low**

- **Effect:** +1 Buy. At the start of your next turn, +1 Coin per 2 Currency cards in your hand, rounded up.
- **Timing:** The next-turn effect counts the hand dealt at cleanup.
- **Purpose:** A duration whose payoff grows with Currency density. A typical Money hand of 3 or 4 Currencies gives
  +2 Coins.
- **Dominion reference:** Merchant Ship (Seaside), shared, as a duration coin card.
- **Closest K&C:** Toll Gate, Market Stall and Tithe Barn.
- **How it differs:** The payoff is variable and depends on Currency, and it gives no Influence.
- **Engine:** existing. `buys`, `delay [ select hand filter treasure as t, coins { div: [{ countIn: t }, 2], up: true } ]`.
- **Balance:** At most +3 Coins with a hand of 5 or 6 Currencies. It is fine at cost 5.

### A13 · Bourse

`bourse` · Action · cost 5 · complexity **low**

- **Effect:** +1 Buy. +2 Coins. You may spend 2 Influence. If you do, gain a Silver to your hand.
- **Timing:** Action phase. The Silver can be played this turn.
- **Purpose:** The set's Influence sink. It turns stored Influence into a permanent Silver and 2 Coins now.
- **Dominion reference:** Woodcutter (Base, first edition), shared, for its stats.
- **Closest K&C:** Guild Banquet (+Buy, +2 Coins, *gains* 2 Influence) and Crown Treasury.
- **How it differs:** It sits on the opposite side of the Influence economy, spending Influence where Guild Banquet
  generates it.
- **Engine:** existing. `buys`, `coins`, `if hasSpark(2)`, `may`, `spark(-2)`, `gain cog to hand`.
- **Balance:** It gets around the conversion limit of 2 per turn only by adding a Silver. It does not convert at a
  better rate. It is a mild Influence sink.

### A14 · Gold Florin

`gold_florin` · Currency · cost 6 · complexity **low**

- **Effect:** +2 Coins. If you have played no Action cards this turn, +2 Coins more and +1 Buy.
- **Timing:** Buy phase. It counts the Actions played this turn.
- **Purpose:** A payoff for pure Money. It is worse than Gold in engines and better than Gold with +Buy in Money.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Gold and Royal Mint (+2 Coins, may spend Influence for more).
- **How it differs:** The bonus depends on playing no Actions, which no current card asks for.
- **Engine:** existing. `coins 2`, `if not gte [actionsPlayed, 1]`, then `coins 2` and `buys 1`. **VERIFY** that
  `actionsPlayed` reads correctly while a Currency resolves.
- **Balance:** Two of them in a Money hand make 8 Coins with 3 Buys. It directly answers Money's 0.6× result without
  touching any existing card. Bench test it so Money does not jump past fair share.

---

## B. Houses of Influence (`houses`)

Renaissance court politics. The set's decisions are mostly *between players*: an opponent picks your reward, you pick
who to help, and you pay Influence to make attacks land. Influence comes in only through optional or modest effects.
Most of the set spends it. It has two attacks and two reactions, and none of them gives junk except Homestead, which
is worth 1 Renown.

### B1 · Household Guard

`household_guard` · Action · Reaction · cost 2 · complexity **low**

- **Effect:** +1 Action. +1 Coin. When another player plays an Attack, you may reveal this from your hand to draw 1
  card, then put a card from your hand on top of your deck.
- **Timing:** The reaction happens before the Attack resolves. Each copy can be revealed once per Attack.
- **Purpose:** A defence that improves your hand instead of cancelling the Attack. You can draw into a Reaction you
  need, or put the card an attack would cost you on top of your deck.
- **Dominion reference:** Moat family, shared. Its reveal does not block.
- **Closest K&C:** Royal Runner (reveals for Influence) and Night Watch (discards to cancel).
- **How it differs:** It changes the hand, does not cancel the Attack, and gives no Influence.
- **Engine:** existing. A `reactionCard` with `once: true` and effects `draw 1`, then `choose-cards` hand 1–1, then
  `move` to deck.
- **Balance:** Low.

### B2 · Antechamber

`antechamber` · Action · cost 3 · complexity **low**

- **Effect:** Draw 1. +2 Actions. You may spend 1 Influence to draw 1 more.
- **Timing:** Action phase.
- **Purpose:** A village that spends Influence.
- **Dominion reference:** Village (Base), partial.
- **Closest K&C:** Morning Bell (gains Influence) and Trading Port (spends 1 Influence to draw).
- **How it differs:** It is a village that spends Influence rather than producing it.
- **Engine:** existing. `draw`, `actions`, `if hasSpark(1)`, then `may` `spark(-1)` and `draw 1`.
- **Balance:** Neutral.

### B3 · Bribed Magistrate

`bribed_magistrate` · Action · Attack · cost 3 · complexity **medium**

- **Effect:** +1 Action. +1 Coin. You may spend 2 Influence. If you do, each opponent with 5 or more cards in hand
  discards a card of their choice.
- **Timing:** Opponents can reveal Reactions when this is played, whether or not you pay.
- **Purpose:** An attack you have to pay for. It is a non-terminal hand-size attack, and it is self-limiting: after
  the first paid play, the opponents are already at 4 cards.
- **Dominion reference:** Militia (Base), partial. That card is terminal, free, and discards down to 3.
- **Closest K&C:** Tax Assessors (free, terminal, +2 Coins).
- **How it differs:** It costs Influence, is non-terminal and gives less Coin.
- **Engine:** existing. `attack` wrapped in `if hasSpark(2)` plus `may`, then `count hand ≥ 5`, then a discard.
- **Balance:** It drains Influence, which is good for the meta. Its power is the same as Tax Assessors once paid
  for.

### B4 · Counter-Intrigue

`counter_intrigue` · Action · Reaction · cost 3 · complexity **low**

- **Effect:** +2 Coins. When another player plays an Attack, you may reveal this from your hand: that player discards
  the top card of their deck.
- **Timing:** The reaction happens before the Attack resolves. Once per Attack. The discard is public.
- **Purpose:** Retaliation that does not involve Influence. It discourages attackers without cancelling the attack.
- **Dominion reference:** no clear equivalent. It shares Moat's reveal mechanic.
- **Closest K&C:** Court Informer, whose attacker loses 1 Influence.
- **How it differs:** It mills the attacker's deck instead of draining Influence.
- **Engine:** existing. A `reactionCard` with `once: true` and `on-player parent [ look 1 as t, move t discard public ]`.
- **Balance:** Low. Milling the top card can help or hurt the attacker.

### B5 · Whispered Promise

`whispered_promise` · Establishment · cost 3 · complexity **low**

- **Effect:** Gain 1 Influence. At the start of your next turn, you may spend 2 Influence to draw 2 cards.
- **Timing:** Next turn's effect is optional.
- **Purpose:** It stores a favour now and can turn it into cards later. Over two turns it is a net Influence sink if
  you use it.
- **Dominion reference:** Duration family (Seaside), shared.
- **Closest K&C:** Audience Hall (gains 3 Influence next turn and draws 1).
- **How it differs:** Most of its value costs Influence instead of producing it.
- **Engine:** existing. `spark(1)`, then `delay [ if hasSpark(2), may spark(-2), draw 2 ]`.
- **Balance:** Low.

### B6 · Signoria

`signoria` · Action · cost 4 · complexity **medium**

- **Effect:** Choose an opponent. They choose one for you: draw 3 cards; or gain 2 Influence, +1 Buy and +1 Coin.
- **Timing:** Immediate.
- **Purpose:** The council decides. You get the option your rival considers less dangerous. Engines want the cards;
  Influence decks want the Influence.
- **Dominion reference:** Envoy (Promo), partial. There the left neighbour picks which of your cards you lose.
- **Closest K&C:** Royal Architect (you choose between modes) and Licensing Hall.
- **How it differs:** The opponent chooses between two different rewards.
- **Engine:** existing. `choose-player`, then `choose { by: { var: opp } }` with options that run for you.
  **VERIFY** that options chosen by another player apply their effects to the card's owner.
- **Balance:** It is weaker than either mode on its own because the opponent picks. Bots need a rule for the
  opponent's choice.

### B7 · Hollow Title

`hollow_title` · Action · Attack · cost 4 · complexity **low**

- **Effect:** +2 Coins. Each opponent gains a Homestead onto their deck.
- **Timing:** Opponents can reveal Reactions first.
- **Purpose:** The court grants empty honours. Each opponent gets a dead card in their next hand, but also +1 Renown
  each. It is a political trade.
- **Dominion reference:** junking-attack family, shared.
- **Closest K&C:** Tax Farmer and Tax Arrears, which give Royal Debt.
- **How it differs:** The junk is a Homestead worth +1 Renown, not −1. It needs no Debt pile and leaves
  `RUST_MAKERS` alone.
- **Engine:** existing. `attack [ gain notebook to deck ]`.
- **Balance:**
  - **Feeds Noble Council and Glory players.** Each Homestead raises a Noble Council owner's score, and also
    Laurel Wreath, Grand Muster and Manor Court. That is a deliberate tension.
  - **Weaker at large tables.** At 6 players it hands out 5 Renown.
  - **Can empty the Homestead pile,** which has 8–18 cards. An empty basic pile counts toward `emptyPiles` but not
    toward the three-pile ending.

### B8 · Purchased Office

`purchased_office` · Action · cost 4 · complexity **low**

- **Effect:** +1 Action. You may spend 3 Influence. If you do, gain a card costing up to 4 Coins to your hand.
- **Timing:** Action phase. A gained Action can be played only if you have Actions left.
- **Purpose:** Influence becomes a card, outside the 2-per-turn conversion limit.
- **Dominion reference:** Workshop (Base), shared.
- **Closest K&C:** Treadwheel Crane and Noble Resettlement (gains an Action to hand).
- **How it differs:** It is paid with Influence and is non-terminal.
- **Engine:** existing. `actions`, `if hasSpark(3)`, then `may` `spark(-3)`, `choose-pile maxCost 4`, `gain to hand`.
- **Balance:** **This is the Houses card most likely to help the Influence Engine.** It is bounded by the Influence
  cap of 8: at most 2 uses per turn. If the bench shows Influence going above about 2.1×, raise the price to 4
  Influence.

### B9 · Court Purge

`court_purge` · Action · cost 4 · complexity **low**

- **Effect:** Trash up to 2 cards from your hand. Then each opponent may trash a card from their hand.
- **Timing:** Not an Attack. Opponents choose in turn order.
- **Purpose:** A purge that forces everyone to choose sides. It is strong thinning that also helps rivals a little.
- **Dominion reference:** Chapel family, shared.
- **Closest K&C:** Lime Kiln (trashes up to 2 and gives Influence).
- **How it differs:** It gives no Influence, and opponents can thin too.
- **Engine:** existing. `choose-cards 0–2`, `move` to trash, `each-other [ choose-cards 0–1, move trash ]`.
- **Balance:** The benefit to opponents grows with table size. Its cost of 4 is above Lime Kiln's 3 to make up for
  having no downside to the player.

### B10 · Family Crest

`family_crest` · Renown · cost 4 · complexity **low**

- **Effect:** Worth 2 Renown. When you gain this, choose an opponent: they gain 1 Influence.
- **Timing:** On gain.
- **Purpose:** Mid-priced Renown with a political cost. It sits between Homestead (2 Coins for 1 Renown) and Noble
  Estate (5 Coins for 3 Renown).
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Homestead and Noble Estate.
- **How it differs:** It has a gain cost that helps a chosen rival.
- **Engine:** existing. `triggers: [{ on: 'gain', where: 'self', effects: [choose-player, token spark +1 player] }]`.
  **VERIFY** that `token` with a `player` target works inside a self-gain trigger.
- **Balance:** The Influence it hands out is small and the opponent's cap is 8.

### B11 · Marriage Pact

`marriage_pact` · Action · Renown · cost 5 · complexity **low**

- **Effect:** +1 Action. Choose an opponent. You and they each draw 1 card. Worth 2 Renown.
- **Timing:** Immediate.
- **Purpose:** A dynastic alliance: a cantrip worth Renown that strengthens one chosen rival. At 3 or more players,
  who you help matters.
- **Dominion reference:** Great Hall (Intrigue, first edition), shared, plus Council Room's draw for others.
- **Closest K&C:** Court Scholar (1 Renown, Influence) and Royal Chronicler.
- **How it differs:** It is worth 2 Renown and the cost of that is a rival's card.
- **Engine:** existing. `actions`, `draw`, `choose-player`, `on-player { var } [ draw 1 ]`.
- **Balance:** Kingmaking risk near the end of the game. That is accepted, as with Alms House.

### B12 · Majordomo

`majordomo` · Action · cost 5 · complexity **medium**

- **Effect:** Choose two different: draw 2 cards; +2 Coins; +1 Action and +1 Buy; gain 1 Influence.
- **Timing:** The choices resolve in the order listed.
- **Purpose:** A flexible tactical card for a deck that has to adapt.
- **Dominion reference:** Pawn (Intrigue), partial. That card picks 2 of 4 single bonuses.
- **Closest K&C:** Royal Architect (chooses 1 of 2 modes).
- **How it differs:** It has larger bonuses and is mostly Influence-neutral.
- **Engine:** existing. `choose { pick: 2, options: [...] }`.
- **Balance:** Draw 2 with +Action and +Buy works like a Laboratory with a Buy, so it costs 5, the same as Trading
  Port.

### B13 · Palace Intrigue

`palace_intrigue` · Action · cost 6 · complexity **low**

- **Effect:** Draw 3. +1 Action. Choose an opponent: they gain 2 Influence.
- **Timing:** Immediate.
- **Purpose:** Strong non-terminal draw, paid for by giving a chosen rival 2 Influence.
- **Dominion reference:** Council Room (Base), partial: big draw that helps others.
- **Closest K&C:** Great Council (others gain Influence) and Privy Council (draws 3 and gains 2 Influence).
- **How it differs:** It is non-terminal, and the Influence goes to one chosen rival.
- **Engine:** existing. `draw`, `actions`, `choose-player`, `token spark +2 player`.
- **Balance:** **Feeding a rival's Influence is a real cost while Influence dominates.** The amount is fixed, so it
  does not grow with player count.

---

## C. Masters & Apprentices (`masters`)

Workshops, guild training and the craft of improving a deck. The set adds the game's first **play-twice** card and
**free-play** card, exact-cost upgrades, and three new ways to thin. It does not touch Influence at all. That
supports Combo, Cycling and Thinning, which underperform, without strengthening Influence or Works.

### C1 · Sweeper

`sweeper` · Action · cost 2 · complexity **low**

- **Effect:** +1 Action. Look at the top card of your deck. Trash it, discard it, or put it back.
- **Timing:** The look is private.
- **Purpose:** Cheap non-terminal thinning and filtering. You trash junk before it reaches your hand.
- **Dominion reference:** Sentry (Base), partial. That card looks at 2 and draws 1.
- **Closest K&C:** Grain Sorter (looks at 2, discards any, no trash).
- **How it differs:** It looks at one card, can trash it, and draws nothing.
- **Engine:** existing. `look 1 as t`, `choose` 3 options with `move` to trash, discard or deck.
- **Balance:** Low. It helps Thinning, which underperforms.

### C2 · Sketchbook

`sketchbook` · Action · cost 2 · complexity **low**

- **Effect:** +1 Action. Draw 1, then discard a card. If you discarded an Action card, +1 Action.
- **Timing:** Action phase.
- **Purpose:** A sifter that rewards ditching surplus terminals, which keeps an Action chain alive.
- **Dominion reference:** cantrip sifter family (Inn, Oasis), shared.
- **Closest K&C:** Kingdom Courier (draws 2, +Action, discards 1).
- **How it differs:** It draws 1 and can give +Action for an Action discard.
- **Engine:** existing. `actions`, `draw`, `choose-cards 1–1`, `move` to discard, `if isType action`, `actions`.
- **Balance:** Low.

### C3 · Bottega

`bottega` · Action · cost 3 · complexity **low**

- **Effect:** Draw 1. +2 Actions. If this is your third or later Action this turn, +1 Coin.
- **Timing:** It counts Actions played this turn, including itself.
- **Purpose:** A village that pays off in the middle of a chain.
- **Dominion reference:** Village (Base), partial.
- **Closest K&C:** Guild Procession (pays out at the third Action) and Morning Bell.
- **How it differs:** It is a village that pays Coins, not Influence.
- **Engine:** existing. `draw`, `actions`, `if gte [actionsPlayed, 3]`, `coins`.
- **Balance:** Low.

### C4 · Guild Diploma

`guild_diploma` · Action · Renown · cost 3 · complexity **low**

- **Effect:** +1 Action. You may trash a card from your hand. Worth 1 Renown.
- **Timing:** Action phase.
- **Purpose:** Graduation. A thinner that also scores, so trashing is no longer a pure tempo loss.
- **Dominion reference:** no clear equivalent. It shares the Action-Victory mechanic.
- **Closest K&C:** Court Scholar (draws, gives Influence, 1 Renown) and Lime Kiln.
- **How it differs:** It is a non-terminal single trash carrying Renown.
- **Engine:** existing. A `civic` helper with `actions`, `choose-cards 0–1`, `move` to trash.
- **Balance:** Non-terminal trashing at cost 3 is strong. It replaces itself as an Action but not as a card, which
  slows it down. Watch it in the Thinning bench.

### C5 · Woodcarver

`woodcarver` · Action · cost 3 · complexity **low**

- **Effect:** Gain a card costing up to 3 Coins. If it is an Action, put it on top of your deck.
- **Timing:** Action phase.
- **Purpose:** A cheap gainer for building engines. An Action it gains comes up next turn.
- **Dominion reference:** Workshop (Base), partial. That card gains up to 4 and has no topdeck.
- **Closest K&C:** Treadwheel Crane (+2 Coins, gains ≤2).
- **How it differs:** It gains up to 3, has no Coins, and puts Actions on top of the deck.
- **Engine:** existing. `choose-pile maxCost 3`, then `if` on the pile's type, then `gain to deck` or discard.
  **VERIFY** the type check on a pile variable before gaining. If it isn't supported, gain the card, then move
  `event`.
- **Balance:** Low.

### C6 · Promotion

`promotion` · Action · cost 4 · complexity **medium**

- **Effect:** +1 Action. You may trash an Action card from your hand. If you do, gain an Action card costing up to 2
  Coins more than it to your hand.
- **Timing:** The gained Action is playable if you have Actions left.
- **Purpose:** An apprentice becomes a master: it upgrades opening Actions into late-game ones mid-chain.
- **Dominion reference:** Remodel (Base), shared. Upgrade (Intrigue) is partial.
- **Closest K&C:** Noble Resettlement (Renown → an Action costing up to 4 more, to hand).
- **How it differs:** It starts from an Action instead of a Renown card, and the step is +2.
- **Engine:** existing. `choose-cards filter action`, `move` to trash, `choose-pile { type: action, maxCost:
  costOf+2 }`, `gain to hand`.
- **Balance:** It cannot trash itself, because it is in play rather than in hand. It is bounded by the Actions in
  hand.

### C7 · Master's Hand

`masters_hand` · Action · cost 4 · complexity **medium**

- **Effect:** You may play an Action card costing 4 Coins or less from your hand twice. If you don't, +1 Action and
  draw 1.
- **Timing:** The second play resolves fully after the first.
- **Purpose:** The game's first play-twice card. The cost cap keeps 5 and 6-cost payoffs out, and the fallback means
  it is never a dead card.
- **Dominion reference:** Throne Room (Base), partial. That card has no cost cap and no fallback.
- **Closest K&C:** Royal Commission (plays an Action next turn).
- **How it differs:** It plays twice this turn, with a cap and a fallback.
- **Engine:** existing. `choose-cards 0–1 filter { type: action, maxCost: 4 }`, `if has`, then
  `play-card times 2`, else `actions` and `draw`. **VERIFY** what happens to an Establishment played twice: both
  `delay`s should fire and it should stay in play once.
- **Balance:**
  - **Chaining.** Master's Hand on Master's Hand plays two cards twice each. That is bounded by the hand, so there is
    no loop.
  - **Doubled attacks.** Doubling Bribed Magistrate or Tax Assessors only matters when hands are 6 or more cards.
  - **Doubled Influence.** Doubling Lady-in-Waiting or Petitioner doubles Influence. Watch this in Spark benches.

### C8 · Open Studio

`open_studio` · Action · cost 4 · complexity **low**

- **Effect:** Draw 2. +1 Action. Choose an opponent: they draw 1 card.
- **Timing:** Immediate.
- **Purpose:** Laboratory-class draw at cost 4, paid for by a rival's card.
- **Dominion reference:** Laboratory (Base), partial, plus Council Room's draw for others.
- **Closest K&C:** Alms House (terminal, opponent draws, Influence) and Trading Port.
- **How it differs:** It is non-terminal with no Influence, and the opponent is chosen.
- **Engine:** existing. `draw`, `actions`, `choose-player`, `on-player [ draw 1 ]`.
- **Balance:** The help to a rival is fixed at one card.

### C9 · Study Hall

`study_hall` · Action · cost 4 · complexity **low**

- **Effect:** Look at the top 4 cards of your deck. Put the Action cards among them into your hand and the rest back
  on top in any order.
- **Timing:** It is terminal, so the Actions it finds need Actions left to play.
- **Purpose:** Pulls an engine together, and the cards it puts back set up the next draw.
- **Dominion reference:** Patrol (Intrigue), partial. That card reveals 4 and takes Victory cards.
- **Closest K&C:** Hall of Archives and Town Plans.
- **How it differs:** It takes every Action in a fixed window of 4 and puts the rest back on top, not discarded.
- **Engine:** existing. `look 4 as r`, `select filter action as a`, `move a` to hand, then the existing
  `putBack(rest, 'deck', …)` helper.
- **Balance:** It is the counterpart to Bookkeeper (Republics). Which set is in play decides who it helps.

### C10 · Patternmaker

`patternmaker` · Action · cost 4 · complexity **medium**

- **Effect:** +1 Buy. Gain a copy of an Action card you have in play costing up to 5 Coins.
- **Timing:** Action phase. It can copy itself.
- **Purpose:** Growing an engine by copying a card it already uses.
- **Dominion reference:** no clear equivalent. It shares the "gain a copy" mechanic.
- **Closest K&C:** Treadwheel Crane.
- **How it differs:** The gained card is defined by what you have in play, not by its cost alone.
- **Engine:** existing. `select play filter action as inplay`, then `choose-pile { sameAs: inplay, maxCost: 5 }`,
  then `gain`. **VERIFY** that `sameAs` matches any card in a variable that holds several.
- **Balance:** Depleting piles helps three-pile endings, which never happen today. That is fine.

### C11 · Atelier

`atelier` · Action · cost 4 · complexity **low**

- **Effect:** Trash a card from your hand. Gain a card costing exactly 2 Coins more than it.
- **Timing:** The trash is mandatory if you have a card. If no pile has that exact cost, you gain nothing.
- **Purpose:** Exact upgrades: Bronze to a 2-cost, Silver to a 5-cost, Gold to Grand Duchy, Homestead to a 4-cost.
- **Dominion reference:** Remodel (Base), partial. That card gains *up to* 2 more.
- **Closest K&C:** Estate Surveyor (Renown cards, up to 3 more).
- **How it differs:** The cost must be exact, and it works on any card.
- **Engine:** existing. `choose-cards 1–1`, `move` to trash, `choose-pile { exactCost: { costOf: x, plus: 2 } }`,
  `gain`.
- **Balance:** Gold to Grand Duchy speeds up the end of the game, as in the genre.

### C12 · Schoolroom

`schoolroom` · Action · cost 4 · complexity **low**

- **Effect:** Draw 1. +1 Action. Trash a card from your hand.
- **Timing:** The trash is mandatory.
- **Purpose:** A thinning cantrip that is forced, so late in the game it can cost you a good card.
- **Dominion reference:** Junk Dealer (Dark Ages), partial. That card also gives +1 Coin.
- **Closest K&C:** Royal Scrivener (trashes from the discard pile) and Purification House.
- **How it differs:** It is a cantrip that trashes from hand.
- **Engine:** existing. `draw`, `actions`, `choose-cards 1–1`, `move` to trash.
- **Balance:** Strong thinning. Its cost of 4 reflects that.

### C13 · Lecture Hall

`lecture_hall` · Action · cost 5 · complexity **low**

- **Effect:** Draw 3. You may put an Action card from your hand on top of your deck. If you do, +1 Action.
- **Timing:** Action phase.
- **Purpose:** Terminal draw that can become non-terminal by delaying one Action to next turn.
- **Dominion reference:** Smithy (Base), partial.
- **Closest K&C:** Privy Council (draws 3, +2 Influence, cost 6) and Keeper of the Rolls.
- **How it differs:** It trades a future card for an Action now, and gives no Influence.
- **Engine:** existing. `draw 3`, `choose-cards 0–1 filter action`, `move` to deck, `if has`, `actions`.
- **Balance:** It is cheaper than Privy Council but gives no Influence. It is fine.

### C14 · Master's Fee

`masters_fee` · Action · cost 5 · complexity **low**

- **Effect:** +1 Buy. +2 Coins. If this is your third or later Action this turn, draw 2.
- **Timing:** It counts Actions played including itself.
- **Purpose:** A terminal that ends a chain, refilling the hand for the buy phase.
- **Dominion reference:** Conspirator (Intrigue), partial.
- **Closest K&C:** Guild Procession (cantrip) and Guild Banquet.
- **How it differs:** It is terminal, and its payoff is draw rather than Influence.
- **Engine:** existing. `buys`, `coins`, `if gte [actionsPlayed, 3]`, `draw 2`.
- **Balance:** Neutral.

### C15 · Maestro

`maestro` · Action · cost 6 · complexity **medium**

- **Effect:** Draw 2. +1 Action. You may play an Action card costing up to 5 Coins from your hand.
- **Timing:** The free play does not use an Action.
- **Purpose:** The set's capstone, a Laboratory that also plays a card.
- **Dominion reference:** no clear equivalent. It shares the free-play mechanic.
- **Closest K&C:** Royal Commission and Master's Hand (C7).
- **How it differs:** It plays a card once, now, with a cap of 5. It cannot play another Maestro.
- **Engine:** existing. `draw`, `actions`, `choose-cards 0–1 filter { action, maxCost 5 }`, `play-card times 1`.
- **Balance:** It is strong, but the cost of 6 and the cap prevent self-chaining.

---

## D. Ports & Provinces (`ports`)

Harbours, inland roads and the goods moving between them. The set covers trading sideways, gaining to hand,
setting cards aside, working the discard pile, duration villages and flexible buying. It has one attack and no
Influence.

### D1 · Harbour Pilot

`harbour_pilot` · Establishment · cost 2 · complexity **low**

- **Effect:** +1 Action. Look at the top 2 cards of your deck. Discard one and put the other back. At the start of your
  next turn, draw 1.
- **Timing:** It sifts now and draws next turn.
- **Purpose:** A cheap duration that improves your next hand twice over.
- **Dominion reference:** Caravan (Seaside), partial. That card draws now as well.
- **Closest K&C:** Scriptorium and Grain Sorter.
- **How it differs:** It sifts now instead of drawing, and costs 2.
- **Engine:** existing. `actions`, `look 2 as t`, choose one to discard, put the rest back, `delay [ draw 1 ]`.
- **Balance:** Low.

### D2 · Dockhand

`dockhand` · Action · cost 2 · complexity **low**

- **Effect:** +1 Buy. +1 Coin. You may put a card from your discard pile on top of your deck.
- **Timing:** Action phase. The chosen card is public.
- **Purpose:** Recovers a key card for the next turn.
- **Dominion reference:** Harbinger (Base), partial. That card is a cantrip.
- **Closest K&C:** Ragpicker (+Action; discard to hand for 1 Influence).
- **How it differs:** It is terminal economy with a Buy and no Influence, and the card goes to the deck, not the
  hand.
- **Engine:** existing. `buys`, `coins`, `choose-cards from discard 0–1`, `move` to deck.
- **Balance:** Low.

### D3 · Barter Post

`barter_post` · Action · cost 3 · complexity **medium**

- **Effect:** +1 Action. You may trash a card from your hand. If you do, gain a different card with the same cost to
  your hand.
- **Timing:** Action phase. Royal Debt cannot be gained.
- **Purpose:** Sideways trading: Silver into a 3-cost Action, Homestead into Tally Clerk, an early 4 into the 4 you
  need now.
- **Dominion reference:** Remodel family, shared. It is a same-cost exchange.
- **Closest K&C:** Estate Surveyor.
- **How it differs:** Same cost, to hand, non-terminal.
- **Engine:** existing. `choose-cards 0–1`, `move` to trash, `choose-pile { exactCost: costOf x, notSameAs: x,
  notType: penalty }`, `gain to hand`.
- **Balance:** No net gain in cost, so no loop. Bronze (0) has no legal target, so trashing it gains nothing; the
  card text should say so.

### D4 · Quayside Sale

`quayside_sale` · Action · cost 3 · complexity **low**

- **Effect:** +1 Action. Discard up to 3 cards. +1 Coin per card discarded.
- **Timing:** Action phase.
- **Purpose:** Turns dead Renown cards and surplus Actions into Coins.
- **Dominion reference:** Secret Chamber (Intrigue, first edition) and Vault (Prosperity), partial.
- **Closest K&C:** Favour Broker (discards 2 for Influence).
- **How it differs:** It is non-terminal with a cap of 3, and pays Coins only.
- **Engine:** existing. `choose-cards 0–3 as d`, `move` to discard, `coins { len: d }`.
- **Balance:** Pairs well with Glory's Renown-heavy decks.

### D5 · Ferry Landing

`ferry_landing` · Establishment · cost 3 · complexity **low**

- **Effect:** +2 Actions. At the start of your next turn, +1 Action and draw 1.
- **Timing:** It is a duration.
- **Purpose:** A duration village.
- **Dominion reference:** Fishing Village (Seaside), partial. That card gives Coins rather than draw.
- **Closest K&C:** Morning Bell and Fondaco (A4).
- **How it differs:** It draws next turn and gives no Coins.
- **Engine:** existing. `actions`, `delay [ actions, draw ]`.
- **Balance:** Neutral.

### D6 · Chandler

`chandler` · Action · cost 4 · complexity **low**

- **Effect:** Gain a card costing up to 3 Coins to your hand. If it is an Action, +1 Action.
- **Timing:** The gained Action can be played straight away.
- **Purpose:** A supplier that equips the turn you are playing.
- **Dominion reference:** Workshop (Base), partial. Artisan (Base) is also partial: it gains up to 5 to hand and
  topdecks a card.
- **Closest K&C:** Treadwheel Crane and Woodcarver (C5).
- **How it differs:** It gains to hand and refunds an Action when the gained card is an Action.
- **Engine:** existing. `choose-pile maxCost 3`, `gain to hand`, `if isType event action`, `actions`.
  **VERIFY** that `event` is set by the gain inside the same effect list. If not, use a pile-type check.
- **Balance:** Low to moderate.

### D7 · Bonded Store

`bonded_store` · Establishment · cost 4 · complexity **medium**

- **Effect:** +1 Coin. Set aside up to 2 cards from your hand. At the start of your next turn, put them into your
  hand.
- **Timing:** The set-aside cards are hidden from opponents.
- **Purpose:** Saves a strong pair for a bigger turn.
- **Dominion reference:** Haven (Seaside), partial (one card) and Gear (Adventures), partial (draws as well).
- **Closest K&C:** Royal Commission (sets aside an Action and plays it).
- **How it differs:** It holds any 2 cards, and gives a Coin instead of a play.
- **Engine:** existing mat zone: `move` to `{ mat: 'bonded' }`, then `delay [ move mat to hand ]`.
  **VERIFY hidden information:** `project(state, seat)` must hide mat contents from other seats. If mats are public,
  this card needs projection work first. That counts as a hidden-information change under AGENTS.md.
- **Balance:** Low to moderate.

### D8 · Trade Agreement

`trade_agreement` · Action · cost 4 · complexity **high**

- **Effect:** +1 Action. Choose an opponent. You may discard a card; then they may discard a card. If you both did,
  you each draw 2 cards. If only you did, you draw 1.
- **Timing:** You decide first, in public, and then the opponent decides.
- **Purpose:** A trust game. Both sides gain by cooperating, and the opponent can refuse to deny you the bigger
  payoff.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Licensing Hall (the opponent chooses to discard).
- **How it differs:** It rewards both players when both cooperate.
- **Engine:** existing, with care. `may` discard (set `mine`), `on-player { var } [ may discard as theirs ]`,
  `pass-up theirs`, then nested `if`s. **VERIFY** that `pass-up` works from `on-player`, not only from
  `each-other`.
- **Balance:** At worst it is a cantrip with +1 card net (you discard and draw 1). That is fine.
- **Complexity:** This is the most complex card in the catalog. Cut it if the rules UI cannot present the two-step
  choice clearly.

### D9 · Cargo Manifest

`cargo_manifest` · Action · cost 4 · complexity **low**

- **Effect:** Draw 1, plus 1 per Establishment you have in play, up to 4 cards in total.
- **Timing:** It counts Establishments in play, including ones from last turn that are still out.
- **Purpose:** The payoff for a duration deck.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Guild Register, which scores Establishments.
- **How it differs:** It draws instead of scoring.
- **Engine:** existing. `select play filter duration as d`, then
  `draw { min: [{ add: [{ countIn: d }, 1] }, 4] }`.
- **Balance:** Terminal. Average draw is 2–3. It supports Devices, which is already a strong style, so watch it.

### D10 · Grain Hoy

`grain_hoy` · Establishment · cost 5 · complexity **low**

- **Effect:** Look at the top 3 cards of your deck. Put one into your hand and the rest back in any order. At the
  start of your next turn, +2 Coins.
- **Timing:** It is a duration.
- **Purpose:** Picks a card now and pays later.
- **Dominion reference:** Duration family (Seaside), shared.
- **Closest K&C:** Customs House (+Action, look at 3, take 1, the rest to the bottom) and Market Stall.
- **How it differs:** It is terminal, puts the rest back on top in order, and gives Coins next turn.
- **Engine:** existing. `look 3`, `choose-cards 1–1 from var`, `move` to hand, `putBack`, `delay [ coins 2 ]`.
- **Balance:** Neutral.

### D11 · Hiring Day

`hiring_day` · Action · cost 5 · complexity **medium**

- **Effect:** +2 Buys. +1 Coin. This turn, each time you buy a card costing 2 Coins or more, +1 Coin.
- **Timing:** The Coin arrives after each purchase and can fund the next one.
- **Purpose:** Flexible buying. Every purchase after the first is effectively 1 Coin cheaper.
- **Dominion reference:** no clear equivalent. It shares the "+Buy with a refund" mechanic.
- **Closest K&C:** Wholesaler (A7) and Port Tariffs (an on-buy trigger).
- **How it differs:** The refund works on any card costing 2 or more, not on a type.
- **Engine:** existing. `buys 2`, `coins`, `on buy [ if gte [costOf event, 2], coins 1 ]`.
- **Balance:**
  - **Projects excluded.** Completing Project stages is not a buy event, so stages get no refund.
  - **Buys still help Works**, because extra Buys fund Project stages.
  - **Bounded.** The refund is limited to the number of Buys.

### D12 · Customs Cutter

`customs_cutter` · Action · Attack · cost 5 · complexity **medium**

- **Effect:** +2 Coins. Each opponent reveals the top card of their deck. If it is a Currency costing 3 Coins or more,
  they discard it. If anyone discarded a card this way, gain a Silver.
- **Timing:** Reactions apply. You gain at most one Silver per play.
- **Purpose:** A revenue cutter that seizes cargo. It slows rich decks and adds to yours.
- **Dominion reference:** Bandit (Base, second edition), partial. That card gains Gold and trashes Treasures.
- **Closest K&C:** Road Warden and Court Saboteur.
- **How it differs:** It discards rather than trashes, only hits Silver or better, and gives a Silver once.
- **Engine:** existing. `attack [ reveal 1, if isType treasure and costOf ≥ 3 → move discard, set hit 1, pass-up hit ]`,
  then `if has hit → gain cog`.
- **Balance:** Mild. Discarding hurts less than trashing.

### D13 · Landing Rights

`landing_rights` · Action · cost 5 · complexity **low**

- **Effect:** +1 Buy. +2 Coins. This turn, the first time you gain a Renown card, +1 Renown.
- **Timing:** Once per play. It counts gains from any source, including buys.
- **Purpose:** Greening with a bonus point.
- **Dominion reference:** Goons (Prosperity), partial. That card gives VP on every buy.
- **Closest K&C:** Heraldic Painter.
- **How it differs:** It triggers once and only on a Renown gain.
- **Engine:** existing. `buys`, `coins`, `on gain filter victory once [ vp 1 ]`.
- **Balance:** Low to moderate.

### D14 · Galleass

`galleass` · Establishment · cost 6 · complexity **low**

- **Effect:** Draw 2. At the start of your next turn, draw 2 and +1 Action.
- **Timing:** It is a duration.
- **Purpose:** The heavy cargo ship: big draw across two turns.
- **Dominion reference:** Wharf (Seaside), partial. That card draws 2 and gives +Buy both turns, at cost 5.
- **Closest K&C:** Scriptorium and Cloth Hall.
- **How it differs:** It gives +Action next turn instead of +Buy, and costs 6.
- **Engine:** existing. `draw`, `delay [ draw, actions ]`.
- **Balance:** Strong. Wharf is a known strong design, which is why this costs 6. Watch it with Devices.

---

## E. Glory of the Realm (`glory`)

Pageantry, knighthood and the land. The set makes Homesteads and other Renown cards *do* something before scoring.
It adds Renown-type cost reductions to speed up the end of the game, Renown that counts Renown cards, and on-gain and
on-trash Renown. It has one attack. There are no Project references; the only endgame clock it reads is the Grand
Duchy pile.

### E1 · Tenant Farmer

`tenant_farmer` · Action · cost 2 · complexity **low**

- **Effect:** +1 Action. You may discard a Renown card from your hand. If you do, draw 2. Otherwise, +1 Coin.
- **Timing:** Action phase.
- **Purpose:** Cycles past green cards.
- **Dominion reference:** Baron (Intrigue), shared. It discards a Victory card for a benefit.
- **Closest K&C:** Post Rider (discards for Influence and a card) and Winnowing Fan.
- **How it differs:** It only discards Renown cards, pays in cards, and falls back to a Coin.
- **Engine:** existing. `choose-cards filter victory 0–1`, `move` to discard, `if has` then `draw 2`, else `coins 1`.
- **Balance:** Low.

### E2 · Manor Court

`manor_court` · Action · cost 3 · complexity **low**

- **Effect:** If you reveal a Homestead from your hand, +1 Renown and +1 Coin. Otherwise, draw 2.
- **Timing:** It is terminal. The Homestead stays in your hand.
- **Purpose:** The manor's court rewards land. It works as a scoring terminal when you have a Homestead and as draw
  when you don't.
- **Dominion reference:** Monument (Prosperity), partial. That card always gives +2 Coins and +1 VP.
- **Closest K&C:** Heraldic Painter.
- **How it differs:** It depends on a Homestead, and falls back to draw.
- **Engine:** existing. `if inHand { key: notebook }` then `vp 1` and `coins 1`, else `draw 2`.
- **Balance:** Being terminal prevents stacking multiple copies onto one Homestead.

### E3 · Votive Offering

`votive_offering` · Action · cost 3 · complexity **low**

- **Effect:** +1 Action. +1 Coin. When you trash this, +2 Renown.
- **Timing:** It triggers from any trash effect.
- **Purpose:** It rewards trashing. Coin Striker, Salvage Office and the Masters trashers all turn it into points.
- **Dominion reference:** no clear equivalent. It shares the "when trashed" mechanic.
- **Closest K&C:** Reclamation Guild, which gives Coins when you trash.
- **How it differs:** It is the card being trashed that pays.
- **Engine:** existing. `triggers: [{ on: 'trash', where: 'self', effects: [vp 2] }]`. **VERIFY** that a self trash
  trigger fires after the card has left the hand.
- **Balance:** **Watch the Coin Striker combo.** Trashing this with Coin Striker gives +2 Coins, +1 Influence and
  +2 Renown. In practice that is 2 Renown for 3 Coins and one trash, which is close to a Homestead and a half.
  Acceptable, but check it in the Scoring bench.

### E4 · Banner Bearer

`banner_bearer` · Action · cost 3 · complexity **low**

- **Effect:** Draw 1. +2 Actions. If you have a Renown card in your hand, +1 Coin.
- **Timing:** The check happens after the draw.
- **Purpose:** A village that softens green-heavy hands.
- **Dominion reference:** Village (Base), partial.
- **Closest K&C:** Morning Bell, Fondaco (A4) and Bottega (C3).
- **How it differs:** Its rider is a Coin when you hold Renown.
- **Engine:** existing. `draw`, `actions`, `if inHand { type: victory }`, `coins`.
- **Balance:** Low. It is one of three new villages that differ only in the rider. That is acceptable because they
  are in different sets.

### E5 · Laurel Wreath

`laurel_wreath` · Currency · cost 4 · complexity **low**

- **Effect:** +1 Coin, plus 1 per Renown card in your hand, up to +3 Coins in total.
- **Timing:** Buy phase. It counts the Renown cards still in your hand.
- **Purpose:** Late-game money. Once your deck is full of green cards, this is worth Gold.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Merchant Bond (more Coins with Influence) and Trade Bonds.
- **How it differs:** It scales with Renown cards in hand.
- **Engine:** existing. A Currency with `effects`: `select hand filter victory as v`,
  `coins { min: [{ countIn: v }, 2] }`, `value 1`.
- **Balance:** It is a Silver early and Gold late, at cost 4. Good for Scoring, which underperforms.

### E6 · Land Grant

`land_grant` · Action · cost 4 · complexity **low**

- **Effect:** +1 Buy. +2 Coins. Gain a Homestead.
- **Timing:** The Homestead is gained to the discard pile and is mandatory.
- **Purpose:** Grows a Homestead base for Noble Council, Manor Court and Laurel Wreath, at the cost of a junk card.
- **Dominion reference:** no clear equivalent. It shares self-greening.
- **Closest K&C:** Guild Banquet.
- **How it differs:** It gains a Homestead instead of Influence.
- **Engine:** existing. `buys`, `coins`, `gain notebook`.
- **Balance:** The Homestead pile is limited, at 8–18 cards. Together with Hollow Title it can empty that pile, which
  feeds Memorial Statue (E8).

### E7 · Grand Muster

`grand_muster` · Action · cost 4 · complexity **low**

- **Effect:** +1 Action. Reveal your hand. Draw 1 card per Renown card revealed, up to 3.
- **Timing:** The reveal is public.
- **Purpose:** Calls the banners: draw that grows as you green.
- **Dominion reference:** Crossroads (Hinterlands), partial.
- **Closest K&C:** none.
- **How it differs:** It is capped at 3 and has no first-play Actions bonus.
- **Engine:** existing. `actions`, `select hand filter victory as v`, `reveal-cards v`,
  `draw { min: [{ countIn: v }, 3] }`.
- **Balance:** Neutral.

### E8 · Memorial Statue

`memorial_statue` · Renown · cost 4 · complexity **low**

- **Effect:** Worth 1 Renown. When you gain this, +1 Renown per empty supply pile.
- **Timing:** On gain. "Supply pile" includes basic piles, which is how the existing `emptyPiles` value counts.
- **Purpose:** Rewards timing your gain late in the game.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** none.
- **How it differs:** It is the only card that reads empty piles.
- **Engine:** existing. `prestige(..., 1, { triggers: [{ on: 'gain', where: 'self', effects: [vp { emptyPiles }] }] })`.
- **Balance:** **Usually weak.** Piles have run out in 0% of benched games. It works in combination: Land Grant and
  Hollow Title can empty the Homestead pile, and Patternmaker can empty market piles. Owner question: is a card that
  is often just "1 Renown for 4" acceptable?

### E9 · Point of Honour

`point_of_honour` · Action · Attack · cost 4 · complexity **low**

- **Effect:** +2 Coins. Each opponent puts a Renown card from their hand on top of their deck, or reveals a hand with
  no Renown cards.
- **Timing:** Reactions apply.
- **Purpose:** Next turn the victim's hand starts with a dead card.
- **Dominion reference:** Bureaucrat (Base), partial. That card also gains a Silver.
- **Closest K&C:** Tax Assessors and Road Warden.
- **How it differs:** It gives no Silver.
- **Engine:** existing. `attack [ choose-cards filter victory 1–1, move` to deck, `else reveal-cards hand ]`.
  **VERIFY** that a forced choice with no legal card falls through cleanly.
- **Balance:** Low to moderate.

### E10 · Honour Guard

`honour_guard` · Action · Reaction · cost 4 · complexity **medium**

- **Effect:** Draw 2. When another player gains a Grand Duchy, you may reveal this from your hand to gain a Homestead.
- **Timing:** Out of turn, on any Grand Duchy gain by another player.
- **Purpose:** Each Grand Duchy a rival takes gives you a small Renown in return.
- **Dominion reference:** Fool's Gold (Hinterlands), partial. That card gains Gold when an opponent gains a Province.
- **Closest K&C:** Underwriter (A5) and Bellman.
- **How it differs:** The reward is a Homestead.
- **Engine:** existing. A card trigger `{ on: 'gain', where: 'hand', scope: 'others', filter: { key: 'monument' },
  optional }` then `gain notebook`.
- **Balance:** The reward is self-limiting because Homesteads are junk.

### E11 · Victory Parade

`victory_parade` · Action · cost 5 · complexity **low**

- **Effect:** +1 Buy. +2 Coins. This turn, Renown cards cost 1 Coin less, but not less than 0.
- **Timing:** Until cleanup. Copies stack.
- **Purpose:** Speeds up the end of the game. Grand Duchy costs 7, or 6 with two Parades, and Homestead costs 1.
- **Dominion reference:** Bridge (Intrigue), partial.
- **Closest K&C:** Wholesaler (A7, Currency only).
- **How it differs:** It only reduces Renown cards, and it is terminal.
- **Engine:** existing. `buys`, `coins`, `cost-mod { delta: -1, filter: { type: 'victory' } }`. Action · Renown cards
  are reduced too.
- **Balance:**
  - **Grand Duchy at 6 shortens games.** Bench round counts with and without it.
  - **Homestead at 1 with +Buy** feeds Noble Council.

### E12 · Chivalric Order

`chivalric_order` · Renown · cost 5 · complexity **low**

- **Effect:** Worth 1 Renown per 3 Renown cards you own, including this one.
- **Timing:** End of game.
- **Purpose:** It rewards a broad base of Renown cards.
- **Dominion reference:** Silk Road (Hinterlands), partial. That card counts per 4 Victory cards and costs 4.
- **Closest K&C:** Noble Council and Guild Register.
- **How it differs:** It counts per 3, costs 5, and includes Action · Renown cards.
- **Engine:** existing. `vp: { per: 3, each: 1, of: { type: 'victory' } }`.
- **Balance:** With 9 Renown cards it is worth 3. It is comparable to Noble Estate at the same cost.

### E13 · Royal Jubilee

`royal_jubilee` · Action · cost 6 · complexity **medium**

- **Effect:** +1 Buy. +3 Coins. If 4 or fewer cards remain in the Grand Duchy pile, +1 Buy and +1 Renown.
- **Timing:** Action phase.
- **Purpose:** An endgame clock card: strong economy that gets better as the end approaches.
- **Dominion reference:** no clear equivalent.
- **Closest K&C:** Guild Banquet and Benefactors.
- **How it differs:** It reads the size of the Grand Duchy pile.
- **Engine:** **NEW.** It needs a `Num` `{ pileLeft: 'monument' }` that counts cards left in a supply pile. That is
  public information and a small evaluator addition. **Existing-engine fallback:** "If any supply pile is empty". It
  would rarely fire, so the owner should choose one of these two.
- **Balance:** The threshold of 4 means different things at different player counts (pile sizes 8, 12, 15 and 18).
  A proportional threshold, such as "a third or less of its starting size", would need a second new value.
