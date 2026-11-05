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
player. The ending is triggered when the Grand Duchy pile is empty, all 5 Crown Projects are complete, or enough market piles are empty; the round then finishes.
Most Renown wins.

## Edition 4: the final rules (CC-F2, CC-FINAL)

New games use `rulesVersion` 4, the owner's chosen F2 construction rule plus a finished last round. Rooms keep the edition they started on, so edition 2, edition 3
and the trials still play and read as they did (`guideFor(edition, version)`).

- **CC-F2-1, counts.** Five Projects at every player count, of 1, 2, 2, 3 and 3 stages.
- **CC-F2-2, price.** A Project's total is its printed price, plus 1 Coin when it has more than one stage. Renown and Influence totals are as printed.
- **CC-F2-3, shared building.** Anyone may fund the next stage. Each stage's Renown goes to its funder at once and counts even if the Project is never finished. The rest follows CC-STAGE-2 to 9, which are live under this edition.
- **CC-F2-4, ending.** All 5 complete triggers the end. Four don't. No player-count scaling.
- **CC-F2-5, saves and docs.** The stage table is stored in the game at setup. State version 4 only adds the optional `finalRound`; nothing is rewritten when an older save loads. A room's guide matches its `rulesVersion`.
- **CC-FINAL-1, the round finishes.** After a turn on which any end condition holds, the ending is latched and each seat with fewer turns than the most plays, in seat order, until all match.
- **CC-FINAL-2, last seat.** If the last seat of the round triggers it, the game ends at once. If the first seat does, everyone else plays once more.
- **CC-FINAL-3, can't be reversed.** The latch stays even if the condition stops holding.
- **CC-FINAL-4, ordinary turns.** Legality and supply are unchanged in those turns, and Renown is counted after them.
- **CC-FINAL-5, confirmed by the owner: nothing carries over.** Every player ends on the same number of turns, so extra turns not yet taken are dropped once the ending is triggered, and a player behind catches up. Unused Buys and Actions don't carry either: every turn starts with 1 of each. No current card grants an extra turn; only the engine's `extra-turn` op can.
- **CC-FINAL-6, confirmed by the owner: ties.** Equal turns make the older "fewer turns ranks higher" tie-break (CC-END-5) moot, so equal Renown shares the place.
- **CC-FINAL-7, public.** The final round and turns left are public and reveal nothing hidden.
- **CC-FINAL-8, saves.** A game saved in the final round finishes correctly after a reload.

## Edition 4 bots (CC-BOT)

Bots in edition 4 games plan from their own `project(state, seat)` view: nothing else is passed to them. Results and the remaining
imbalances are in [BOT_BENCHMARK.md](BOT_BENCHMARK.md). Card effects, costs and Renown were not changed for bots.

- **CC-BOT-1, length of the game.** `roundsLeft` estimates the rounds left from public progress towards each end condition. It falls as they near, and is 0 in the final round.
- **CC-BOT-2, public scores.** `publicRenown` counts stages funded and gains shown in the log, so it is a lower bound for an opponent. Only a bot's own total is exact. The shortcut is noted in the code: the log holds the last 300 entries.
- **CC-BOT-3, ending the game.** `triggers` and `leadAfter` decide whether a move would end the game and who would lead. A bot takes the last stage or last Grand Duchy when that wins, and refuses when it would clearly lose.
- **CC-BOT-4, stages.** `stageScore` compares a stage's Renown, its price and the rounds left. A bot funds a stage only when it beats the best buy.
- **CC-BOT-5, timing.** Currency early, and Renown when the game is nearly over.
- **CC-BOT-6, last turn.** Every profile on its last turn takes the most Renown it can, and never Currency.
- **CC-BOT-7, hidden information.** Changing an opponent's hidden cards changes nothing a bot does.
- **CC-BOT-8, finishing.** Every profile finishes a game with legal moves, on equal turns.
- **CC-BOT-9, money floor.** A bot won't trash below 6 Coins of money in its deck, and takes a free Bronze when it has less. Without this, Thinning bots trashed all their money and games stalled.
- **CC-BOT-OLD, older games.** Editions before 4 and the trials keep their old bot decisions, so saved games and the golden games in `compat.test.ts` play the same. A fingerprint of old-edition bot moves was byte-identical before and after this work.

## Staged construction trial (CC-STAGE)

These trial editions made the choice above. They stay for rooms that started on one, for tests and experiments, and on servers with `EXPERIMENTS=on` (staging and
development) whose host picks one, labelled as testing only. They end immediately rather than finishing the round. F2 here is the trial, version 104, not edition 4.
Code: `src/engine/deckbuilder/stages.ts`, `src/games/clockwork/rules/editions.ts`.

| Code | Version | Stages (1/2/3-stage Projects) | Total price | Ends at |
|---|---|---|---|---|
| C0 | 101 | 5/0/0 | original | 5 of 5 |
| C1 | 102 | 5/0/0 | +1 Coin each | 5 of 5 |
| F1 | 103 | 1/2/2 at every count | original | 5 of 5 |
| F2 | 104 | 1/2/2 at every count | +1 Coin on each multi-stage Project | 5 of 5 |
| S1 | 105 | 2p 3/2/0, 3p 2/2/1, 4p 1/2/2, 5p 0/3/2, 6p 0/2/3 (7, 9, 11, 12, 13 investments) | original | 5 of 5 |
| S2 | 106 | as S1 | +1 Coin on each multi-stage Project | 5 of 5 |

- **CC-STAGE-1, counts.** Exactly five different Projects, with the counts above.
- **CC-STAGE-2, assignment.** Stage counts are dealt by shuffling the game's five Projects on their own random stream (`<seed>:stages`). Price and Renown play no part,
  and the market, deal and first player don't depend on it, so tables on one seed compare fairly across editions.
- **CC-STAGE-3, division.** With `n` stages, Coins are `floor(total/n)` with the remainder on the earliest stages; Influence and Renown are `floor(total/n)` with the
  remainder on the latest. Totals are preserved. A 2-stage Project uses the first and last stage names. City Walls in 3: 3 Coins + 1 Influence for 4 Renown, 3 + 2 for 4, 2 + 2 for 5.
  Known weak spots at original prices: River Quay's first of 3 stages is 1 Coin for 1 Renown, and Exchange Hall's last of 3 is 2 Influence with no Coins for 3 Renown. No stage is free.
- **CC-STAGE-4, S2 and F2.** One more Coin in the Project's total, not per stage, divided the same way. One-stage Projects don't change. C1 adds 1 Coin to every Project. No card or market cost changes.
- **CC-STAGE-5, contributing.** In the Market phase, for one Buy, the player to move may pay the next unfunded stage of a Project and takes that stage's Renown. Only one stage of
  each Project per turn, but different Projects in one turn as Buys and funds allow. No refunds or transfers. Everyone sees who funded what. Stages are funded in order.
- **CC-STAGE-6, Renown and reward.** Renown is earned stage by stage and counts at the end even if the Project is never finished. The Project's listed reward (Draw 2 and so on) happens once,
  for whoever funds the last stage. A one-stage Project works as a claim always has.
- **CC-STAGE-7, interpretation: "Projects you completed".** Builder's Honour and Civic Charter count finished Projects you funded at least one stage of, because a Project now belongs to everyone who built it. Several players can count one Project. Civic Tribute counts finished Projects, by anyone.
- **CC-STAGE-8, interpretation: "when you complete".** Royal Dedication, Bellman and Cloister Garden react to funding the **last** stage, not to every stage. Otherwise a 3-stage Project would pay them three times.
- **CC-STAGE-9, interpretation: discounts and surcharges.** Surveyor's discount and Borough Reeve's surcharge apply to whichever stage is next. Both apply again to another stage in the time they last. Borough Reeve can name any Project with a stage left.
- **CC-STAGE-10, ending.** The game ends after the turn on which all five are fully funded, or on the usual Grand Duchy or empty-pile endings. A part-built Project doesn't count.
- **CC-STAGE-11, saves.** The stage table (names, prices, Renown, who funded each) is stored in the game when it starts, under `rulesVersion` 101 to 106, so it can't change under a room. State version 3 only adds optional fields; nothing is rewritten when an older save loads.
- **CC-STAGE-12, access.** Production refuses `config.edition` and doesn't offer the list, because `EXPERIMENTS` is only set in `env.staging`.
- **CC-STAGE-LIVE.** Edition 3 and older rooms run the code they always did, with their bots unchanged. Bots only compare a Project with the best buy in a trial edition (`rulesVersion >= 100`).

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
on v3. Bots are simple heuristics. The report screens for outliers and doesn't prove balance. Reports print Influence Engine,
Crown Project Development and Establishment Engine for the bots whose internal names are `Spark`, `Works` and `Devices`. Those
internal names stay because they seed the games.

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

### Edition 4 benchmark: what is left (reported, not changed)

From [BOT_BENCHMARK.md](BOT_BENCHMARK.md): 10 games per strategy and player count, 120 mixed tables per count, seats rotated. The planning bot wins 73.1% at 2 players (fair 50%) and 42.1% at 4 (fair 25%) among the
old logic, and no game got stuck. These rank bots. They don't prove a card is too strong, and nothing below was changed.

- **Influence Engine and Crown Project Development lead.** At mixed tables they win 2.10 and 1.71 times a fair share, and their mirrors end in about 12 rounds where others take 16 to 23. Rushing Projects is the strongest thing the bots found.
- **Money, Scoring and Cycling trail** at about 0.6 times fair. Money funds 0.6 of 11 stages and always ends on Grand Duchy, so it barely touches Projects.
- **Triggering usually wins:** 83.1% at 2 players, falling to 59.2% at 6.
- **Projects end most large games:** 87.5% of mixed tables at 6 players and 50.8% at 2. F2 did not stop the shorter games at 5 and 6.
- **Seats:** mostly within noise for 120 to 130 games. The largest gaps are the fourth seat's 17.3% in 4-player mirrors, and the last seat's 10.8% at mixed 6-player tables. Sample sizes are too small to call either a real seat effect.

## Art

Every card and Crown Project has its own illustration in `public/cards/<key>.svg`, drawn from code in the approved clear-line
style: Early Renaissance subjects, consistent linework, natural colours and blank faces. These are vector drawings; no
image-generation tool or raster art is involved. `docs/ART_BIBLE.md` is the standard and says how to draw or rebuild one.

`data/clockwork-commons/art-manifest.json` holds the name, former name, subject, status and asset of each. A card with no file
falls back to its flat inline scene from `src/games/clockwork/ui/art.ts` (CC-ART-1 to 3, KC-ART-1), which needs no network
request. To add one:

1. Draw it in the right file in `scripts/art/`, and run `node scripts/build-card-art.mjs <key>`.
2. Add the key to `ILLUSTRATED` in `art.ts`. The card, supply tile, Crown Project, details dialog and market setup then show it.
3. In the manifest, set `status` to `final` and `asset` to the path. The ART tests in `tests/clockwork/pilot-art.test.ts` check the rest.

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
