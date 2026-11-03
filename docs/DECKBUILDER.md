# Deck-building engine

A generic engine for deck-building card games, in `src/engine/deckbuilder`. It is pure TypeScript, written for this
repo, and it contains no game. A game is a `Ruleset`: card definitions as typed data plus table rules.
`createDeckGame(ruleset)` turns one into a normal `GameModule`.

**Status: engine only.** It is not registered in the hub and has no UI, no playable card set, and no way to choose a
market from the lobby. Bohnanza, the server and the deployment are unchanged. For what may go in a ruleset, see
[DECKBUILDER_LICENSING.md](DECKBUILDER_LICENSING.md).

## Files

| File | Purpose |
|---|---|
| `types.ts` | Effects, cards, rulesets, state, views |
| `runtime.ts` | The effect interpreter: frames, decisions, triggers, zones, turn structure |
| `market.ts` | Market validation, random generation, share codes, ruleset validation |
| `index.ts` | `createDeckGame`: setup, action validation, projection, results, bot |

Tests are in `tests/deckbuilder`. `fixture.ts` is a test-only ruleset whose cards are named for what they exercise.

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
| Decisions | `choose-cards`, `choose-pile`, `choose`, `may` |
| Moving cards | `move`, `gain`, `look`, `reveal`, `reveal-cards`, `shuffle` |
| Other players | `attack` (blockable), `each-other` (not), `immune` |
| Control | `repeat`, `if`, `play-card` (replay), `extra-turn` |
| Lasting effects | `cost-mod` and `on` (until cleanup), `delay` (next turn), and `triggers` on card definitions |
| Escape hatch | `custom` |

## Rules the engine fixes

Each ID below has a test with that name.

| ID | Rule |
|---|---|
| DB-SETUP-1…4 | Deal and conserve cards; same seed, same game; pile sizes come from the ruleset; generated markets exclude banned and draft cards |
| DB-MARKET-1…4 | Market validation, share codes, reproducible generation, market independent of the shuffle |
| DB-DEF-1…3 | A ruleset with unknown effects, cards or handlers is refused before any game starts |
| DB-TURN-1…11 | One action, one buy, no coins at the start; phases change only on request; treasures are played by hand; no treasures after buying; cleanup; reshuffle on empty; hand order is never changed |
| DB-FX-1…18 | One test per effect, including nested choices, replays and cost changes |
| DB-ATT-1…7 | Attacks go in turn order; reactions give immunity; each replay opens a new reaction window |
| DB-DUR-1…4 | Durations and their replayers stay in play until the delayed effect has fired |
| DB-TRIG-1…4 | Triggers from cards in play, in hand and on the event's own card; temporary triggers |
| DB-END-1…5 | The game ends after the turn on which a condition is met; scoring; ties |
| DB-UNDO-1…4 | Undo is offered only when nothing new was learned and nobody else was affected |
| DB-ROBUST-1…3 | Input is never mutated; malformed input is refused; endless resolution is stopped |
| DB-PRIV-1…6 | Projection and rejected-action privacy |
| DB-SIM-2…9 | Full games for 2–6 players, random play across all fixture cards, a hostile-player test, replay from the action log |
| DB-ROOM-1…4 | The unchanged `RoomCore` hosts a game: reload mid-decision, dedupe, stale rejection, undo; no deck game is registered |

## Interpretations

These are engine defaults. A ruleset can't currently change them, so a future game needing something else needs an
engine change.

- **A forced choice is skipped.** When every option must be taken, or there are none, no prompt appears.
- **Treasures are a play, not an automatic total.** There is no "play all" action yet; the UI can send several plays.
- **A card that has left play can still be replayed.** Its effects happen again, but it stays where it went (DB-FX-13).
- **Reactions can be revealed repeatedly.** The prompt returns until the player declines, because a reaction stays in
  hand (DB-ATT-2).
- **Simultaneous triggers:** seat by seat in turn order from the active player, with each player choosing their own
  order (DB-TRIG-2, DB-DUR-3).
- **Your own discard pile is visible to you.** Other players see only its top card (DB-PRIV-3).
- **Extra turns are not limited.** A ruleset that needs a limit must define one.
- **Ties** go to the player with fewer turns; players level on both share the win (DB-END-4).

## Known limits

- **A reaction prompt reveals that a player holds a reaction.** The table can see who is deciding, and players with
  no reaction are not asked. The same applies to optional triggers on a card in hand. Fixing this means a delay or a
  prompt for everyone, which is a design choice for the UI stage. Which card it is stays hidden (DB-PRIV-5).
- **A disconnected player holding a decision blocks the table.** Bohnanza has the same limit today; the hub has no
  decision timer. The quit flow hands the seat to a bot (D19).
- **The hub can't configure a market yet.** `RoomCore`'s `config` message accepts boolean options only, so structured
  config needs an optional sanitising hook in `GameModule`. Until then, a room gets a random market.
- **The bot is deliberately plain.** It keeps games moving but doesn't play well.
- **`custom` handlers are trusted code.** They must call `taint()` when they show hidden information, or undo could
  be offered when it shouldn't be.
