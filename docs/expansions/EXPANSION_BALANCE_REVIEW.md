# Expansion balance review

This is a desk review of [FIVE_EXPANSION_MANIFEST.md](FIVE_EXPANSION_MANIFEST.md). **No card has been simulated.**
Every judgement below is a prediction to confirm with the bench runs listed in
[EXPANSION_IMPLEMENTATION_PLAN.md](EXPANSION_IMPLEMENTATION_PLAN.md).

**Final review, 2026-11-19.** Eight cards were revised: Royal Jubilee, Hollow Title, Ledger Hall, Master's Hand,
Trade Agreement, Votive Offering, Memorial Statue and Victory Parade. The tables below are updated to match. The
analytical checks and the 69-card audit are at the end. They are hand arithmetic, not simulation.

## Cost curve

| Cost | 2 | 3 | 4 | 5 | 6 | 7 | Total |
|---|---|---|---|---|---|---|---|
| Existing 88 | 8 (9%) | 22 (25%) | 34 (39%) | 21 (24%) | 5 (6%) | 2 (2%) | 88 |
| New 69 | 8 (12%) | 17 (25%) | 25 (36%) | 14 (20%) | 5 (7%) | 0 | 69 |
| Republics | 2 | 4 | 3 | 4 | 1 | – | 14 |
| Houses | 1 | 4 | 5 | 2 | 1 | – | 13 |
| Masters | 2 | 3 | 7 | 2 | 1 | – | 15 |
| Ports | 2 | 3 | 4 | 4 | 1 | – | 14 |
| Glory | 1 | 3 | 6 | 2 | 1 | – | 13 |

- **The curve matches the existing shares to within about 4 points at every cost.**
- **There are no 7-cost cards.** That is deliberate: the existing two 7s, Cloth Hall and Builder’s Honour, are
  Influence- or Project-linked, and a new 7 would mostly speed up Works. Each set has one 6 as its capstone.
- **Masters leans on 4s** (7 of 15). A market dealt only from Masters will be 4-heavy, which is fine with Silver at 3.
- **Every set has at least one opener at 2 and at least three at 3,** so a market from a single set always has
  openings for a 5/2 or 4/3 split.

## Role mix per set

| Role | Republics | Houses | Masters | Ports | Glory |
|---|---|---|---|---|---|
| Village (+2 Actions) | Fondaco | Antechamber | Bottega | Ferry Landing | Banner Bearer |
| Draw | Bookkeeper | Palace Intrigue, Signoria | Lecture Hall, Open Studio, Study Hall, Maestro | Cargo Manifest, Galleass | Grand Muster, Manor Court |
| Economy (terminal) | Lending House, Bourse, Gilder | Hollow Title, Majordomo | Master's Fee | Dockhand, Hiring Day, Landing Rights | Land Grant, Victory Parade, Royal Jubilee |
| +Buy | 9 cards | 3 | 3 | 4 | 4 |
| Thinning | Coin Clipper (Bronze) | Court Purge | Sweeper, Guild Diploma, Schoolroom, Atelier, Promotion | Barter Post | (Votive pays on trash) |
| Gaining | Gilder, Partnership | Purchased Office | Woodcarver, Patternmaker, Atelier, Promotion | Chandler, Barter Post | Land Grant, Honour Guard |
| Duration | Compound Interest | Whispered Promise | – | 6 Establishments | – |
| Attack | – | Bribed Magistrate, Hollow Title | – | Customs Cutter | Point of Honour |
| Reaction | Underwriter | Household Guard, Counter-Intrigue | – | – | Honour Guard |
| Alternative scoring | Ledger Hall | Family Crest, Marriage Pact | Guild Diploma | Landing Rights | Memorial Statue, Chivalric Order, Votive Offering, Manor Court |
| Currency | Promissory Note, Gold Florin | – | – | – | Laurel Wreath |

**Every set can stand alone.** Each has a village, draw, economy, +Buy and a thinner or trash-adjacent card.

**Gaps worth knowing:**

- Masters has no Attack or Reaction. That fits its theme, and the core reactions are always available in mixed
  markets.
- Republics and Masters have no Attack. A single-set market from either would be a non-interactive game. That is
  acceptable; Houses is the set for interaction.
- Glory has no hard thinner. It relies on Votive Offering's payoff and on mixed markets.

## Response to the benchmark findings

The design adds strength along the weak axes and avoids strengthening the dominant ones. **No existing card is
changed or nerfed.**

| Weak style (existing results) | New support |
|---|---|
| Money / Economy (≈0.6×, 47.5%) | Gold Florin, Wholesaler, Gilder, Ledger Hall, Compound Interest, Bookkeeper |
| Thinning (29.1%) | Sweeper, Schoolroom, Guild Diploma, Coin Clipper, Atelier |
| Combo (36.4%) | Master's Hand, Maestro, Bottega, Master's Fee, Patternmaker |
| Cycling (43.9%) | Sketchbook, Tenant Farmer, Quayside Sale, Harbour Pilot, Dockhand |
| Scoring (48.0%) | Laurel Wreath, Chivalric Order, Victory Parade, Manor Court, Landing Rights |

| Dominant style | What the design avoids |
|---|---|
| Influence Engine (2.10×) | Only four of the 69 cards *gain* Influence for their player: Whispered Promise (1, then a sink), Signoria (opponent-picked mode), Majordomo (one mode of four) and Bourse (none; it is a sink). Five cards *spend* it. Three cards give it to an opponent. The net effect should be a small Influence sink. |
| Crown Project Development (1.71×) | No card names, discounts or reacts to Projects. Extra +Buys (Hiring Day and others) still fund Project stages through CC-STAGE-5, which is the main leak. |

**Not done on purpose:** a card designed to beat Influence, such as "each opponent loses 2 Influence". The brief rules
out designing cards to correct bot results, and an anti-Influence attack would make Influence more central to the
game.

## Influence ledger

| Card | Self | Opponents |
|---|---|---|
| Whispered Promise | +1, then may spend 2 | – |
| Signoria | +2 if the opponent chooses that mode | – |
| Majordomo | +1 as one optional mode | – |
| Bourse | spends 2 | – |
| Antechamber | spends 1 | – |
| Bribed Magistrate | spends 2 | – |
| Purchased Office | spends 3 | – |
| Family Crest | – | one chosen opponent +1 |
| Palace Intrigue | – | one chosen opponent +2 |
| Marriage Pact, Open Studio | – | an opponent draws instead (no Influence) |

## Attacks and reactions

There are four new Attacks and four new Reactions. The existing catalog has 8 Attacks and 5 Attack Reactions.

| Attack | Severity | Note |
|---|---|---|
| Bribed Magistrate | low | Paid with Influence; affects hands of 5+ only; self-limiting |
| Hollow Title | low | Gives one chosen opponent a Homestead, which is junk but +1 Renown |
| Customs Cutter | low | Discards a Currency, doesn't trash it |
| Point of Honour | low | Topdecks a Renown card; it does nothing against a hand with no Renown |

| Reaction | Trigger | Note |
|---|---|---|
| Household Guard | an Attack | hand fix, not a cancel |
| Counter-Intrigue | an Attack | punishes the attacker |
| Underwriter | an opponent's buy costing 6+ | not an Attack reaction |
| Honour Guard | an opponent's Grand Duchy gain | not an Attack reaction |

**None of the attacks is harsh, and none hands out Royal Debt.** Their effect on the Interaction style (58.9%) should
be neutral to slightly positive.

## Overlap checks against existing families

| Existing family | New card nearby | Why it is not a duplicate |
|---|---|---|
| Trash for coins and Influence | Coin Clipper | Bronze only, non-terminal, gives a Buy |
| Trash up to N | Court Purge | Opponents may also trash; no Influence |
| Renown remodel | Atelier, Promotion | Exact +2 on any card; Action to Action +2 |
| Discard and draw | Sketchbook, Tenant Farmer | Draw 1 and discard 1 with an Action refund; Renown-only discard |
| Top-of-deck sift | Sweeper, Study Hall, Harbour Pilot | Trashes; takes Actions with a window of 4; is a duration |
| Cancel an attack | Household Guard, Counter-Intrigue | Neither cancels |
| Opponent reveals top card | Customs Cutter, Counter-Intrigue | Currency-only discard; the attacker is the target |
| Hand-size attack at 5+ | Bribed Magistrate | Paid with Influence and non-terminal |
| Coin durations | Compound Interest, Grain Hoy | Variable based on Currency; picks a card now |
| Influence to Coins | Bourse, Purchased Office | Convert into cards, not Coins |
| Renown per X | Ledger Hall, Chivalric Order | Currency and Renown cards are new counters |
| Festival-like | Majordomo | Modal pick of 2 |

**Overlaps between the new sets:**

- **Five villages with different riders:** Fondaco, Antechamber, Bottega, Ferry Landing and Banner Bearer. This is
  intentional, so every set has a village of its own. They should not usually all appear in one market.
- **Bookkeeper and Study Hall** mirror each other: Currency or Action from the top 4.
- **Florin Table and Lending House** are both "Currency from hand for 2 Coins". Lending House is the first cut if
  Republics gets trimmed.
- **Woodcarver and Chandler** are both "gain up to 3". They differ in destination (deck vs hand) and refund.

## Combo and edge risks

| Risk | Cards | Assessment | Mitigation |
|---|---|---|---|
| Throne chains | Master's Hand ×2, Maestro | Bounded by hand size; the cost cap of 4 excludes 5 and 6 payoffs | Cap; bench Combo |
| Doubled Influence | Master's Hand + Lady-in-Waiting, Petitioner | Was +4 from a doubled Petitioner | **Revised:** at most +1 Influence net from the two plays |
| Gardens rush | Ledger Hall + 0-cost Bronze + Wholesaler + Hiring Day | Was the classic Gardens pattern | **Revised:** Bronze no longer counts; per 3 non-Bronze Currency |
| Cost-mod stacking | Wholesaler ×3 → Gold at 3 | Currency only | Fine; it is the point of the card |
| Cheaper greening | Victory Parade ×2 | Was Grand Duchy at 6 | **Revised:** Homestead and Noble Estate only; the Grand Duchy clock is unchanged |
| Trash-for-points | Votive Offering + Coin Striker, Salvage Office | Was 2 Renown + full refund | **Revised:** +1 Renown on trash |
| 6-player reactions | Underwriter | Several Silvers per round | Kept: Silver pile of 40, once per copy per buy, 6+ only |
| Junk with points | Hollow Title + Noble Council | Was every opponent | **Revised:** one chosen opponent; the attacker can avoid a Noble Council owner |
| Low piles | Memorial Statue | 0% pile-outs in benches made the old card dead | **Revised:** counts piles at 2 or fewer, capped at +3 |
| Endgame clock | Royal Jubilee | A fixed 4 meant 22–50% of the pile left | **Revised:** half the starting pile |
| Kingmaking | Partnership, Signoria, Marriage Pact, Palace Intrigue, Open Studio, Family Crest, Trade Agreement | Choose an opponent to help | Small amounts; accepted, as with Alms House |
| Hidden set-aside | Bonded Store | Mat contents must stay private | **Checked:** the projection already hides other seats' mats. Add a leak test. |

## Complexity

| Complexity | Cards |
|---|---|
| Low | 53 |
| Medium | 16: Underwriter, Partnership, Bribed Magistrate, Signoria, Majordomo, Promotion, Master's Hand, Patternmaker, Maestro, Barter Post, Bonded Store, Trade Agreement, Hiring Day, Customs Cutter, Honour Guard, Royal Jubilee |
| High | 0. Trade Agreement was high until its own discard became mandatory. |

The new sets average lower complexity than Crown Decrees.

## Analytical checks from the final review

All of these are hand arithmetic from the card text and the ruleset's pile sizes. **No simulation or bench run was
done for this review.** The figures are reasoning to check against the bench runs in the implementation plan, not
measured results.

### Ledger Hall (revised)

| Deck at game end | Non-Bronze Currencies | Old value (per 4, all Currency) | New value (per 3, no Bronze) |
|---|---|---|---|
| Starting deck only | 0 | 1 (7 Bronze) | 0 |
| Typical Money: 6 Silver, 3 Gold, 7 Bronze | 9 | 4 | 3 |
| Heavy Money: 8 Silver, 4 Gold, 2 Kingdom Currencies, 7 Bronze | 14 | 5 | 4 |
| Bronze rush: 30 extra Bronze bought with spare Buys, 4 Silver, 7 Bronze | 4 | 10 | 1 |

- The rush line was the problem. Three copies made it worth about 30 Renown for no Coins, at the cost of a diluted
  deck. Now it is worth 3.
- Every counted card now costs at least 2. Each Renown takes about 3 cards, and at 3 Coins per Silver that is about
  9 Coins of Currency per Ledger Hall copy. Compare 5 Coins for a 3-Renown Noble Estate. Ledger Hall is better
  only in a deck that wanted those Currencies anyway, which is the intended identity.

### Votive Offering (revised)

| Trash outlet | What the trash gives | With +2 Renown | With +1 Renown |
|---|---|---|---|
| Salvage Office | +3 Coins and +1 Buy (it costs 3) | its 3-Coin price back plus 2 Renown | its price back plus 1 Renown |
| Coin Striker | +2 Coins, +1 Influence | 2 Renown and most of its price back | 1 Renown and most of its price back |
| Reclamation Guild in play | +1 Coin per trash | stacks on either | stacks on either |
| Atelier, Promotion, Barter Post | a better card | an upgrade plus 2 Renown | an upgrade plus 1 Renown |

With +2, a Votive bought for 3 and trashed by Salvage Office was 2 free Renown and a free Buy. Repeating that each
turn beat buying Noble Estates. With +1 it is about a Homestead that refunds itself and leaves the deck. That still
rewards trashing.

### Master's Hand Influence limit

| Doubled card (cost ≤ 4) | Influence before | Influence after |
|---|---|---|
| Petitioner (+2) | +4 | +1 |
| Lady-in-Waiting | doubled | capped at +1; its draw still happens twice |
| Any +1 Influence card costing 4 or less, such as Court Scholar | +2 | +1 |
| Crown Treasury or any Influence spender | net negative | unchanged, nothing refunded |

The limit only affects Influence gainers costing 4 or less. Doubled draw, Coins and attacks are untouched.

### Underwriter at 6 players

- The Silver pile has 40 cards at every player count.
- Each Underwriter in hand reacts at most once per buy, and only to cards costing 6 or more, such as Gold, Gold
  Florin, Palace Intrigue, Maestro, Galleass, Royal Jubilee and Grand Duchy.
- A plausible high case is 3 such buys per round at a 6-player table, with each one meeting 1 or 2 Underwriters in
  hand. That is about 3–6 Silvers per round, or 7–13 rounds to empty the pile with no other gainers.
- Gilder, Bourse, Partnership and Customs Cutter share the pile. An empty Silver pile is a basic pile, so it never
  ends the game. It stops the reactions and makes Silver unbuyable, which would be noticeable but not game-breaking.
- **Kept unchanged.** Benching should record Silver pile-outs at 5 and 6 players.

### Royal Jubilee thresholds

The pile starts at 8, 12, 12, 15 and 18 cards at 2, 3, 4, 5 and 6 players. The old fixed threshold of 4 meant 50%,
33%, 33%, 27% and 22% of the pile was left. The revised "half or fewer" threshold is 4, 6, 6, 7 and 9: the same
share of the game at every table size, and identical at 2 players.

### Memorial Statue estimate

The revised card counts piles with 2 or fewer cards left. Near the end of a Grand Duchy race the Grand Duchy pile
itself qualifies. A contested 10-card market pile often does too. A Memorial Statue gained in the last rounds is
therefore expected to be worth 2–3 Renown, and 1 earlier. That is an estimate, not a measurement: benches report 0%
pile-outs but do not report low piles.

### Hollow Title

| Players | Homesteads handed out per play (old) | (new) | Renown given away per play (old) | (new) |
|---|---|---|---|---|
| 2 | 1 | 1 | 1 | 1 |
| 4 | 3 | 1 | 3 | 1 |
| 6 | 5 | 1 | 5 | 1 |

## Audit of all 69 cards

Columns:

- **Overlap:** the nearest card in the existing catalog or the new sets, and whether it is a duplicate. No card is
  an exact duplicate.
- **Combo / loop:** the strongest interaction found and whether it can loop. No card can loop. Every repeat is
  limited by cards in hand, Actions, Influence or a pile.
- **Weak?:** "watch" means the card may be under-powered.
- **Scaling:** how the card changes from 2 to 6 players.
- **Projects off:** how its value changes without Crown Projects. "same" means no change.
- **Bot:** what bot support it needs beyond the existing style tagging: **heur.** means a new heuristic and
  **opp.** an opponent-side decision rule.
- **Engine:** "ok" (existing ops), **VERIFY** or **NEW**, as in the implementation plan.

| # | Card | Overlap | Combo / loop | Weak? | Scaling | Projects off | Bot | Engine |
|---|---|---|---|---|---|---|---|---|
| A1 | Coin Clipper | Royal Tax Collector; distinct (Bronze only, non-terminal) | Reclamation Guild +1 per trash | no | flat | +Buy loses stage use | style | ok |
| A2 | Promissory Note | none in K&C | Reclamation Guild; Gilder to hand | no | flat | same | heur. when to cash | VERIFY self-trash from play |
| A3 | Florin Table | Lending House (A6), different destination | Bronze becomes 2 Coins | mild | flat | +Buy loses stage use | style | ok |
| A4 | Fondaco | Morning Bell, other villages; Dominion close | Wholesaler can switch its Buy off | no | flat | same | style | ok |
| A5 | Underwriter | Honour Guard (E10), different trigger | Several copies on one buy | no | more triggers at big tables; Silver pile bounds it | same | reveal always | VERIFY not offered as Attack reaction |
| A6 | Lending House | Florin Table | Topdeck Gold for a guaranteed hand | watch | flat | same | heur. topdeck choice | ok |
| A7 | Wholesaler | Surveyor (Projects only) | Stacks: Gold at 4 with two | no | flat | +Buy loses stage use | style | ok |
| A8 | Bookkeeper | Study Hall (C9), mirror image | discards Actions | no | flat | same | style | VERIFY `rest` |
| A9 | Partnership | Licensing Hall | Kingmaking limited to one Silver | no | choice matters more at 3+ | same | **opp.** | VERIFY chooser |
| A10 | Gilder | Treadwheel Crane, Mintmaster | Fetches Promissory Note or Laurel Wreath | no | flat | same | style | ok |
| A11 | Ledger Hall | Noble Council family; Bronze rush closed | Wholesaler Silvers (intended) | no | flat | same | heur. count Currency | **NEW** `notKey` |
| A12 | Compound Interest | Toll Gate, Market Stall | Bonded Store returns count | no | flat | same | style | ok |
| A13 | Bourse | Crown Treasury (better rate) | Influence sink | no | flat | +Buy loses stage use | style | ok |
| A14 | Gold Florin | Gold, Royal Mint | Pure Money with Wholesaler | no | flat | same | heur. avoid Actions | VERIFY `actionsPlayed` in Currency |
| B1 | Household Guard | Royal Runner, Night Watch | none | mild | more Attacks seen at big tables | same | reveal always | ok |
| B2 | Antechamber | Trading Port's spend | Influence sink | no | flat | same | style | ok |
| B3 | Bribed Magistrate | Tax Assessors, Edict of Inspection | Master's Hand doubles; each play pays | no | hits more players at big tables, but costs the same | same | heur. pay when 2+ targets | ok |
| B4 | Counter-Intrigue | Court Informer | none | mild | flat | same | reveal always | ok |
| B5 | Whispered Promise | Audience Hall | Influence sink over two turns | mild | flat | same | style | ok |
| B6 | Signoria | Royal Architect | opponent picks | no | flat | same | **opp.** | VERIFY chooser |
| B7 | Hollow Title | Tax Farmer, Tax Arrears | Noble Council (attacker chooses target) | no | **flat after revision** | same | **heur.** target leader without Noble Council | **NEW** `attack.player` |
| B8 | Purchased Office | Crown Treasury (better rate) | At most 2 per turn (cap 8) | no | flat | same | style | ok |
| B9 | Court Purge | Lime Kiln, Royal Confessor | Opponents thin too | no | helps more rivals at big tables | same | **opp.** trash junk | ok |
| B10 | Family Crest | Homestead, Noble Estate | Gives 1 Influence | no | flat | same | **heur.** target | VERIFY token target |
| B11 | Marriage Pact | Court Scholar | Kingmaking near the end | no | flat | same | heur. target | ok |
| B12 | Majordomo | Royal Architect, Great Council | none | no | flat | +Buy loses stage use | heur. pick 2 | ok |
| B13 | Palace Intrigue | Privy Council, Great Council | Feeds a rival 2 Influence | no | flat | same | heur. target lowest | ok |
| C1 | Sweeper | Grain Sorter | Trashes Votive (+1 Renown) | no | flat | same | heur. trash junk | ok |
| C2 | Sketchbook | Kingdom Courier | none | mild | flat | same | style | ok |
| C3 | Bottega | Guild Procession, other villages | none | no | flat | same | style | ok |
| C4 | Guild Diploma | Court Scholar, Lime Kiln | Thinning that scores | no | flat | same | style | ok |
| C5 | Woodcarver | Treadwheel Crane, Chandler | none | mild | flat | same | style | VERIFY pile type check |
| C6 | Promotion | Noble Resettlement | Trashes Votive (+1 Renown) | no | flat | same | heur. upgrade target | ok |
| C7 | Master's Hand | Royal Commission | Influence capped at +1; nested plays bounded by hand | no | flat | same | **heur.** pick target | VERIFY play order, Establishment doubled |
| C8 | Open Studio | Alms House, Trading Port | gives a card | no | flat | same | heur. target | ok |
| C9 | Study Hall | Bookkeeper (mirror), Hall of Archives | none | no | flat | same | style | VERIFY `rest`, private look |
| C10 | Patternmaker | Treadwheel Crane | drains piles (feeds Memorial Statue, capped) | no | flat | same | heur. copy best | VERIFY `sameAs` |
| C11 | Atelier | Estate Surveyor, Noble Resettlement | Gold into Grand Duchy; trashes Votive | no | flat | same | heur. | ok |
| C12 | Schoolroom | Purification House, Royal Scrivener; Dominion close | none | no | flat | same | style | ok |
| C13 | Lecture Hall | Privy Council | none | no | flat | same | style | ok |
| C14 | Master's Fee | Guild Procession; Dominion close | none | no | flat | +Buy loses stage use | style | ok |
| C15 | Maestro | Royal Commission, Master's Hand | Plays a card up to 5; no self-chain | no | flat | same | heur. pick target | ok |
| D1 | Harbour Pilot | Scriptorium, Grain Sorter | none | mild | flat | same | style | ok |
| D2 | Dockhand | Ragpicker | none | mild | flat | +Buy loses stage use | heur. pick card | ok |
| D3 | Barter Post | Estate Surveyor | no net cost gain, so no loop | no | flat | same | heur. | ok |
| D4 | Quayside Sale | Favour Broker; Dominion close | Glory green hands | no | flat | same | style | ok |
| D5 | Ferry Landing | Morning Bell; Dominion close | none | no | flat | same | style | ok |
| D6 | Chandler | Woodcarver | none | no | flat | same | style | VERIFY `event` type |
| D7 | Bonded Store | Royal Commission; Dominion close (Gear) | Master's Hand: up to 4 held | no | flat | same | heur. what to hold | ok (hidden info confirmed) |
| D8 | Trade Agreement | Licensing Hall | opponent may cooperate | no | flat | same | **opp.** cooperate if behind | VERIFY `pass-up` from `on-player` |
| D9 | Cargo Manifest | Guild Register | Devices (already strong) | no | flat | same | style | ok |
| D10 | Grain Hoy | Customs House, Market Stall | none | no | flat | same | style | ok |
| D11 | Hiring Day | Port Tariffs | refund per buy, bounded by Buys | no | flat | **weaker** (no stage use) | heur. buy order | ok |
| D12 | Customs Cutter | Road Warden, Court Saboteur | one Silver per play | no | more reveals at big tables, still one Silver | same | style | ok |
| D13 | Landing Rights | Heraldic Painter | Victory Parade cheap Homesteads | no | flat | +Buy loses stage use | style | ok |
| D14 | Galleass | Scriptorium, Cloth Hall | Devices | no | flat | same | style | ok |
| E1 | Tenant Farmer | Post Rider | none | mild | flat | same | style | ok |
| E2 | Manor Court | Heraldic Painter | Land Grant Homesteads | no | flat | same | style | ok |
| E3 | Votive Offering | Reclamation Guild | trash outlets, now +1 | no | flat | same | heur. trash late | VERIFY self trash trigger |
| E4 | Banner Bearer | other villages | none | no | flat | same | style | ok |
| E5 | Laurel Wreath | Merchant Bond, Trade Bonds | Gilder fetches it | no | flat | same | style | ok |
| E6 | Land Grant | Guild Banquet | Noble Council | no | flat | +Buy loses stage use | style | ok |
| E7 | Grand Muster | none | green hands | no | flat | same | style | ok |
| E8 | Memorial Statue | none | Patternmaker drain, capped at +3 | **watch** | slightly better at 5–6 (more market piles hit 2) | **better** | **heur.** buy late | **NEW** `emptyPiles atMost` |
| E9 | Point of Honour | Tax Assessors, Road Warden | none | mild | flat | same | style | VERIFY forced choice with no legal card |
| E10 | Honour Guard | Underwriter | Homestead per rival Grand Duchy | no | more triggers at big tables; Homestead pile bounds it | same | reveal always | ok |
| E11 | Victory Parade | Wholesaler (Currency) | two copies make Homesteads free | no | flat | **better** | style | ok |
| E12 | Chivalric Order | Noble Council, Guild Register | Land Grant, Hollow Title Homesteads | no | flat | same | style | ok |
| E13 | Royal Jubilee | Guild Banquet, Benefactors | none | no | **flat after revision** | **better** | **heur.** endgame | **NEW** `pile` Num |

**Summary of the audit:**

- **Duplicates:** none exact. The closest inside the design are Bookkeeper and Study Hall (mirror images in
  different sets) and Florin Table and Lending House. Six cards are close to a Dominion card. They are listed in
  DOMINION_COMPARISON.md.
- **Timing:** every card's timing is in the manifest entry and the rulings table.
- **Loops:** none possible.
- **Weak candidates:** Lending House and Memorial Statue. Seven more cards are marked "mild": cheap support cards
  whose value depends on the market.
- **Complexity:** medium 16, high 0.
- **Projects off:** all 69 work. Eight +Buy cards lose the stage use, and three Glory cards get stronger.
- **Multiplayer scaling:** after the revisions, nothing gives or takes more per play as the table grows, except
  the reactions (Underwriter, Honour Guard), which are bounded by a basic pile.
- **Bots:** 5 cards need an opponent-side rule and about 15 need a targeting or timing heuristic. The rest only need
  style tags.
