# Clockwork Commons

The hub's second game: an original deck-builder for 2–6 players, from the owner's card file
`data/clockwork-commons/clockwork_commons_original_cardset.json`. It runs on the generic engine
([DECKBUILDER.md](DECKBUILDER.md)) as data in `src/games/clockwork/rules`, with art in `src/games/clockwork/ui`. Its table
is the generic one in `src/games/deck/ui`.

## What's in it

| Set | Market cards | Public Works | Source |
|---|---|---|---|
| Core Set | 36 | 8 | Supplied, with the 6 basic cards |
| Foundry Row | 10 | | Added: economy, combinations, deck cycling, lasting Devices |
| Night Shift | 10 | | Added: attacks, defences, payoffs that leave Rust behind |
| Town Hall | 8 | 5 | Added: Public Works rivalry, other ways to score |

That's 64 market cards, 7 basics (the supplied 6, plus Rust) and 13 Public Works. Hosts choose any sets of at least one.
The Core Works are available whichever sets are on. A game has 10 market piles and 5 Public Works, random or chosen, and
both go in the shareable market code.

`data/clockwork-commons/coverage-report.json` lists each card, the file defining it and its tests.
`npm run coverage:clockwork` regenerates it, and `CC-COVER-1` fails when any card has no definition or named test.

## A turn

1. **Workshop:** play Actions, 1 to start with, and Devices. A Device stays out and works again at the start of your next
   turn.
2. **Market:** play Currency, turn Spark into Coins, claim Public Works, and buy.
3. **Cleanup:** discard, draw 5.

Spark carries between turns, up to the cap. A Public Work costs Coins and Spark, and each can be built once, by one
player. The game ends when the Monument pile is empty, enough Public Works are built, or enough market piles are empty.
Most Prestige wins.

## Interpretations

The card file left these open. Each is the reading the code follows, with a test named for it.

| ID | Case | Reading |
|---|---|---|
| CC-I-1 | Overcharge Lab's discard, whose wording conflicted with its timing | Discards after Cleanup |
| CC-I-2 | Currency after a purchase | Still playable; a purchase doesn't close off Currency |
| CC-I-3 | When the reaction window opens | When the attack is played, before its effects |
| CC-I-5 | Copper Press with an empty hand | No effect |
| CC-I-6 | Sorting Glasses with nothing to reveal | The "otherwise" branch |
| CC-I-7 | Permit Office with an empty hand | Counts as declining |
| CC-I-8 | Night Watch discarding | It may discard itself |
| CC-I-9 | Mutual Aid and Permit Office | Not attacks, so they don't open reactions |
| CC-I-10 | Spark given to a player at the cap | The excess is lost |

Smaller readings, tested under their card or rule IDs:

- Supply quantities don't include the starting decks.
- Spark converts any time in the Market phase. Card effects that spend Spark don't count toward the conversion limit.
- A Device counts as an Action for Shift Bell.
- A card can react once per attack. With one opponent, the target is chosen automatically.
- Signal Tower with no card to take doesn't prompt.
- When ordering several cards, players choose them one at a time: Conveyor's later choices go further down, and
  Clockwork Archive's last choice ends on top.
- Clock Garden looks at your own previous turn. Silver Statue uses your final Spark.
- Supply Crane's gain is mandatory and can't take Rust.
- A Spark Exchange option can be picked when you can't afford it, and does nothing.
- A reaction prompt appears only for a seat holding a reaction, so the table can infer that a player holds one, though not
  which. That's a limit of the engine (DECKBUILDER.md).

## Balance

`npm run balance` plays seeded bot games and writes `docs/CLOCKWORK_BALANCE.md` and
`data/clockwork-commons/balance-report.json`. The committed report is 20 games per comparison, run after the last change
to the cards and bots, so favour-test results carry about ±22 points. Bots are simple heuristics. The report screens for
outliers and doesn't prove balance.

What it shows:

- All 100 table games finished, averaging about 25 rounds at 2 players and 15.5 at 6.
- Seat order showed no clear effect, within the wide margin at this sample.
- Games end by Monument or Public Works. Empty piles ended none of them.
- The Economy and Scoring bot styles are the weakest. That may reflect the bots rather than the cards.
- Spark Coil (80%), Glow Mason (77.5%), Mutual Aid and City Blueprint (75%) score highest in the favour test. Their
  intervals clear 50%, but with this many cards tested, a few would by chance.

**No card numbers were changed because of these results.** At this sample size, none justifies overriding the owner's
designs. Spark Coil, Glow Mason and the 6-player round count are the first things to watch in real play, or in a larger
run. Changes made to the bots, not the cards, are in `src/games/clockwork/rules/bot.ts`.

## Art

Every card and Public Work has its own original scene, drawn from flat SVG parts in `src/games/clockwork/ui/art.ts` and
tested by CC-ART-1 and CC-ART-2. These are placeholders. No image-generation tool was available.

To replace one with a finished image:

1. Take its `prompt` and the shared `style` from `data/clockwork-commons/art-manifest.json`. Supplied prompts are kept word
   for word (CC-ART-3); the ones for added cards were written to match.
2. Generate at 16:9 with no text, and export a small WebP. Keep the rights records with the file.
3. Put it in `public/art/clockwork/<key>.webp`, and add the key to `IMAGES` in `art.ts`. The card, supply tile and Public
   Work then show it instead of the scene.
4. In the manifest, set `status` to `final` and `asset` to the path.

## Originality

The Spark economy, Public Works, Devices and the reaction variants are what set this game apart. The supplied basics and
setup follow the genre's standard economy shape (a starting deck of cheap Currency and low points), and Paper Fan closely
resembles a common genre staple. The owner may want to look at those if the game is ever published commercially.
