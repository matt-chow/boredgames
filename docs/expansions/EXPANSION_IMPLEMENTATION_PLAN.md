# Expansion implementation plan

**Status: a plan only. Nothing here has been started.** It describes how to build the cards in
[FIVE_EXPANSION_MANIFEST.md](FIVE_EXPANSION_MANIFEST.md). Updated by the final design review on 2026-11-19: the
owner approved the set sizes, the defaults, Market Square and the Crown Projects setting, and three questions
remain (section 9).

## 1. Edition and persistence

- **New edition, not an edit.** Under KC3-VER, rooms never silently change rules. Add `RULES_V5` in
  `src/games/clockwork/rules/ruleset.ts`:
  - It is `{ ...RULES, version: 5 }`.
  - `cards` is `[...CARDS, ...REPUBLICS, ...HOUSES, ...MASTERS, ...PORTS, ...GLORY]`.
  - `sets` is extended with the five new entries.
  - Freeze edition 4 as `RULES_V4` and register it in the editions list, the same way `RULES_V3` is kept today.
- **The cards need no `stateVersion` bump.** They add keys, not fields. `BState`'s shape is unchanged and
  `rulesVersion` already selects the card list. None of the four new engine items in section 3 changes persisted
  state.
- **The Crown Projects setting does need one** (section 3b). It adds a field to the persisted deck config, so it
  bumps `STATE_VERSION` from 4 to 5 with a `migrate` step.
- **Default sets stay `['core', 'crown']`.** The new sets are opt-in at setup until benched.
- **Keys** are exactly as the manifest gives them and must never be renamed afterwards.
- **`RUST_MAKERS`** is unchanged, because no new card gives Royal Debt.

## 2. File layout

- **Card definitions.** Each set gets one file in `src/games/clockwork/rules/`: `republics.ts`, `houses.ts`,
  `masters.ts`, `ports.ts` and `glory.ts`. Follow `crown.ts`: use the shared helpers (`draw`, `spark`, `coins`,
  `buys`, `prestige`, `civic` and so on) and `set: '<key>'`.
- **Purity.** These files stay pure TypeScript, with no Svelte, DOM or Cloudflare imports, per AGENTS.md.
- **Card text** is the manifest's **Effect** line, in house phrasing.

## 3. Engine work

Most cards use existing ops. The work is listed in priority order.

**Four small NEW items.** Each reads or targets only public information, and none changes `BState`. Each gets a unit
test in the engine suite before the card that uses it.

| Item | Cards | Change |
|---|---|---|
| `Num { pile: string; start?: true }` | Royal Jubilee | Without `start`: `state.supply[key]?.length ?? 0`. With `start`: `rules.basicPiles(n)[key]`, or `rules.marketPileSize(key, n)` for a market pile. Add it to `Num` in `types.ts` and to the evaluator. |
| `emptyPiles` takes `atMost?: number` | Memorial Statue | Counts supply piles with `atMost` or fewer cards left. The default of 0 keeps the current meaning. |
| `CardMatch` takes `notKey?: string` | Ledger Hall | Add it to the `Pick` in `types.ts` and one line to `matches` in `runtime.ts`. |
| `attack` takes `player?: PlayerRef` | Hollow Title | Targets one seat instead of every other seat, and still skips it if it is in `ctx.immune`. Reactions are still offered to every opponent when the card is played. |

**VERIFY items.** These use existing ops in a way that has not been tested before.

| Item | Cards | Kind |
|---|---|---|
| A Currency moving itself to the trash while it is played | Promissory Note | VERIFY |
| `actionsPlayed` read while a Currency resolves | Gold Florin | VERIFY |
| Playing an Establishment twice: both `delay`s fire and it stays in play once | Master's Hand | VERIFY. This is the first use of `play-card times: 2`. |
| Effects after `play-card times: 2` run only once both plays have resolved | Master's Hand | VERIFY. The Influence limit reads the Influence total after both plays. If the frames do not order that way, use a small `custom` op for the limit. |
| A `buy` trigger with `where: hand, scope: others` on a card with the `reaction` type but no `reaction` field | Underwriter | VERIFY that it is not offered as an Attack reaction |
| `where: self` on `gain` and `trash` triggers | Family Crest, Votive Offering, Memorial Statue | VERIFY. These are the first market cards to use them. |
| `pass-up` out of `on-player` | Trade Agreement | VERIFY. If it fails, use a small `custom` handler. |
| `rest` after `select` excludes the cards already moved | Bookkeeper, Study Hall | VERIFY |
| `sameAs` against a variable holding several cards | Patternmaker | VERIFY |
| A type check on a chosen pile before gaining | Woodcarver, Chandler | VERIFY. Fallback: check `event` after the gain. |
| Mat contents hidden by `project(state, seat)` | Bonded Store | **Checked in the final review.** The projection gives the owner `{ count, cards }` and other seats `{ count }`. `moveAll` logs moves to and from a mat with a count publicly and card keys privately. Still add a Bonded Store case to the projection and leak tests. |
| A forced choice with no legal card | Point of Honour | VERIFY |
| Options picked by another player apply to the card's owner | Signoria, Partnership | VERIFY |

Write each VERIFY as an engine unit test before the card that depends on it.

### Hollow Title reaction ruling

Reactions are offered to every opponent as the card is played, before its effects, as `runtime.ts` already does
for Attack cards. A non-target may reveal a reaction for its side effect. The target is chosen afterwards. If the
target is immune, Hollow Title does nothing to anyone, and the attacker does not choose again. Record this as a
`CC-HOU` rule ID with a test.

## 3b. Enable Crown Projects setting

This is approved, on by default. It is independent of the five sets and can ship before them (question 3).

- **Config.** Add `crownProjects?: boolean` to `DeckConfig` in `types.ts`. A missing value means true.
- **Persistence.** Bump `STATE_VERSION` from 4 to 5 in `src/engine/deckbuilder/index.ts`. Add a `migrate` step from
  4 to 5 that sets `crownProjects: true` on the stored config. Extend the accepted versions to 2–5.
- **Deal.** In `market.ts`, when the setting is off, deal no Projects (`need = 0` wherever `rules.projectCount` is
  read).
- **Ending.** No code change is needed. The Project ending in `runtime.ts` counts claimed Projects, and with none
  dealt it can never fire. Pile endings and finish-the-round are unchanged.
- **Market.** When it is off, leave out the eight existing cards that refer to Projects: Cloister Garden, Builder's
  Honour, Surveyor, Borough Reeve, Royal Dedication, Bellman, Civic Tribute and Civic Charter. The simplest way is to
  add them to the effective `bans` when the market is dealt.
- **UI.** One toggle on the setup screen, next to the set toggles, labelled "Crown Projects". Check that the table
  and the e2e smoke test work with no Projects dealt.
- **Rules.** Add `KC5-PRJ-1` (no Projects are dealt and the Project ending never fires), `KC5-PRJ-2` (Project-linked
  cards are not dealt), `KC5-PRJ-3` (a version 4 room migrates with Projects on). Each gets a test.
- **Bots.** They read the dealt Projects, so with none dealt they skip Project stages. Check the Crown Project
  Development style does not crash on an empty list.

## 4. Rules documentation and tests

- **docs/CLOCKWORK.md.** Add a section "Edition 5: expansion sets" with rule IDs:
  - `CC-REP-n` for Republics, `CC-HOU-n` for Houses, `CC-MAS-n` for Masters, `CC-POR-n` for Ports and `CC-GLO-n`
    for Glory.
  - One ID per card with a non-obvious rule or interpretation, such as the Underwriter trigger timing or the Master's
    Hand fallback.
  - `KC5-VER-1`: an edition 4 room keeps its card list.
- **Tests.** Add `tests/clockwork/expansions5.test.ts`, with each test named after its rule ID. As a minimum:
  - each card's main effect;
  - every VERIFY item from section 3;
  - that edition 4 rooms cannot deal new-set cards;
  - that a market from a single set has 10 legal piles at 2–6 players;
  - leak checks for Bonded Store, Bookkeeper and Study Hall reveals.
- **Fix the existing set-count discrepancy** in CLOCKWORK.md (Artisans' Row 11 and Rival Houses 9) as part of the
  same docs pass.

## 5. Bots

These changes go in `src/games/clockwork/rules/bot.ts`:

- **DEFS.** Add the five arrays to the `DEFS` spread.
- **STYLES.** Tag the new cards into the existing styles, without adding styles:

  | Style | New cards |
  |---|---|
  | Economy | Republics' Currency cards, Wholesaler, Gilder, Ledger Hall |
  | Combo | Master's Hand, Maestro, Bottega, Master's Fee |
  | Thinning | Sweeper, Schoolroom, Guild Diploma, Coin Clipper |
  | Cycling | Sketchbook, Tenant Farmer, Quayside Sale |
  | Scoring | Glory's Renown cards, Victory Parade, Laurel Wreath |
  | Devices | Ports' Establishments, Cargo Manifest |
  | Interaction | the four Attacks |
  | Defence | the four Reactions |

- **Opponent-choice heuristics.** Partnership, Signoria, Court Purge and Trade Agreement need a simple rule for the
  opponent's side. For example, "deny the mode with the higher estimated value", and for Trade Agreement
  "cooperate unless the player is leading".
- **Targeting heuristics.** Hollow Title targets the leading opponent who owns no Noble Council or Glory payoff, so
  the Homestead hurts more than it scores. Family Crest, Palace Intrigue, Marriage Pact and Open Studio help the
  opponent in last place.
- **Master's Hand** doubles the best card costing 4 or less in hand, valued without Influence (the limit makes
  doubled Influence nearly worthless).
- **Royal Jubilee and Memorial Statue** need endgame awareness for their timing: buy Memorial Statue once at least
  two piles are at 2 or fewer.

## 6. UI, art and data

No UI code changes are expected. The table renders cards from `CardDef`.

- **Art.** Draw one SVG per card in `scripts/art/`, build it with `node scripts/build-card-art.mjs <key>`, then add
  the key to `ILLUSTRATED` in `ui/art.ts`. Follow docs/ART_BIBLE.md. Until a card has art, it uses the flat inline
  fallback (CC-ART-1 to 3).
- **Manifest data.** Add a row per card to `data/clockwork-commons/art-manifest.json`. The ART tests check them.
- **Guide.** Add set entries and short card-role notes to `ui/guide.ts`.
- **Setup screen.** The five sets appear as toggles automatically through `sets`. Check that the labels and
  descriptions fit at phone width.
- **e2e.** Add one Playwright smoke test: start an edition 5 room with one new set, play a turn, and finish the game.

## 7. Balance runs

Run these before changing the defaults. Use the existing `scripts/` bench harness and the
docs/BOT_BENCHMARK.md method.

1. **Each new set alone** with the core basics, 2–6 players: win rate by style, round counts and pile-outs.
2. **Each new set mixed with Core and Crown Decrees** at the same player counts.
3. **Targeted checks,** each with a pass threshold to agree before running:
   - Ledger Hall in a Money deck. The threshold is no single-card strategy above about 1.5×.
   - Master's Hand with Lady-in-Waiting or Petitioner. Influence must not rise above its current 2.10×.
   - Victory Parade: Homestead pile-outs and the median round count.
   - Gold Florin and Money against fair share.
   - Purchased Office and Influence share. If it is above about 2.1×, raise its price to 4 Influence.
   - Votive Offering with trash-for-benefit cards.
   - Underwriter at 6 players and Silver pile-outs.
   - Memorial Statue: its average Renown when gained, and how often piles reach 2 or fewer.
   - Royal Jubilee: how often the bonus fires, with Projects on and off.
   - Hollow Title at 4 and 6 players, against Noble Council.
   - Every style with Crown Projects off, against the same seeds with them on.
4. **Record results** in docs/CLOCKWORK_BALANCE.md. Adjust only new cards. Existing cards are not nerfed (brief
   constraint).

## 8. Phased rollout

| Phase | Scope | Gate |
|---|---|---|
| 0 | Owner answers the open questions; the Crown Projects setting (3b); the four NEW engine items; engine VERIFY tests | All pass |
| 1 | Masters & Apprentices and Ports & Provinces. They need no new Num, aim at weak styles, and carry the most VERIFY items. | Unit tests, bench, staging |
| 2 | The Merchant Republics and Glory of the Realm | Bench, with Money and Scoring moving towards 1.0× and not past it |
| 3 | Houses of Influence. It touches Influence most, so it goes last, once there is data. | Influence share no higher than it is now |
| 4 | Art for each phase's cards; staging play-tests; then production | Owner sign-off |

Each phase is its own commits, `feat(kc)` for code and `docs(kc)` for docs, and each updates docs/PROGRESS.md. Every
code change runs `npm run check`, `npm test` and `npm run test:e2e`.

## 9. Open questions for the owner

**Answered on 2026-11-19:** set sizes stay 14/13/15/14/13; Core and Crown stay the defaults and the new sets are
opt-in; Market Square keeps its name; the Crown Projects setting is approved, on by default. The final review
settled the old card questions by revising Royal Jubilee, Hollow Title, Ledger Hall, Memorial Statue and Trade
Agreement (see the manifest).

**Still open:**

1. **The six close Dominion analogues** (Fondaco, Schoolroom, Master's Fee, Quayside Sale, Ferry Landing and Bonded
   Store; see DOMINION_COMPARISON.md): keep them with their stated differences, or redesign some?
2. **Finish-the-round with Projects off:** with no Projects, the game ends only on piles. The design assumes the
   round is still finished, as it is today for every ending. Confirm.
3. **Timing of the Crown Projects setting:** ship it on its own before edition 5, or with it?
