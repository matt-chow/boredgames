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

That's 88 market cards, 7 basics (Coin Purse, Silver Chest, Royal Treasury, Homestead, Noble Estate, Grand Duchy, Royal Debt)
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

## Permanent supply (KC3-BASIC)

Six basics are always on the table, separate from the 10 market piles, and buyable in any game. Their ids are the old ones.

| Card | Id | Cost | Gives |
|---|---|---|---|
| Coin Purse | `scrap` | 0 | 1 Coin |
| Silver Chest | `cog` | 3 | 2 Coins |
| Royal Treasury | `dynamo` | 6 | 3 Coins |
| Homestead | `notebook` | 2 | 1 Renown |
| Noble Estate | `blueprint` | 5 | 3 Renown |
| Grand Duchy | `monument` | 8 | 6 Renown |

The starting deck is 7 Coin Purses and 3 Homesteads. Currency cards are played one at a time or with Play All Currency.

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

The committed report predates the rename, so it uses the old card names. `name-mapping.json` translates them. It hasn't been
regenerated.

`npm run balance` plays seeded bot games and writes `docs/CLOCKWORK_BALANCE.md` and
`data/clockwork-commons/balance-report.json`. The committed report is 20 games per comparison, run after the last change
to the cards and bots, so favour-test results carry about ±22 points. Bots are simple heuristics. The report screens for
outliers and doesn't prove balance.

What it shows:

- All 100 table games finished, averaging about 25 rounds at 2 players and 15.5 at 6.
- Seat order showed no clear effect, within the wide margin at this sample.
- Games end by Great Abbey or Crown Projects. Empty piles ended none of them.
- The Economy and Scoring bot styles are the weakest. That may reflect the bots rather than the cards.
- Favour Purse (80%), Guild Banquet (77.5%), Alms House and Town Plans (75%) score highest in the favour test. Their
  intervals clear 50%, but with this many cards tested, a few would by chance.

**No card numbers were changed because of these results.** At this sample size, none justifies overriding the owner's
designs. Favour Purse, Guild Banquet and the 6-player round count are the first things to watch in real play, or in a larger
run. Changes made to the bots, not the cards, are in `src/games/clockwork/rules/bot.ts`.

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
