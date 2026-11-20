# Existing catalog audit

Kingdom & Commerce (internal game id `clockwork`), edition 4. This is a read-only audit for the five-expansion design
in [FIVE_EXPANSION_MANIFEST.md](FIVE_EXPANSION_MANIFEST.md). Nothing in the game changed.

**Source of truth.** The card tables below were generated from the live card definitions:

- `BASICS` and `CORE` in `src/games/clockwork/rules/cards.ts`
- `FOUNDRY`, `NIGHT` and `TOWN` in `src/games/clockwork/rules/expansions.ts`
- `CROWN` in `src/games/clockwork/rules/crown.ts`

The text is each card's `text` field verbatim. Project data comes from `ruleset.ts`, `expansions.ts` (`TOWN_WORKS`) and
`crown.ts` (`CROWN_WORKS`).

## Counts

| Set | Key | Kingdom Market cards | Crown Projects |
|---|---|---|---|
| Core Set | `core` | 36 | 8 |
| Artisans' Row | `foundry` | 11 | 0 |
| Rival Houses | `night` | 9 | 0 |
| The Chancery | `town` | 8 | 5 |
| Crown Decrees | `crown` | 24 | 2 |
| **Total** | | **88** | **15** |

There are also 7 basic piles, which are not market cards: Bronze, Silver, Gold, Homestead, Noble Estate, Grand Duchy and
Royal Debt. Royal Debt is unbuyable and appears only when the market contains one of the `RUST_MAKERS` cards.

**Discrepancy found.** docs/CLOCKWORK.md lists Artisans' Row as 10 cards and Rival Houses as 10. The code has 11 and 9.
The total of 88 matches, so a card appears to have moved between the two sets without the doc being updated. This is
only reported here, not fixed.

### Cost curve of the 88 market cards

| Cost | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|
| Cards | 8 | 22 | 34 | 21 | 5 | 2 |
| Share | 9% | 25% | 39% | 24% | 6% | 2% |

Basics: Bronze 0, Royal Debt 0, Homestead 2, Silver 3, Noble Estate 5, Gold 6, Grand Duchy 8.

### Types in use

| Printed type | Engine types | Examples |
|---|---|---|
| Action | `action` | most cards |
| Action · Attack | `action`, `attack` | Road Warden, Tax Farmer, Tax Arrears |
| Action · Reaction | `action`, `reaction` | Night Watch, Sanctuary Writ, Royal Advocate |
| Establishment | `action`, `duration` | Audience Hall, Scriptorium, Cloth Hall |
| Action · Renown | `action`, `victory` | Court Scholar, Benefactors, Civic Charter |
| Renown | `victory` | Silver Reliquary, Noble Council, Guild Register |
| Currency | `treasure` | Favour Purse, Trade Bonds, Royal Mint |
| Burden | `penalty` | Royal Debt only |

## Mechanics inventory

Card effects are typed data interpreted by `src/engine/deckbuilder/runtime.ts`. Every op the engine supports, and
whether the current catalog uses it:

| Engine op or value | Used now | Notes |
|---|---|---|
| `draw`, `actions`, `buys`, `coins` | yes | everywhere |
| `token` (Influence, `spark`) | yes | in about 60 effects, so Influence is close to universal |
| `vp` (Renown tokens) | yes | Heraldic Painter |
| `choose-cards`, `choose-pile`, `choose`, `choose-number`, `choose-player` | yes | `choose` supports `pick: N` different options |
| `choose-project`, `project-discount`, `project-surcharge` | yes | Chancery only |
| `may`, `if`, `repeat`, `until` (with `max`) | yes | |
| `move` (trash, discard, deck, deck-bottom, hand, play, supply, mat) | yes | `supply` (returning a card) and `mat` are barely used |
| `gain` (to discard, deck or hand; for another player) | yes | |
| `gain-card` (from the trash and so on) | rare | |
| `look`, `reveal`, `reveal-cards`, `select` | yes | |
| `pass-up` | yes | lifts a variable from an opponent's sub-effect to the player who played the card |
| `attack`, `each-other`, `immune`, `on-player` | yes | |
| `play-card` with `times` | `times: 1` only | Royal Commission. **No card plays an Action twice.** |
| `cost-mod` (this turn, filter by type or key) | **unused** | Bridge-style reductions are supported but no card uses one |
| `delay` (Establishment next turn) | yes | |
| `on` (this-turn trigger: gain, buy, trash, play and so on) | yes | Guild Auction, Port Tariffs, Reclamation Guild |
| card `triggers` (`where` play, hand or self; `scope` own, others or any) | yes | Bellman (others' claims) |
| `extra-turn` | **unused** | deliberately avoided |
| `custom` handler | yes | Tithe Barn only |
| Num `emptyPiles` | **unused by cards** | counts empty piles across the whole supply, basics included |
| Num `actionsPlayed` | yes | Guild Procession |
| Num `projects` | yes | Builder's Honour, Civic Tribute |
| VP `{ per, each, of }` | yes | Noble Council, Guild Register |
| VP formula `perToken`, `ownProjects`, `allProjects` | yes | Silver Reliquary, Builder's Honour |

Things the engine **cannot** express today, which matters for new designs:

- Counting distinctly named cards.
- Reading another player's token count (Influence is public, but no `Num` reads it).
- Counting the cards left in a supply pile.
- Granting Renown from the number of Renown tokens.
- Persistent effects beyond next turn, other than Tithe Barn's custom handler.

## Crown Project interactions

There are 15 Projects:

- Core (8): River Quay, Bell Tower, Charter Fair, King's Road, Stone Bridge, Hall of Records, River Mill, City Walls.
- The Chancery (5): `harbor_beacon`, `foundry_gate`, `power_exchange`, `rail_terminus`, `aqueduct`.
- Crown Decrees (2): Common Fields, Merchants' Guildhall.

Five are dealt per game and they are always on: `projectCount` is fixed in the ruleset, and there is no option to turn
Projects off. Completing a stage takes a Buy (CC-STAGE-5), and five completed Projects end the game.

Cards that read or change Projects:

| Card | Interaction |
|---|---|
| Cloister Garden | draws 2 if you completed a Project last turn |
| Builder's Honour | +1 Renown per own Project |
| Surveyor | Projects cost 1 Coin less this turn |
| Borough Reeve | surcharges a Project for others |
| Royal Dedication | rewards completing a Project this turn |
| Bellman | reacts to others' claims |
| Civic Tribute | Renown per Project completed by anyone |
| Civic Charter | +3 Coins if you completed a Project |

That is 8 of 88 cards. The other 80 work without Projects.

## Near-duplicates inside the catalog

These are same-family pairs. None is an exact copy, but a new card must not land on top of them.

| Family | Cards |
|---|---|
| Trash for coins and Influence | Coin Striker, Salvage Office, Royal Tax Collector |
| Trash up to N | Lime Kiln (2), Royal Confessor (3) |
| Renown remodel | Estate Surveyor (+3 Renown card), Noble Resettlement (Renown → Action +4) |
| Discard and draw | Winnowing Fan, Changing of the Guard, Kingdom Courier, Post Rider |
| Top-of-deck sift | Customs House, Grain Sorter, Town Plans |
| Cancel an attack | Night Watch, Sanctuary Writ, Royal Advocate |
| Opponent reveals top card | Road Warden, Court Saboteur |
| Hand-size attack at 5+ cards | Tax Assessors, Edict of Inspection |
| Coin durations | Toll Gate, Market Stall, Cloth Hall, Tithe Barn, Port Tariffs |
| Influence to Coins | Crown Treasury, Royal Mint, Favour Broker, plus the base conversion rule |
| Renown per X | Noble Council (Homestead), Guild Register (2 Establishments), Silver Reliquary (3 Influence), Civic Tribute (Projects) |
| Festival-like | Great Council, Guild Banquet |

## Reusable mechanics with room left

- **Playing an Action twice**: `play-card` with `times: 2`. It is not in the catalog.
- **This-turn cost reduction**: `cost-mod`. It is unused, and can be limited to Currency or Renown cards.
- **Gain to hand or to deck**: used lightly.
- **Card triggers on the card itself**: `where: 'self'` for on-gain and on-trash. No market card uses these.
- **Watching other players' buys and gains**: `scope: 'others'` card triggers. Only Bellman uses one, and it is
  Project-based.
- **`pass-up`**: aggregates what happens to opponents.
- **`select` by type**: for example, all Currencies among revealed cards.
- **VP per card type**: Currency and Action counts are unused.

## Stable IDs and rules to preserve

Card keys such as `copper_press` are persisted in saved games, so the design adds new keys only. Existing rules that
the design keeps as they are:

- The Influence cap of 8, and the conversion rule of 1 Coin each, at most 2 per turn.
- The 10-card market, with 10 cards per pile (12 at 5 or more players).
- The game-end rules: Grand Duchy, 3 empty market piles (4 at 5 or more players), or 5 Projects, then finish the round.
- The Royal Debt rule (`RUST_MAKERS`).

The design adds no Debt-giving cards, so `RUST_MAKERS` is unchanged.

## Naming findings

- **Market Square** (`relay_junction`, Artisans' Row) shares its exact name with a published Dominion card. D25 in
  docs/DECISIONS.md says no Dominion names were used, so this deserves a rename decision. A rename keeps the key.
- Close echoes, not exact matches:
  - Guild Procession (Procession)
  - Royal Mint (Mint)
  - Court Scholar (Scholar)
  - Night Watch (Night Watchman)
  - Crown Treasury (Treasury)
  - Great Council (Council Room)
  - Trading Port (Trading Post)
- docs/CLOCKWORK.md already flags Royal Confessor, Mintmaster and Great Council as same-family as a published
  staple, and Winnowing Fan as resembling one.

These checks use general knowledge of the published Dominion card list. They were not checked against an official
card list; see [DOMINION_COMPARISON.md](DOMINION_COMPARISON.md).

## Balance evidence the design responds to

- **docs/CLOCKWORK_BALANCE.md** (round-robin win %):

  | Style | Win % |
  |---|---|
  | Works | 71.1 |
  | Spark | 60.0 |
  | Devices | 59.3 |
  | Interaction | 58.9 |
  | Balanced | 52.7 |
  | Defence | 50.0 |
  | Scoring | 48.0 |
  | Economy | 47.5 |
  | Cycling | 43.9 |
  | Risk | 43.2 |
  | Combo | 36.4 |
  | Thinning | 29.1 |

- **docs/BOT_BENCHMARK.md**, edition 4 mixed tables (results as a multiple of a fair share):

  | Strategy | Result |
  |---|---|
  | Influence Engine | 2.10× |
  | Crown Project Development | 1.71× |
  | Money, Scoring and Cycling | about 0.6× |

- **docs/PROJECT_BUYS_RESULTS.md**: Spark 49%, Works 41% and Thinning 7%. **No game ended on piles** at any player
  count.
- **Reading.** Influence and Projects are the strong axes. Money, Cycling, Combo and Thinning are weak. Part of
  Thinning's weakness is likely the bot, not the cards. Piles almost never run out, so cards that pay off on empty
  piles would rarely fire.

## Card catalog

### Basics: 7 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `scrap` | Bronze | 0 | Currency | +1 Coin. |
| `cog` | Silver | 3 | Currency | +2 Coins. |
| `dynamo` | Gold | 6 | Currency | +3 Coins. |
| `notebook` | Homestead | 2 | Renown | 1 Renown. |
| `blueprint` | Noble Estate | 5 | Renown | 3 Renown. |
| `monument` | Grand Duchy | 8 | Renown | 6 Renown. The game ends when this pile runs out. |
| `rust` | Royal Debt | 0 | Burden | −1 Renown. When played, you may spend 1 Influence to trash this. Trashed, it no longer counts. |

### Core Set (`core`): 36 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `gearwright` | Guild Apprentice | 3 | action | Draw 2. Put a card from your hand on the bottom of your deck. |
| `shift_bell` | Morning Bell | 3 | action | Draw 1. +2 Actions. If you already played another Action this turn, gain 1 Influence. |
| `tally_clerk` | Tally Clerk | 2 | action | +1 Action. +1 Buy. If you have fewer than 2 Influence, gain 1 Influence. |
| `supply_crane` | Treadwheel Crane | 4 | action | +2 Coins. Gain a card costing up to 2 to your discard. |
| `copper_press` | Coin Striker | 4 | action | Trash a card from your hand. +1 Coin per 2 of its cost, rounded up. Gain 1 Influence. |
| `foreman` | Royal Architect | 5 | action | +1 Action. Choose: draw 3 then discard 1; or gain 2 Influence and +1 Buy. |
| `paper_fan` | Winnowing Fan | 2 | action | Discard up to 2 cards. Draw that many plus 1. |
| `conveyor` | Customs House | 3 | action | +1 Action. Look at the top 3 of your deck. Put one in your hand and the rest on the bottom in any order. |
| `sorting_glasses` | Assayer | 4 | action | Draw 2. Reveal a card from your hand. If it is a Establishment, gain 1 Influence; otherwise +1 Coin. |
| `springboard` | Post Rider | 4 | action | +2 Actions. You may discard a card to gain 1 Influence and draw 1. |
| `clockwork_archive` | Keeper of the Rolls | 5 | action | Draw 3. Put 2 cards from your hand on top of your deck in any order. Gain 1 Influence. |
| `whistle_stop` | Trading Port | 5 | action | +1 Action. +1 Buy. Draw 2. You may spend 1 Influence to draw 1 more. |
| `hand_crank` | Petitioner | 2 | action | Gain 2 Influence. Discard a card. |
| `charge_meter` | Lady-in-Waiting | 3 | action | +1 Action. Gain 1 Influence. Then if you have 4 or more Influence, draw 1. |
| `capacitor_bank` | Audience Hall | 4 | Establishment | At the start of your next turn, gain 3 Influence and draw 1. |
| `steam_diverter` | Crown Treasury | 4 | action | Spend up to 3 Influence. +2 Coins per Influence spent. |
| `glow_mason` | Guild Banquet | 5 | action | +1 Buy. +2 Coins. Gain 2 Influence. |
| `overcharge_lab` | Privy Council | 6 | action | Draw 3. Gain 2 Influence. After this turn’s cleanup, discard a card from your new hand. |
| `signal_tower` | Road Warden | 3 | Action · Attack | +1 Action. +1 Coin. Each opponent reveals their top card, then puts it on the bottom of their deck or discards it. |
| `city_messenger` | Royal Runner | 4 | Action · Reaction | Draw 1. +1 Buy. When another player plays an Attack, you may reveal this from your hand to gain 1 Influence. |
| `inspection_team` | Tax Assessors | 4 | Action · Attack | +2 Coins. Each opponent with at least 5 cards in hand discards a card of their choice. |
| `mutual_aid` | Alms House | 4 | action | Draw 2. Choose an opponent: they draw 1, and you gain 2 Influence. |
| `permit_office` | Licensing Hall | 5 | action | +1 Action. +1 Buy. Choose an opponent. They may discard a card to gain 1 Influence. If they decline, you gain 1 Influence. |
| `night_watch` | Night Watch | 5 | Action · Reaction | +2 Coins. +1 Influence. When another player plays an Attack, you may reveal this from your hand and discard a card to cancel its effects on you. |
| `maintenance_cart` | Toll Gate | 3 | Establishment | At the start of your next turn, +1 Coin and gain 1 Influence. |
| `lamplighter` | Scriptorium | 4 | Establishment | Draw 1. At the start of your next turn, draw 2. |
| `clock_garden` | Cloister Garden | 4 | action | +1 Action. Gain 1 Influence. If you completed a Crown Project on your previous turn, draw 2. |
| `gear_lease` | Market Stall | 5 | Establishment | +2 Coins. At the start of your next turn, +1 Buy and +1 Coin. |
| `city_blueprint` | Town Plans | 5 | action | +1 Action. Look at the top 4 of your deck. Keep up to 2 in your hand and discard the rest. Gain 1 Influence. |
| `grand_engine` | Cloth Hall | 7 | Establishment | +2 Coins. Gain 1 Influence. At the start of your next turn, +2 Coins and draw 2. |
| `civic_scholar` | Court Scholar | 3 | Action · Renown | Draw 1. Gain 1 Influence. Worth 1 Renown. |
| `museum_curator` | Royal Chronicler | 4 | Action · Renown | Draw 2, then discard a card. Worth 2 Renown. |
| `patron_circle` | Benefactors | 5 | Action · Renown | +1 Buy. +2 Coins. Worth 2 Renown. |
| `silver_statue` | Silver Reliquary | 5 | Renown | Worth 1 Renown, plus 1 per 3 Influence you hold at the end of the game. |
| `civic_embassy` | Foreign Envoy | 6 | Action · Renown | +1 Action. Gain 2 Influence. You may give 1 Influence to an opponent to draw 2. Worth 3 Renown. |
| `inventors_medal` | Builder’s Honour | 7 | Renown | Worth 6 Renown, plus 1 per Crown Project you completed. |

### Artisans' Row (`foundry`): 11 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `spark_coil` | Favour Purse | 3 | Currency | +1 Coin. Gain 1 Influence. |
| `brass_bond` | Merchant Bond | 4 | Currency | +2 Coins. If you have 3 or more Influence, +1 Coin more. |
| `relay_junction` | Market Square | 3 | action | +1 Action. +1 Coin per other Action you played this turn, up to 3. |
| `chain_drive` | Guild Procession | 5 | action | Draw 1. +1 Action. If this is your third or later Action this turn, +1 Buy and gain 2 Influence. |
| `flywheel` | Tithe Barn | 4 | Establishment | +1 Coin. At the start of your next turn, +2 Coins; you may then spend 1 Influence to repeat this at the start of the turn after. |
| `timer_switch` | Royal Commission | 3 | Establishment | You may set aside an Action from your hand. At the start of your next turn, play it. |
| `belt_sorter` | Grain Sorter | 2 | action | +1 Action. Look at the top 2 of your deck. Discard any of them and put the rest back in any order. |
| `salvage_hook` | Ragpicker | 4 | action | +1 Action. You may spend 1 Influence to put a card from your discard into your hand. |
| `millrace` | Changing of the Guard | 5 | action | Discard your hand. Draw that many cards plus 1. Gain 1 Influence. |
| `slag_furnace` | Lime Kiln | 3 | action | Trash up to 2 cards from your hand. If you trashed 2, gain 1 Influence. |
| `spark_exchange` | Favour Broker | 4 | action | +1 Buy. Choose: spend 2 Influence for +3 Coins; or discard 2 cards for 2 Influence. |

### Rival Houses (`night`): 9 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `picket_line` | Town Gossip | 3 | Action · Attack | +1 Coin. Each opponent with 3 or more Influence loses 1 Influence. |
| `corrosion_crew` | Tax Farmer | 5 | Action · Attack | +2 Coins. Each opponent spends 1 Influence or gains a Royal Debt. |
| `noise_complaint` | Guild Dispute | 4 | Action · Attack | Draw 1. +1 Action. Each opponent with a Establishment in play loses 1 Influence or discards a card, their choice. |
| `whistleblower` | Court Informer | 3 | Action · Reaction | +1 Action. +1 Coin. When another player plays an Attack, you may reveal this from your hand: that player loses 1 Influence. |
| `ground_wire` | Sanctuary Writ | 2 | Action · Reaction | +1 Action. If you have no Influence, gain 1 Influence. When another player plays an Attack, you may reveal this from your hand and spend 1 Influence to cancel its effects on you. |
| `redline_boiler` | Usurer | 3 | action | +3 Coins. +1 Buy. Gain a Royal Debt. |
| `pressure_test` | Royal Audit | 4 | action | Reveal the top 3 of your deck: +1 Coin per Currency, 1 Influence per Action, a Royal Debt per Renown card. Discard them. |
| `overload_relay` | Royal Progress | 6 | action | Spend all your Influence. Draw 1 per Influence spent, up to 5. If you spent 4 or more, gain a Royal Debt. |
| `scrapyard_broker` | Debt Collector | 2 | action | +1 Action. You may trash a Royal Debt from your hand for +3 Coins. Otherwise +1 Coin. |

### The Chancery (`town`): 8 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `surveyor` | Surveyor | 3 | action | +1 Action. +1 Buy. Crown Projects cost you 1 Coin less this turn. |
| `zoning_board` | Borough Reeve | 4 | action | +1 Action. Gain 1 Influence. Choose an open Crown Project: it costs other players 2 Coins more until your next turn. |
| `ribbon_cutter` | Royal Dedication | 4 | action | +1 Action. +1 Coin. The next time you complete a Crown Project this turn, gain 2 Influence and +1 Buy. |
| `town_crier` | Bellman | 3 | action | Draw 1. +1 Action. When another player completes a Crown Project, you may reveal this from your hand to gain 1 Influence. |
| `civic_bond` | Civic Tribute | 5 | Renown | Worth 1 Renown per Crown Project completed by anyone. |
| `city_charter` | Civic Charter | 6 | Action · Renown | +1 Action. +1 Buy. If you have completed a Crown Project, +3 Coins; otherwise +1 Coin. Worth 2 Renown. |
| `patent_ledger` | Guild Register | 4 | Renown | Worth 1 Renown per 2 Establishments you own. |
| `plaque_foundry` | Heraldic Painter | 3 | action | +1 Action. Up to twice, you may spend 2 Influence for 1 Renown. |

### Crown Decrees (`crown`): 24 cards

| Key | Name | Cost | Type | Effect (card text) |
|---|---|---|---|---|
| `royal_confessor` | Royal Confessor | 4 | action | Trash up to 3 cards from your hand. Gain 1 Influence per Renown card trashed. |
| `mintmaster` | Mintmaster | 5 | action | You may trash a Currency from your hand. If you do, gain 1 Influence and a Currency costing up to 3 more on top of your deck. |
| `estate_surveyor` | Estate Surveyor | 4 | action | +1 Coin. You may trash a Renown card from your hand. If you do, gain a Renown card costing up to 3 more. |
| `purification_house` | Purification House | 3 | action | You may trash a card from your hand. If it was a Renown card or a Royal Debt, draw 2. If it was anything else, draw 1. |
| `salvage_office` | Salvage Office | 4 | action | Trash a card from your hand. If it cost 3 or more, +3 Coins and +1 Buy. Otherwise, gain 2 Influence. |
| `reclamation_guild` | Reclamation Guild | 3 | action | +1 Action. +1 Coin. For the rest of this turn, each time you trash a card, +1 Coin. |
| `royal_tax_collector` | Royal Tax Collector | 4 | action | +2 Coins. You may trash a Currency from your hand to gain 1 Influence, plus 1 per 3 of its cost. |
| `royal_scrivener` | Royal Scrivener | 4 | action | Draw 1. +1 Action. You may trash a card from your discard pile. |
| `noble_resettlement` | Noble Resettlement | 4 | action | +1 Action. You may trash a Renown card from your hand. If you do, gain an Action costing up to 4 more to your hand. |
| `burden_relief` | Burden Relief | 2 | action | +1 Action. You may trash a non-Currency card costing up to 2 from your hand. If you do, +2 Coins, and if it was a Royal Debt, gain 1 Influence too. |
| `treasury_auditor` | Treasury Auditor | 4 | action | +1 Action. +1 Coin per Currency costing 3 or more in your hand, up to 3. |
| `spice_exchange` | Spice Exchange | 5 | Currency | +2 Coins. Gain 1 Influence. |
| `trade_bonds` | Trade Bonds | 4 | Currency | +2 Coins. If you have 3 or more Currency cards in your hand and in play, counting this, +1 Buy. |
| `royal_mint` | Royal Mint | 5 | Currency | +2 Coins. You may spend 2 Influence for +3 Coins more. |
| `port_tariffs` | Port Tariffs | 4 | Establishment | +1 Coin. At the start of your next turn, +1 Buy, and for that turn each Currency you buy gains you 1 Influence. |
| `guild_auction` | Guild Auction | 4 | action | +1 Buy. +2 Coins. This turn, when you gain a card, you may spend 1 Influence to put it on top of your deck. |
| `kingdom_courier` | Kingdom Courier | 4 | action | Draw 2. +1 Action. Discard a card. |
| `hall_of_archives` | Hall of Archives | 3 | action | +1 Action. Choose Action or Currency. Reveal from your deck until you reveal one, put it in your hand and discard the others. |
| `great_council` | Great Council | 5 | action | +2 Actions. +1 Buy. +2 Coins. Each other player gains 1 Influence. |
| `edict_of_inspection` | Edict of Inspection | 4 | Action · Attack | +1 Action. +1 Coin. Each opponent with 5 or more cards in hand reveals 2 of their choice. You choose which of the 2 they discard. |
| `tax_arrears` | Tax Arrears | 4 | Action · Attack | +1 Coin. +1 Buy. Each opponent discards a Currency, or gains a Royal Debt. |
| `royal_advocate` | Royal Advocate | 3 | Action · Reaction | +1 Buy. +2 Coins. When another player plays an Attack, you may reveal this from your hand and put it on the bottom of your deck to cancel its effects on you. |
| `court_saboteur` | Court Saboteur | 5 | Action · Attack | +2 Coins. Each opponent reveals the top 2 of their deck. You choose one to discard, and the other goes back on top. |
| `noble_council` | Noble Council | 5 | Renown | Worth 1 Renown per Homestead you own. |

The card-by-card Dominion analogue matrix is in [DOMINION_COMPARISON.md](DOMINION_COMPARISON.md).
