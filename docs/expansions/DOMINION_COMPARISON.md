# Dominion comparison

This is an originality and mechanics review. It is **not** a card-by-card build mapping. Per
docs/DECKBUILDER_LICENSING.md and D22/D25, Kingdom & Commerce does not reproduce Dominion's card list, names, text or
art. The matrix below exists so that new designs can avoid landing on a published card. It also shows which genre
mechanics the game already covers.

## How far this can be trusted

- **Not checked against a primary source.** The comparisons come from general knowledge of the published Dominion
  sets, mostly first and second editions of the base game and the expansions named below. An earlier attempt to fetch
  an official rulebook returned HTTP 403. No Dominion card text was copied into this repo, and none is quoted here.
- **Coarse descriptions only.** A Dominion card is described only as far as a common genre mechanic, such as "draws
  three" or "plays an Action twice". When I wasn't confident of a card's details, the row says "family" rather than
  naming numbers.
- **The owner should spot-check before relying on it.** Any row marked "exact" or "partial" is worth confirming
  before it drives a rename or a redesign.

### Verification in the final review (2026-11-19)

The final review checked the 69 new cards' analogues against two secondary sources. Both are community card lists,
not Rio Grande Games or Donald X. Vaccarino originals:

- [rspeer's Dominion card list](https://gist.github.com/rspeer/f3ed3c0070a2a78d84b2): card text by set.
- [dominionstrategy.com card list](https://dominionstrategy.com/card-lists/dominion-card-list/): card names, sets
  and costs.

Two primary sources could not be read: [the Dominion Strategy wiki](https://wiki.dominionstrategy.com/index.php/List_of_cards)
was behind a bot check, and [the Intrigue second edition rulebook](https://www.riograndegames.com/wp-content/uploads/2016/09/Dominion-Intrigue-2nd-Edition-Rules.pdf)
returned HTTP 403. Second-edition-only cards, such as Patrol, are therefore **from memory**.

In the new-card matrix at the end, **V** means the analogue's effect was checked against those sources and **M**
means it is from memory. Nothing was copied from them: rows describe the mechanic in a few words. The 88-card
matrix for the existing catalog was not re-checked and stays as it was written.

For the new cards, a fifth class is used:

| Class | Meaning |
|---|---|
| **Close** | The same core effect and role as one published card, with one or two changed numbers or riders. Each is kept only with a stated difference and is listed for the owner. |

### Classifications

| Class | Meaning |
|---|---|
| **Exact** | Same mechanical effect and numbers, ignoring theme. |
| **Partial** | Same core mechanic, with different numbers, conditions or riders. |
| **Shared** | Uses a common genre mechanic (for example "+2 Cards terminal" or "duration coins") without matching any one card. |
| **None** | No clear Dominion equivalent. Usually these cards depend on Influence or Projects. |

## Matrix: basics

| K&C card | Closest Dominion analogue | Class | Note |
|---|---|---|---|
| Bronze | Copper | Exact | |
| Silver | Silver | Exact | |
| Gold | Gold | Exact | |
| Homestead | Estate | Exact | |
| Noble Estate | Duchy | Exact | |
| Grand Duchy | Province | Exact | The game ends when the pile runs out. |
| Royal Debt | Curse | Partial | −1 Renown. When played, you may spend 1 Influence to trash it. |
| Starting deck (7 Bronze, 3 Homestead) | Starting deck | Exact | |

These six basics and the starting deck are the genre's shared skeleton and are disclosed in DECKBUILDER_LICENSING.md.

## Matrix: Core Set (36)

| K&C card | Closest Dominion analogue | Class | How K&C differs |
|---|---|---|---|
| Guild Apprentice | Courtyard (Intrigue) | Partial | Draws 2 and puts 1 on the **bottom** |
| Morning Bell | Village (Base) | Partial | Influence rider after another Action |
| Tally Clerk | Candlestick Maker (Guilds) | Partial | Influence instead of a stored coin, capped below 2 |
| Treadwheel Crane | Workshop family (Base) | Shared | +2 Coins and gains a card costing ≤2 |
| Coin Striker | Salvager (Seaside) | Partial | Half the cost in Coins, +1 Influence, no +Buy |
| Royal Architect | Nobles / Steward (Intrigue) | Shared | Modal: draw and discard, or Influence and +Buy |
| Winnowing Fan | Cellar (Base) | Partial | At most 2 cards, draws one extra, no +Action |
| Customs House | Lookout / Cartographer family | Shared | |
| Assayer | terminal +2 Cards | Shared | Reveal rider |
| Post Rider | Hamlet (Cornucopia) | Partial | |
| Keeper of the Rolls | Courtyard (Intrigue) | Partial | Puts 2 on top, +1 Influence |
| Trading Port | Laboratory (Base) | Partial | Adds +Buy and an Influence sink |
| Petitioner | — | None | |
| Lady-in-Waiting | — | None | |
| Audience Hall | Duration family (Seaside) | Shared | |
| Crown Treasury | stored-coin spending (Guilds) | Shared | |
| Guild Banquet | Woodcutter (Base, 1st ed.) | Partial | Adds +2 Influence |
| Privy Council | Smithy (Base) | Partial | +2 Influence; discard from the next hand |
| Road Warden | Spy (Base, 1st ed.) | Partial | Affects opponents only; +Coin instead of +Card |
| Royal Runner | Moat family | Shared | Reaction gives Influence instead of blocking |
| Tax Assessors | Militia (Base) | Partial | Discards one card, only from hands of 5+ |
| Alms House | Council Room (Base) | Partial | One chosen opponent draws, plus Influence |
| Licensing Hall | — | None | |
| Night Watch | Moat (Base) | Partial | Discard to cancel; plays for Coins |
| Toll Gate | Merchant Ship (Seaside) | Shared | |
| Scriptorium | Caravan (Seaside) | Partial | Terminal; draws 2 next turn |
| Cloister Garden | — | None | Projects |
| Market Stall | Merchant Ship (Seaside) | Partial | |
| Town Plans | Cartographer family | Shared | |
| Cloth Hall | Duration family | Shared | |
| Court Scholar | Great Hall (Intrigue, 1st ed.) | Partial | +Influence instead of +Action |
| Royal Chronicler | Action-Victory family | Shared | |
| Benefactors | Action-Victory family | Shared | |
| Silver Reliquary | — | None | |
| Foreign Envoy | — | None | |
| Builder's Honour | — | None | Projects |

## Matrix: Artisans' Row (11)

| K&C card | Closest Dominion analogue | Class | How K&C differs |
|---|---|---|---|
| Favour Purse | stored-coin Treasure family (Guilds, Renaissance) | Shared | |
| Merchant Bond | — | None | |
| Market Square | chain payoff family | Shared | **Same name as a Dark Ages card with a different effect** |
| Guild Procession | Conspirator (Intrigue) | Partial | Cantrip; at the third Action, +Buy and Influence |
| Tithe Barn | — | None | Repeating duration paid with Influence |
| Royal Commission | Haven / Prince family | Partial | Plays the Action next turn |
| Grain Sorter | Sentry (Base) | Partial | No trashing, no +Card |
| Ragpicker | Harbinger (Base) | Shared | To hand for Influence |
| Changing of the Guard | Cellar family | Partial | Whole hand, +1 |
| Lime Kiln | Chapel (Base) | Partial | Up to 2 |
| Favour Broker | — | None | |

## Matrix: Rival Houses (9)

| K&C card | Closest Dominion analogue | Class | How K&C differs |
|---|---|---|---|
| Town Gossip | — | None | |
| Tax Farmer | Mountebank (Prosperity) | Partial | Pay Influence or gain Debt |
| Guild Dispute | — | None | |
| Court Informer | — | None | |
| Sanctuary Writ | Moat (Base) | Partial | Pay Influence to cancel |
| Usurer | self-junking economy | Shared | |
| Royal Audit | Tribute (Intrigue, 1st ed.) | Partial | Your own deck; Debt for Renown cards |
| Royal Progress | — | None | |
| Debt Collector | — | None | |

## Matrix: The Chancery (8)

| K&C card | Closest Dominion analogue | Class | How K&C differs |
|---|---|---|---|
| Surveyor | Bridge (Intrigue) | Shared | Projects only |
| Borough Reeve | Embargo (Seaside) | Shared | |
| Royal Dedication | — | None | |
| Bellman | — | None | |
| Civic Tribute | — | None | |
| Civic Charter | — | None | |
| Guild Register | Vineyard (Alchemy) | Shared | Counts Establishments |
| Heraldic Painter | VP-token family (Prosperity) | Shared | |

## Matrix: Crown Decrees (24)

| K&C card | Closest Dominion analogue | Class | How K&C differs |
|---|---|---|---|
| Royal Confessor | Chapel (Base) | Partial | Up to 3; Influence per Renown card |
| Mintmaster | Mine (Base) | Partial | +Influence; to the deck |
| Estate Surveyor | Remodel (Base) | Partial | Renown cards only, +3 |
| Purification House | trash-for-draw family | Shared | |
| Salvage Office | Salvager (Seaside) | Shared | |
| Reclamation Guild | — | None | |
| Royal Tax Collector | Moneylender (Base) | Partial | Any Currency; Influence |
| Royal Scrivener | trash-from-discard family | Shared | |
| Noble Resettlement | Remodel family | Shared | |
| Burden Relief | — | Shared | |
| Treasury Auditor | Bank (Prosperity) | Shared | |
| Spice Exchange | — | Shared | |
| Trade Bonds | — | None | |
| Royal Mint | — | None | |
| Port Tariffs | — | None | |
| Guild Auction | Royal Seal (Prosperity) | Partial | Action; Influence per card |
| Kingdom Courier | Warehouse (Seaside) | Partial | Smaller numbers |
| Hall of Archives | Adventurer (Base, 1st ed.) | Partial | One card, chosen type |
| Great Council | Festival (Base) | Partial | Others gain Influence |
| Edict of Inspection | Militia family | Partial | |
| Tax Arrears | Torturer (Intrigue) | Partial | |
| Royal Advocate | Moat family | Shared | |
| Court Saboteur | Spy family | Shared | |
| Noble Council | Duke (Intrigue) | Partial | Counts Homesteads |

### Totals for the 88 market cards

| Class | Cards |
|---|---|
| Exact | 0 |
| Partial | 40 |
| Shared | 27 |
| None | 21 |

## Dominion sets and mechanics already represented

| Mechanic (set where it is most associated) | In K&C? |
|---|---|
| Base: cantrips, villages, terminal draw, Cellar/Chapel/Mine/Remodel/Militia/Moat families | yes |
| Intrigue: modal choices, Action-Victory cards, Conspirator chains, Torturer-style choices | yes |
| Seaside: durations, Haven-style set-aside, Salvager, Warehouse | yes (Establishments) |
| Prosperity: Bank-style Currency counting, VP tokens, Mountebank-style junking | partly |
| Hinterlands: on-gain and on-buy effects, reactions to others' gains | barely: Guild Auction and Port Tariffs only, both turn-scoped |
| Cornucopia: variety rewards, Hamlet | Hamlet only |
| Guilds: stored coin | yes, through Influence, which is more central than in Dominion |
| Dark Ages: trash-for-benefit | yes (Coin Striker, Salvage Office) |
| Renaissance: Projects | yes (Crown Projects, far more central than in Dominion) |
| Alchemy: Vineyard-style counting | Guild Register |

## Mechanics with no K&C representation yet, and allowed by this brief

- **Play an Action twice** (Throne-like). `play-card` already supports `times`.
- **Cost reduction this turn** (Bridge-like). `cost-mod` is supported and can be limited by type.
- **On-gain and on-trash effects on the card itself** (Hinterlands, Dark Ages). Trigger `where: 'self'` is supported.
- **Reacting to other players' buys** (Fool's Gold-like). Trigger `scope: 'others'` is supported.
- **Victory per card type**: Currency (Feodum-like) and Renown cards (Silk Road-like).
- **Trade a card for one of the same cost.**
- **Duration villages**, with set-aside for more than one card.

## Excluded by the brief

The design must not add these, even though Dominion has them:

- Night cards
- Prophecies and Omens
- Favors and Allies
- Exile
- Debt as a currency (Royal Debt as a junk card is a separate, existing K&C rule)
- New supply types: Events, Landmarks, Ways, Traits, Prizes or Ruins
- Coffers and Villagers as new resources
- Heirlooms
- Extra turns
- Persistent states such as Hexes or Boons

## How the new designs avoid copying

The manifest lists the closest Dominion reference for every new card, and says how the card differs. The rules
applied:

- **No numbers copied in full.** A new card never matches the full set of numbers of a published card. Where a
  mechanic is a genre staple, such as playing an Action twice, the card changes the cost cap, the fallback or the
  timing.
- **No Dominion names.** Single words that are Dominion card names are not used as names or as the core of a name,
  as far as known; this was not checked against an official list. For example, the designs avoid Market, Bazaar,
  Bridge, Haven, Warehouse, Wharf, Venture, Mint, Bank, Fair and Pageant. Fair and Pageant are Renaissance Project
  names.
- **No Dominion text.** No card text was copied. Rules text follows the existing K&C phrasing ("+1 Action. Gain 1
  Influence.").

## Matrix: the 69 proposed cards (final review)

Classes as above, plus **Close**. **V** means checked against the secondary sources, and **M** means from memory.
The analogues are for the revised card texts in the manifest.

| # | Proposed card | Closest Dominion analogue | Class | Check |
|---|---|---|---|---|
| A1 | Coin Clipper | Moneylender (Base) | Partial | V |
| A2 | Promissory Note | one-shot Treasure family | Shared | M |
| A3 | Florin Table | Baron (Intrigue) | Partial | V |
| A4 | Fondaco | Worker's Village (Prosperity) | Partial (was Close) | V |
| A5 | Underwriter | Fool's Gold (Hinterlands) | Partial | V |
| A6 | Lending House | none | None | |
| A7 | Wholesaler | Bridge (Intrigue) | Partial | V |
| A8 | Bookkeeper | Adventurer (Base, first edition) | Partial | V |
| A9 | Partnership | none | None | |
| A10 | Gilder | Explorer (Seaside) | Partial | V |
| A11 | Ledger Hall | Feodum (Dark Ages); Gardens (Base) | Partial | V |
| A12 | Compound Interest | Merchant Ship (Seaside) | Shared | V |
| A13 | Bourse | Woodcutter (Base, first edition) | Shared | V |
| A14 | Gold Florin | none | None | |
| B1 | Household Guard | Secret Chamber (Intrigue, first edition), reaction | Partial | V |
| B2 | Antechamber | Village (Base) | Partial | V |
| B3 | Bribed Magistrate | Militia (Base) | Partial | V |
| B4 | Counter-Intrigue | none | None | |
| B5 | Whispered Promise | duration family | Shared | M |
| B6 | Signoria | Envoy (Promo) | Shared | V |
| B7 | Hollow Title | junking-attack family | Shared | M |
| B8 | Purchased Office | Workshop (Base) | Shared | V |
| B9 | Court Purge | Chapel (Base) | Shared | V |
| B10 | Family Crest | none | None | |
| B11 | Marriage Pact | Great Hall (Intrigue) + Council Room (Base) | Shared | V |
| B12 | Majordomo | Pawn (Intrigue) | Partial | V |
| B13 | Palace Intrigue | Council Room (Base) | Partial | V |
| C1 | Sweeper | Sentry (Base, second edition); Lookout (Seaside) | Partial | V |
| C2 | Sketchbook | Inn / Oasis (Hinterlands) | Shared | M |
| C3 | Bottega | Village + Conspirator's condition (Intrigue) | Partial | V |
| C4 | Guild Diploma | Action-Victory family | Shared | V |
| C5 | Woodcarver | Workshop (Base) | Partial | V |
| C6 | Promotion | Remodel (Base); Upgrade (Intrigue) shared | Partial | V |
| C7 | Master's Hand | Throne Room (Base) | Partial | V |
| C8 | Open Studio | Laboratory + Council Room (Base) | Partial | V |
| C9 | Study Hall | Scrying Pool (Alchemy) V; Patrol (Intrigue, second edition) M | Partial | V / M |
| C10 | Patternmaker | none | None | |
| C11 | Atelier | Upgrade (Intrigue); Remodel (Base) | Partial | V |
| C12 | Schoolroom | Junk Dealer (Dark Ages) | Partial (was Close) | V |
| C13 | Lecture Hall | Smithy (Base) | Partial | V |
| C14 | Master's Fee | Conspirator (Intrigue); Library (Base) shared | Partial (was Close) | V |
| C15 | Maestro | free-play family | Shared | M |
| D1 | Harbour Pilot | Caravan (Seaside) | Partial | V |
| D2 | Dockhand | Harbinger (Base, second edition) | Partial | V |
| D3 | Barter Post | Remodel family | Shared | V |
| D4 | Quayside Sale | Secret Chamber (Intrigue, first edition) | Partial (was Close) | V |
| D5 | Ferry Landing | Fishing Village (Seaside) | Partial (was Close) | V |
| D6 | Chandler | Workshop (Base); Artisan (Base, second edition) | Partial | V |
| D7 | Bonded Store | Gear (Adventures); Haven (Seaside) | Partial (was Close) | V |
| D8 | Trade Agreement | none | None | |
| D9 | Cargo Manifest | none | None | |
| D10 | Grain Hoy | duration family | Shared | M |
| D11 | Hiring Day | none | None | |
| D12 | Customs Cutter | Bandit (Base, second edition) | Partial | V |
| D13 | Landing Rights | Goons (Prosperity) | Partial | V |
| D14 | Galleass | Wharf (Seaside) | Partial | V |
| E1 | Tenant Farmer | Baron (Intrigue) | Shared | V |
| E2 | Manor Court | Monument (Prosperity) | Partial | V |
| E3 | Votive Offering | when-trashed family; Feodum's trash clause | Shared | V |
| E4 | Banner Bearer | Village (Base) | Partial | V |
| E5 | Laurel Wreath | none | None | |
| E6 | Land Grant | none | None | |
| E7 | Grand Muster | Crossroads (Hinterlands) | Partial | V |
| E8 | Memorial Statue | none | None | |
| E9 | Point of Honour | Bureaucrat (Base) | Partial | V |
| E10 | Honour Guard | Fool's Gold (Hinterlands), reaction | Partial | V |
| E11 | Victory Parade | Bridge (Intrigue) | Shared | V |
| E12 | Chivalric Order | Silk Road (Hinterlands) | Partial | V |
| E13 | Royal Jubilee | none | None | |

### Totals for the 69 proposed cards

| Class | Cards |
|---|---|
| Exact | 0 |
| Close | 0 (6 before the 2026-11-20 revisions) |
| Partial | 39 |
| Shared | 17 |
| None | 13 |

Of the 56 cards with an analogue, 50 are verified (Study Hall counted once, by Scrying Pool) and 6 are from memory:
Promissory Note, Whispered Promise, Hollow Title, Sketchbook, Maestro and Grain Hoy. All six are family-level
"Shared" rows, where no single card was named.

### Close analogues: revised 2026-11-20

The owner kept all six cards' roles and asked for distinct effects. Each was revised before implementation (manifest,
"Close-analogue revisions"). After the revisions none of the 69 is Close: each now differs from its analogue in
mechanism, not only in numbers. The table below is the record of the earlier comparison.

#### Before the revisions

These six are kept, each with a stated difference. Keeping them is the first open question in the implementation
plan. None copies a card's full set of numbers, name or text.

| Card | Analogue | What is the same | What differs | If redesigned |
|---|---|---|---|---|
| Schoolroom | Junk Dealer | the trashing cantrip | no +1 Coin; costs less | the closest pair; it is also one of the genre's most generic designs |
| Fondaco | Worker's Village | +1 Card, +2 Actions and a Buy | the Buy is conditional; costs 3 | make the condition the card's identity |
| Master's Fee | Conspirator | the "third Action played" condition | terminal; draws 2 and +1 Buy instead of a cantrip | change the threshold or the counted thing |
| Quayside Sale | Secret Chamber | discard for +1 Coin each | non-terminal, capped at 3, no reaction | |
| Ferry Landing | Fishing Village | a duration village | a card next turn instead of Coins both turns | |
| Bonded Store | Gear | set aside up to 2 cards for next turn | +1 Coin instead of +2 Cards | |
