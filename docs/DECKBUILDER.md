# Deck-building engine

A generic engine for deck-building card games, in `src/engine/deckbuilder`. It is pure TypeScript, written for this
repo, and it contains no game. A game is a `Ruleset`: card definitions as typed data plus table rules.
`createDeckGame(ruleset)` turns one into a normal `GameModule`.

**Status: in production through Clockwork Commons ([CLOCKWORK.md](CLOCKWORK.md)).** Fixture cards named for what they exercise remain for engine tests. For what may go in a ruleset, see
[DECKBUILDER_LICENSING.md](DECKBUILDER_LICENSING.md).

To see the table on fixture cards, run `npm run dev:bench` and choose **Deck bench** on the hub. That bench stays out of
production builds.

## Files

| File | Purpose |
|---|---|
| `src/engine/deckbuilder/types.ts` | Effects, cards, rulesets, state, views |
| `src/engine/deckbuilder/runtime.ts` | The effect interpreter: frames, decisions, triggers, zones, turn structure |
| `src/engine/deckbuilder/market.ts` | Market validation, config cleaning, random generation, share codes, ruleset validation |
| `src/engine/deckbuilder/index.ts` | `createDeckGame`: setup, action validation, projection, results, bot |
| `src/games/deck/ui/DeckTable.svelte` | The table: camera, stage, HUD, log, inspection, card motion and sounds |
| `src/games/deck/ui/Supply.svelte` | The compact supply grid: basics and market |
| `src/games/deck/ui/DeckHand.svelte` | The fanned hand |
| `src/games/deck/ui/Prompt.svelte` | Step-by-step decision prompts |
| `src/games/deck/ui/MarketSetup.svelte` | The lobby's market section: random or chosen, bans, market codes |
| `src/games/deck/ui/DeckSummary.svelte` | End-of-game ranking, score breakdown and rematch |
| `src/games/deckbench/` | The fixture ruleset as a game, for development only |
| `scripts/no-bench.mjs` | Fails `npm run build` if any of the bench reached `dist` |

Engine tests are in `tests/deckbuilder`, and `fixture.ts` there re-exports the bench's ruleset. Browser tests are in
`tests/e2e/deck.spec.ts`.

The UI is not tied to the bench. It reads card definitions from the game's `rules`, so a future game can reuse it.

## The bench stays out of production

`__DECK_BENCH__` is a literal that Vite replaces. It is true only for `vite --mode bench`. Three things keep the bench
out of a build:

- Each site guards with the literal directly. A module-level constant or `typeof` check isn't reliably folded, and the
  first version of this leaked fixture cards into both the Worker and client bundles.
- In a build, `./deckbench` is aliased to `src/games/deckbench/off.ts`, because the module's top-level calls would
  otherwise survive tree-shaking.
- `npm run build` runs `scripts/no-bench.mjs`, which fails on any fixture marker or deck UI chunk in `dist`. When a real
  game is registered, its UI chunks will need removing from that check.

## How resolution works

All outstanding work is a stack of JSON frames in the state. The interpreter pops frames until the stack is empty or
a player has to decide. A decision is stored as `state.pending`, so a game can stop mid-effect, be persisted, and
resume after a reload. Card behaviour is data, never code or text evaluated at run time. The one escape hatch is
`custom`, which names a handler function the ruleset supplies in code.

`apply` validates untrusted input first, then works on a clone, so a refused or crashed action changes nothing.

## Effects

| Family | Effects |
|---|---|
| Resources | `draw`, `actions`, `buys`, `coins`, `token`, `vp` |
| Decisions | `choose-cards` (from hand, discard, play, trash or a variable), `choose-pile`, `choose` (optionally several different options with `pick`), `may`. Each takes `by` so another player can decide |
| Moving cards | `move`, `gain`, `gain-card` (gain from outside the supply), `look`, `reveal`, `reveal-cards`, `select`, `shuffle`. Moves and gains take `player` to reach another player's zones |
| Other players | `attack` (blockable), `each-other` (not), `immune`, `pass-up` (report back to the attacker's effect) |
| Control | `repeat`, `until` (loop on a condition), `if`, `play-card` (replay), `extra-turn` |
| Lasting effects | `cost-mod` and `on` (until cleanup, or one-shot with `once`), `delay` (next turn), and `triggers` on card definitions |
| Escape hatch | `custom` |

Conditions combine with `not`, `any` and `all`. Numbers can read a zone's size (`count`) or how many cards in a variable
pass a filter (`countIn`). Filters can compare against a variable's card (`sameAs`, `notSameAs`). Points can count only
matching cards (`vp: { per, each, of }`). `by` and `player` take `parent` (whoever started this attack or each-other) or
`left` (the next seat in turn order).

## Rules the engine fixes

Each ID below has a test with that name.

| ID | Rule |
|---|---|
| DB-SETUP-1…4 | Deal and conserve cards; same seed, same game; pile sizes come from the ruleset; generated markets exclude banned and draft cards |
| DB-MARKET-1…7 | Market validation, share codes, reproducible generation, market independent of the shuffle; bans are validated and applied; lobby config is cleaned on the server |
| DB-DEF-1…6 | A ruleset with unknown effects, cards, handlers or players, an impossible pick, a bad round limit or a bad point count is refused before any game starts, including inside loops and combined conditions |
| DB-TURN-1…15 | One action, one buy, no coins at the start; phases change only on request; treasures are played by the player, singly or with the play-all action; no treasures after buying; cleanup; reshuffle on empty; hand order is never changed |
| DB-FX-1…34 | One test per effect, including nested choices, replays and cost changes; loops that stop on a condition, reshuffle, hit a round limit, or pause for a decision; hand-size numbers; revealing and moving a whole hand; gaining from the trash; picking several different options; filters against a variable; giving a card to another player |
| DB-ATT-1…14 | Attacks go in turn order; reactions give immunity; each replay opens a new reaction window; another player can decide about a target's cards; results can be reported back; cards and gains can reach the attacker |
| DB-DUR-1…4 | Durations and their replayers stay in play until the delayed effect has fired |
| DB-TRIG-1…7 | Triggers from cards in play, in hand and on the event's own card; temporary triggers; one-shot triggers |
| DB-END-1…6 | The game ends after the turn on which a condition is met; scoring, including points that count one kind of card; ties |
| DB-UNDO-1…6 | Undo is offered only when nothing new was learned and nobody else was affected |
| DB-ROBUST-1…3 | Input is never mutated; malformed input is refused; endless resolution is stopped |
| DB-PRIV-1…9 | Projection and rejected-action privacy; cards shown to a deciding player reach only that player and their owner; a card passed between hands is named only to those two players; a gain of a hidden card is named only to its owner |
| DB-SIM-2…9 | Full games for 2–6 players, random play across all fixture cards, a hostile-player test, replay from the action log |
| DB-ROOM-1…7 | `RoomCore` hosts a game: reload mid-decision, dedupe, stale rejection, undo; no deck game is registered outside `dev:bench`; the host's market reaches the game, a partial one blocks the start, and others' or bad values change nothing; a boolean-only game ignores structured config |
| DB-UI-1…7 | Browser: lobby market and bans; random market honours bans; full game against a bot with rematch; two players with reload mid-decision, raw wrong-turn and stale rejection, and frame privacy; inspection and pile listing; phone layout; card animations |

## Interpretations

These are engine defaults. A ruleset can't currently change them, so a future game needing something else needs an
engine change.

- **A forced choice is mostly skipped.** A card choice with every option forced or none available shows no prompt, and
  neither does a pile choice with no piles or a `pick` that must take every option. A pile choice with one legal pile,
  and a single-pick `choose` with one option, still ask (DB-FX-26, 27, 28, 34).
- **Loops check first.** `until` tests its condition before each round, so it may run no rounds. It stops after `max`
  rounds, and never runs more than 100. A definition must include its own stop for running out of cards (DB-FX-20, 21,
  32).
- **Several picks run in the order listed,** not the order chosen. Nothing happens until the last pick (DB-FX-27).
- **`sameAs` on an empty variable matches nothing, and `notSameAs` matches everything** (DB-FX-28, 33).
- **`by` and `player` fall back to the resolving player** when there is no parent, such as in a trigger (DB-ATT-14).
- **A one-shot trigger is spent when it fires,** and only by an event its filter accepts. Two copies are two triggers
  (DB-TRIG-5, 6, 7).
- **Cards given to another player go behind what they hold.** Their hand order is otherwise unchanged (DB-FX-29,
  DB-ATT-12).
- **A gained card is named publicly only if it was already in the open:** in the trash, in play or publicly revealed.
  Otherwise the table sees a count (DB-PRIV-9).
- **Treasures are a play, not an automatic total.** Nothing is played for the player. "Play all" is an explicit action
  that plays each treasure in hand in hand order, and it pauses if one of them needs a decision.
- **The table has a fixed tilt, not a true isometric projection.** The brief asks for a fixed-isometric 2.5D table. The
  table reuses Bohnanza's `Camera.svelte` at its fixed tilt (`rotateX`, no rotation), because a true 45° view skews the
  card text that players have to read. Trying true isometric would need a camera prop, so Bohnanza's view doesn't
  change. This is a design choice for the owner to confirm (D21).
- **A card that has left play can still be replayed.** Its effects happen again, but it stays where it went (DB-FX-13).
- **Reactions can be revealed repeatedly.** The prompt returns until the player declines, because a reaction stays in
  hand (DB-ATT-2).
- **Simultaneous triggers:** seat by seat in turn order from the active player, with each player choosing their own
  order (DB-TRIG-2, DB-DUR-3).
- **Your own discard pile is visible to you.** Other players see only its top card (DB-PRIV-3).
- **Extra turns are not limited.** A ruleset that needs a limit must define one.
- **Ties** go to the player with fewer turns; players level on both share the win (DB-END-4).

## Added for Clockwork Commons

All optional in a `Ruleset`: named resource tokens with caps, conversion to Coins (`convert`), buyable projects with
rewards (`projects`, `projectCount`, `projectsToEnd`), selectable card sets (`sets`, `defaultSets`), renamed terms
(`labels`), Currency playable after buying (`lateTreasures`) and empty-pile endings counting market piles only
(`emptyMarketPilesOnly`). These are tested through the game that uses them (CC-* in `tests/clockwork`), not on the
fixture cards.

## Known limits

- **A reaction prompt reveals that a player holds a reaction.** The table can see who is deciding, and players with
  no reaction are not asked. The same applies to optional triggers on a card in hand. Fixing this means a delay or a
  prompt for everyone, which is a design choice for the UI stage. Which card it is stays hidden (DB-PRIV-5).
- **A disconnected player holding a decision blocks the table.** Bohnanza has the same limit today; the hub has no
  decision timer. The quit flow hands the seat to a bot (D19).
- **Fixture cards are for testing.** They aren't balanced or written for players. Clockwork Commons is the only authorised
  card set; see [DECKBUILDER_LICENSING.md](DECKBUILDER_LICENSING.md).
- **The bot is deliberately plain.** It keeps games moving but doesn't play well.
- **`custom` handlers are trusted code.** They must call `taint()` when they show hidden information, or undo could
  be offered when it shouldn't be.
