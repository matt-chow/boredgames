# Kingdom & Commerce

The hub's second game: an original deck-builder for 2–6 players, from the owner's card file
`data/clockwork-commons/clockwork_commons_original_cardset.json`. It runs on the generic engine
([DECKBUILDER.md](DECKBUILDER.md)) as data in `src/games/clockwork/rules`, with art and theme in `src/games/clockwork/ui`.
Its table is the generic one in `src/games/deck/ui`.

It was first released as Clockwork Commons. The rename changed only what players read. The game id `clockwork`, every card
key, token key and the saved-room format are unchanged, which is why the code and this file keep the old folder names.

## Old and new names

`data/clockwork-commons/name-mapping.json` is the full list, tested against the cards by KC-TERM-3.

| Was | Now |
|---|---|
| Foundry Row | Artisans’ Row |
| Night Shift | Rival Houses |
| Town Hall | The Chancery |
| Public Works | Crown Projects |
| Public Work | Crown Project |
| Core Works | Core Projects |
| Spark | Influence |
| Prestige | Renown |
| Devices | Establishments |
| Device | Establishment |
| Workshop | Royal Court |
| Hazard | Burden |

Rooms saved under the old wording hold their prompts in old words, because prompts are copied into state. `modernise` in
`rules/legacy.ts` rewords them when a view is built (`present` on the ruleset), and the saved state is left alone
(KC-SAVED-1). Logs hold card keys and token keys, so they show current names on their own (KC-SAVED-2).
`data/clockwork-commons/mechanics-baseline.json` and `tests/clockwork/saved-rooms-v1.json` were recorded before the rename, and KC-COMPAT tests
replay against them.

## What's in it

| Set | Market cards | Crown Projects | Source | On by default |
|---|---|---|---|---|
| Core Set | 36 | 8 | Supplied, with the 6 basic cards | Yes |
| Crown Decrees | 24 | 2 | v3.0: trashing, Currency, attacks, conditional scoring | Yes |
| Artisans’ Row | 10 | | Added: economy, combinations, deck cycling, lasting Establishments | No |
| Rival Houses | 10 | | Added: attacks, defences, payoffs that leave Debt behind | No |
| The Chancery | 8 | 5 | Added: Crown Projects rivalry, other ways to score | No |

That's 88 market cards, 7 basics (Bronze, Silver, Gold, Homestead, Noble Estate, Grand Duchy, Royal Debt)
and 15 Crown Projects. The default "Standard" game is the first two sets, **60 market cards**. Hosts choose any sets of at
least one. The Core Projects are available whichever sets are on. A game has 10 market piles and 5 Crown Projects, random or
chosen, and both go in the shareable market code.

### The Standard 60, by main job

`data/clockwork-commons/standard-categories.json` holds the list, and KC3-CAT-1 keeps it complete.

| Job | Cards | Target in the brief |
|---|---|---|
| Drawing and chains | 16 | 16 |
| Economy and Currency | 12 | 12 |
| Trashing and exchange | 10 | 10 |
| Attacks and reactions | 8 | 8 |
| Establishments (durations) | 6 | 6 |
| Scoring and utility | 8 | 8 |

Sorting is a judgement: many cards do two jobs, and the numbers are met by choosing a card's main one. Burden Relief, which
trashes too, sits under utility because its purpose is clearing Royal Debt. Only 7 of the 8 in that row score.

## Editions (KC3-VER)

`RULES` is edition 3. `RULES_V2` is the frozen earlier edition in `rules/ruleset.ts`, and a game runs on the edition stored
in `state.rulesVersion`, so **rooms never silently change rules**.

- New games, including rematches and rooms still in the lobby, start on the current edition.
- A saved room from before editions has no `rulesVersion`. It migrates to state version 2 by gaining `rulesVersion: 2` and
  nothing else (KC3-VER-2), and an outstanding undo comes forward with it (KC3-VER-6). It plays to the end on v2 piles and cards
  (KC3-VER-3, KC3-VER-7).
- An edition this build doesn't know is refused, not guessed at (KC3-VER-4).
- Migration happens on first load and is written back. **After a v3 deployment has opened a room, v2 code refuses that room**,
  because it can't read state version 2. The data is intact, and the way out is to roll forward: see DEPLOYMENT.md.

## Undo (KC3-UNDO)

A player can take back their undoable actions one at a time, most recent first, up to 8 in a row. So two conversions undo separately,
and Coins, Influence and the 0/2 count all come back with the saved state (KC3-UNDO-1, 2). The room keeps the states, so nothing is
recalculated. An action that showed hidden information or touched another player ends the chain. Only steps after it can be undone
(KC3-UNDO-3, 4). This is for every edition, because it changes what undo can reach and not how a game is played. Rooms
saved mid-turn by an earlier build undo the one step they saved (KC3-UNDO-6). The engine's rule for what counts as undoable is unchanged.

## Treasury and symbols (KC3-TREASURY, KC3-SYM)

The six basic piles are shown as the **Treasury**, "Always Available": a Coins column (Bronze, Silver, Gold) and a Renown column
(Homestead, Noble Estate, Grand Duchy), three piles each. Royal Debt, in games that hand it out, sits under both columns. The ten
variable piles are the **Kingdom Market**, "Chosen for this game". The headings come from `Ruleset.labels`, so other deck games keep
plain ones. This is display only: `scrap`, `cog` and `dynamo` keep their keys, costs, values and quantities, and saved prompts with
an earlier name are reworded as they leave the server (KC3-TREASURY-1, 2). Every edition shows the same names (KC3-TREASURY-3).
KC3-TREASURY-4 checks the layout in a browser at 390×844, 1024×600 and 1366×768.

Actions, Buys, Coins, Influence and Renown each have a symbol (bolt, basket, coin, key, crown), in `src/hub/Icon.svelte`. A symbol always sits
beside its word and is hidden from screen readers, so the text reads the same without it (KC3-SYM-2). In card text "Action" gets one only after a
number, so "+1 Action" is marked and "an Action card" isn't (KC3-SYM-3). None go inside a live region (KC3-TREASURY-4).

## Permanent supply (KC3-BASIC)

Six basics are always on the table, separate from the 10 market piles, and buyable in any game. Their ids are the old ones.

| Card | Id | Cost | Gives |
|---|---|---|---|
| Bronze | `scrap` | 0 | 1 Coin |
| Silver | `cog` | 3 | 2 Coins |
| Gold | `dynamo` | 6 | 3 Coins |
| Homestead | `notebook` | 2 | 1 Renown |
| Noble Estate | `blueprint` | 5 | 3 Renown |
| Grand Duchy | `monument` | 8 | 6 Renown |

The starting deck is 7 Bronze and 3 Homesteads. Currency cards are played one at a time or with Play All Currency.

## Private Renown (KC3-RENOWN)

Renown is hidden by the server. `project(state, seat)` gives a seat its own `score` breakdown (Estates, special, Crown
Projects, negative, conditional, total) and leaves rivals' totals and `vp` tokens out of the view altogether. Log entries for
direct Renown gains go only to their owner. All of it arrives in `final` when the game ends.

Completed Crown Projects and their printed Renown stay public, so a careful player can work out part of a rival's score. Only
the exact total is private. KC3-RENOWN-4, 5 and 6 check serialised views through whole games, through `RoomCore`, and the
room's history rows. Totals count cards in every zone, a trashed card stops counting at once, and totals can go below zero
(KC3-RENOWN-1, 2).

## Royal Debt (KC3-DEBT)

The one negative card, kept rare on purpose.

- **Penalty:** −1 Renown each while you own it. It also clogs a hand.
- **Supply:** 5 per rival, and the pile is on the table only if a card in the market can hand it out (KC3-DEBT-1). In the Standard
  game only Tax Arrears can. v2 rooms keep their pile of 10 per rival.
- **Getting it:** only by attack. It can't be bought, and an empty pile means no one gains any more.
- **Getting rid of it:** play it (it costs an Action) and spend 1 Influence to trash it, or use any trashing card. Burden Relief and
  Purification House reward it.
- **Limit on accumulation:** the small pile, one attack that always offers the choice of discarding a Currency instead, and
  every Debt being worth only −1.
- Its pile running out doesn't count toward the empty market piles that end the game.

## Moves between zones

The engine moves cards through one path (`runtime.move`), so draw, discard, trash, gain, topdeck, reveal, set aside and return
stay distinct, and each has its own log entry. The trash pile is public and open to inspection next to the discard pile. Trashed
cards leave your ownership and your score. Choices can allow zero targets, and a choice with no legal target is skipped, not
asked (`CC-CARD-*` tests).

`data/clockwork-commons/coverage-report.json` lists each card, the file defining it and its tests.
`npm run coverage:clockwork` regenerates it, and `CC-COVER-1` fails when any card has no definition or named test.

## A turn

1. **Royal Court:** play Actions, 1 to start with, and Establishments. An Establishment stays out and works again at the start of your next
   turn.
2. **Market:** play Currency, turn Influence into Coins (up to 2 a turn, at 1:1, holding at most 8), complete Crown Projects, and buy. Each
   purchase and each Crown Project uses a Buy.
3. **Cleanup:** discard, draw 5.

Influence carries between turns, up to the cap. A Crown Project costs Coins and Influence, and each can be built once, by one
player. The game ends when the Grand Duchy pile is empty, 4 Crown Projects are built (5 at 5 or 6 players, per `projectsToEnd`), or enough market piles are empty.
Most Renown wins.

## Interpretations

The card file left these open. Each is the reading the code follows, with a test named for it.

| ID | Case | Reading |
|---|---|---|
| CC-I-1 | Privy Council's discard, whose wording conflicted with its timing | Discards after Cleanup |
| CC-I-2 | Currency after a purchase | Still playable; a purchase doesn't close off Currency |
| CC-I-3 | When the reaction window opens | When the attack is played, before its effects |
| CC-I-5 | Coin Striker with an empty hand | No effect |
| CC-I-6 | Assayer with nothing to reveal | The "otherwise" branch |
| CC-I-7 | Licensing Hall with an empty hand | Counts as declining |
| CC-I-8 | Night Watch discarding | It may discard itself |
| CC-I-9 | Alms House and Licensing Hall | Not attacks, so they don't open reactions |
| CC-I-10 | Influence given to a player at the cap | The excess is lost |

Smaller readings, tested under their card or rule IDs:

- Supply quantities don't include the starting decks.
- Influence converts any time in the Market phase. Card effects that spend Influence don't count toward the conversion limit.
- An Establishment counts as an Action for Morning Bell.
- A card can react once per attack. With one opponent, the target is chosen automatically.
- Road Warden with no card to take doesn't prompt.
- When ordering several cards, players choose them one at a time: Customs House's later choices go further down, and
  Keeper of the Rolls's last choice ends on top.
- Cloister Garden looks at your own previous turn. Silver Reliquary uses your final Influence.
- Treadwheel Crane's gain is mandatory and can't take Debt.
- A Favour Broker option can be picked when you can't afford it, and does nothing.
- **Disconnects (D19):** no meaningful choice is ever made for an absent player. The table waits for them to come back, and a player who quits from Settings hands the seat to a bot
  where people remain. A decision held by someone who never returns blocks the table. Changing that needs an owner-approved policy.
- A reaction prompt appears only for a seat holding a reaction, so the table can infer that a player holds one, though not
  which. That's a limit of the engine (DECKBUILDER.md).

## Balance

`npm run balance` plays seeded bot games and writes `docs/CLOCKWORK_BALANCE.md` and
`data/clockwork-commons/balance-report.json`. The committed report is the v3 Standard game at 40 games per comparison
(`BALANCE_GAMES=40`, about 30 minutes), so favour-test results carry about ±15.5 points. The default of 100 hasn't been run
on v3. Bots are simple heuristics. The report screens for outliers and doesn't prove balance. Playstyle names in the report
are the bots' internal names ("Spark" is Influence, "Works" is Crown Projects, "Devices" is Establishments).

**No card numbers were changed because of these results.** None of them gives the evidence that would justify it.

What it shows:

- **Length:** all 200 table games finished, averaging 24 rounds at 2 players and 14.1 at 6. The longest was 54.
- **Endings:** Crown Projects ended 62.5% of games at 2 players and 90% at 6. Grand Duchies ended the rest. Empty piles ended none.
- **Scoring:** Estates are the largest source of Renown at every player count, then Crown Projects.
- **Strongest style:** the Crown Projects bot, at 71.1% across the round-robin, beating 9 of 11 rivals. With Projects also ending
  most games, this is the first thing to watch in real play.
- **First seat:** 55% ±15.4 at 2 players, 51.3% ±15.5 at 3 (fair share 33.3%), 13.8% ±10.7 at 4 (fair share 25%). The 3-player
  and 4-player results fall just outside their margins, in opposite directions, and five comparisons make one or two
  such results unsurprising. An earlier run with different bot trashing didn't show them. Not treated as a finding yet.
- **Unproductive turns:** 7.9% to 11.2% of turns bought and completed nothing.
- **Influence:** about 0.5 gained per turn at every player count.
- **Favour test, high:** Audience Hall (78.8%), Spice Exchange (77.5%) and Court Scholar (75%). The test forces a bot to buy a
  card however well it can use it, and the median card scores 30%, so a high score stands out. With 88 cards tested, a few
  would clear the margin by chance.

What it can't show:

- **Thinning.** The Thinning bot is the weakest style (29.1%), and Lime Kiln, Royal Confessor and Purification House score 0–5%.
  This looks like the bots, not the cards. Bots used to trash their own Renown first, which was a bug, now fixed for v3 games
  (`KC3-BOT-1`). The scores stayed low afterwards, idle turns rose from 4–7% to 8–11%, and the likely cause is bots trashing
  Bronze until they run short of money. That cause hasn't been tested. Judge these cards by playing them.
- **Royal Debt.** Bots ended with 0.1 copies per player at most, and 2 in the worst case. Tax Arrears is about neutral (52.5%). Burden
  Relief scores 2.5%, unsurprisingly, as there is almost no Debt for it to remove. Nothing here measures how harsh Debt is.
- **Attack severity.** The report counts attacks (2.3 to 6.6 per game), not the harm they do.
- **Card pairs.** Almost no pair reaches the 30 games needed to report it.

Bots in rooms already in play keep the trashing they started with, so the golden games in `compat.test.ts` still match their
baseline. New games get the corrected bot, which is still not a good judge of when to stop thinning.

## Art

Every card and Crown Project has its own original scene, drawn from flat SVG parts in `src/games/clockwork/ui/art.ts`: a
medieval subject on a parchment-toned sky, with no gears, steam or brass (CC-ART-1 to 3, KC-ART-1). They are inline, so they
need no network request and can't fail to load. **They are simple vector illustrations, not paintings.** No image-generation
tool was available, and no raster art exists.

`data/clockwork-commons/art-manifest.json` holds the name, former name, subject and status of each. To replace a scene with a
finished image:

1. Use the entry's `brief` and the shared `style`. Generate at 16:9 with no text, and export a small WebP. Keep the rights
   records with the file.
2. Put it in `public/art/clockwork/<key>.webp`, and add the key to `IMAGES` in `art.ts`. The card, supply tile and Crown
   Project then show it instead of the scene.
3. In the manifest, set `status` to `final` and `asset` to the path.

## Theme

`src/games/clockwork/ui/theme.css` is the whole look: token overrides plus a few rules for frames and the table surface.
`RoomPage` sets `data-game-theme` around a room and loads the file through `GAME_THEME`. Every selector starts from that
attribute (KC-THEME-2), so it can't reach the hub or Bohnanza even once loaded (KC-THEME-1). The shared deck components read
the same tokens with fallbacks equal to their old values. If the file fails to load, the game stays playable in the shared
look.

## Motion

The shared table's motion is unchanged, and all of it follows confirmed state. The game's own accent is one short "herald" drop on the
step line when the turn becomes yours (`theme.css`). Sound is shared with the rest of the hub.

## Originality

The Influence economy, Crown Projects, Establishments and the reaction variants are what set this game apart. The supplied
basics and setup follow the genre's standard economy shape (a starting deck of cheap Currency and low points), and Paper Fan
closely resembles a common genre staple. The owner may want to look at those if the game is ever published commercially.

Card names avoid Dominion's where the choice was ours (D25). The v3.0 brief specified the six basics by name, cost and value,
including Noble Estate, and the owner's words took precedence (D29). The Crown Decrees are new designs built around Influence and
Crown Projects, but they stand in a well-worn genre: Royal Confessor, Mintmaster and Great Council are in the same family as well-known
cards. Have them reviewed before any commercial publication.
