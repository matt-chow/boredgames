# Expansion implementation plan

**Status: a plan only. Nothing here has been started.** It describes how to build the cards in
[FIVE_EXPANSION_MANIFEST.md](FIVE_EXPANSION_MANIFEST.md) once the owner approves the catalog and answers the open
questions at the end.

## 1. Edition and persistence

- **New edition, not an edit.** Under KC3-VER, rooms never silently change rules. Add `RULES_V5` in
  `src/games/clockwork/rules/ruleset.ts`:
  - It is `{ ...RULES, version: 5 }`.
  - `cards` is `[...CARDS, ...REPUBLICS, ...HOUSES, ...MASTERS, ...PORTS, ...GLORY]`.
  - `sets` is extended with the five new entries.
  - Freeze edition 4 as `RULES_V4` and register it in the editions list, the same way `RULES_V3` is kept today.
- **No `stateVersion` bump expected.** The new cards add keys, not fields. `BState`'s shape is unchanged and
  `rulesVersion` already selects the card list. Bump it and add a `migrate` step only if an engine change below
  alters persisted state. The new `pileLeft` Num would not.
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

| Item | Cards | Kind |
|---|---|---|
| `Num { pileLeft: key }` (cards left in a supply pile) | Royal Jubilee | **NEW**, optional. It reads only public information. Add it to `Num` in `types.ts` and to the evaluator, with a unit test. If the owner declines, use the manifest's fallback. |
| A Currency moving itself to the trash while it is played | Promissory Note | VERIFY |
| `actionsPlayed` read while a Currency resolves | Gold Florin | VERIFY |
| Playing an Establishment twice: both `delay`s fire and it stays in play once | Master's Hand | VERIFY. This is the first use of `play-card times: 2`. |
| A `buy` trigger with `where: hand, scope: others` on a card with the `reaction` type but no `reaction` field | Underwriter | VERIFY that it is not offered as an Attack reaction |
| `where: self` on `gain` and `trash` triggers | Family Crest, Votive Offering, Memorial Statue | VERIFY. These are the first market cards to use them. |
| `pass-up` out of `on-player` | Trade Agreement | VERIFY. If it fails, cut the card or use a small `custom` handler. |
| `rest` after `select` excludes the cards already moved | Bookkeeper, Study Hall | VERIFY |
| `sameAs` against a variable holding several cards | Patternmaker | VERIFY |
| A type check on a chosen pile before gaining | Woodcarver, Chandler | VERIFY. Fallback: check `event` after the gain. |
| Mat contents hidden by `project(state, seat)` | Bonded Store | **VERIFY before building.** If mats are public, fix the projection first and add a case to the projection and leak tests. That is a hidden-information change. |
| A forced choice with no legal card | Point of Honour | VERIFY |
| Options picked by another player apply to the card's owner | Signoria, Partnership | VERIFY |

Write each VERIFY as an engine unit test before the card that depends on it.

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

- **Opponent-choice heuristics.** Partnership, Signoria and Trade Agreement need a simple rule for the opponent's
  side, for example "deny the mode with the higher estimated value".
- **Royal Jubilee and Memorial Statue** need endgame awareness for their timing.

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
   - Ledger Hall with a Bronze rush. The threshold is no single-card strategy above about 1.5×.
   - Master's Hand with Lady-in-Waiting or Petitioner. Influence must not rise above its current 2.10×.
   - Victory Parade and the median round count.
   - Gold Florin and Money against fair share.
   - Purchased Office and Influence share.
   - Votive Offering with trash-for-benefit cards.
   - Underwriter at 6 players and Silver pile-outs.
4. **Record results** in docs/CLOCKWORK_BALANCE.md. Adjust only new cards. Existing cards are not nerfed (brief
   constraint).

## 8. Phased rollout

| Phase | Scope | Gate |
|---|---|---|
| 0 | Owner answers the open questions; engine VERIFY tests | All pass |
| 1 | Masters & Apprentices and Ports & Provinces. They need no new Num, aim at weak styles, and carry the most VERIFY items. | Unit tests, bench, staging |
| 2 | The Merchant Republics and Glory of the Realm, including the `pileLeft` decision | Bench, with Money and Scoring moving towards 1.0× and not past it |
| 3 | Houses of Influence. It touches Influence most, so it goes last, once there is data. | Influence share no higher than it is now |
| 4 | Art for each phase's cards; staging play-tests; then production | Owner sign-off |

Each phase is its own commits, `feat(kc)` for code and `docs(kc)` for docs, and each updates docs/PROGRESS.md. Every
code change runs `npm run check`, `npm test` and `npm run test:e2e`.

## 9. Open questions for the owner

1. **Royal Jubilee:** approve the new `pileLeft` Num, or use the empty-pile fallback? Should the threshold scale with
   player count?
2. **A Projects-off toggle:** the catalog works without Projects, but there is no toggle today. Is one wanted?
3. **Market Square:** rename it? It shares an exact name with a Dominion card; the key stays.
4. **Hollow Title:** is a junk attack that gives a +1 Renown Homestead acceptable, given its Noble Council
   interaction?
5. **Ledger Hall:** is the free-Bronze pattern acceptable, at per 4 or per 5?
6. **Memorial Statue:** is a card that will often be plain "1 Renown for 4" acceptable, or should it be cut?
7. **Trade Agreement:** keep the only high-complexity card, or cut it?
8. **Set sizes:** keep 13–15 per set, or trim to 12, cutting Lending House, Memorial Statue and Trade Agreement first?
9. **Defaults:** should any new set join the default `['core', 'crown']` after benching?
