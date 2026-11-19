# Expansion balance review

This is a desk review of [FIVE_EXPANSION_MANIFEST.md](FIVE_EXPANSION_MANIFEST.md). **No card has been simulated.**
Every judgement below is a prediction to confirm with the bench runs listed in
[EXPANSION_IMPLEMENTATION_PLAN.md](EXPANSION_IMPLEMENTATION_PLAN.md).

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
| Hollow Title | low to medium | Gives a Homestead, which is junk but +1 Renown |
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
| Doubled Influence | Master's Hand + Lady-in-Waiting, Petitioner | Could push Influence up | Bench Spark with Masters dealt |
| Gardens rush | Ledger Hall + 0-cost Bronze + Wholesaler + Hiring Day | The classic Gardens pattern | Bronze pile size; per 4 → per 5 |
| Cost-mod stacking | Wholesaler ×3 → Gold at 3 | Currency only | Fine; it is the point of the card |
| Cheaper greening | Victory Parade ×2 → Grand Duchy at 6 | Shorter games | Bench round counts |
| Trash-for-points | Votive Offering + Coin Striker, Salvage Office | 2 Renown + trash value | Bench Scoring |
| 6-player reactions | Underwriter | Several Silvers per round | Silver pile limit |
| Junk with points | Hollow Title + Noble Council | The victim's Noble Council grows | Political tension, accepted |
| Empty piles | Memorial Statue | 0% pile-outs in benches | Owner decision (question 6) |
| Kingmaking | Partnership, Signoria, Marriage Pact, Palace Intrigue, Open Studio, Family Crest | Choose an opponent to help | Small amounts; accepted, as with Alms House |
| Hidden set-aside | Bonded Store | Mat contents must stay private | Projection test before implementing |

## Complexity

| Complexity | Cards |
|---|---|
| Low | 53 |
| Medium | 15: Underwriter, Partnership, Bribed Magistrate, Signoria, Majordomo, Promotion, Master's Hand, Patternmaker, Maestro, Barter Post, Bonded Store, Hiring Day, Customs Cutter, Honour Guard, Royal Jubilee |
| High | 1: Trade Agreement |

The new sets average lower complexity than Crown Decrees.
