# Deck-building engine: scope and licensing questions

These are working notes from an engineering review, written on 2026-11-03. They are not legal advice and do not
establish that any use is authorised. Nothing in this repo is licensed by, or affiliated with, the publisher of any
commercial deck-building game.

## Scope

Two different things limit this work, and they should not be confused:

1. **The law**, which is the subject of the open questions below.
2. **What Claude will build.** Claude won't write a recreation of a specific published game, even a private one, and
   even if it is renamed. That is a limit on Claude's work. It is not a legal finding, and being private and
   noncommercial does not change it.

| Component | Concern | Status |
|---|---|---|
| Zones, seeded shuffling, turn structure, resources | None identified: functional mechanics | Built |
| Decisions, attacks, reactions, durations, triggers, replays, cost changes, tokens, mats | None identified: functional mechanics | Built |
| Multiplayer projection, undo safety, simulations, market validation and share codes | None: our own software | Built |
| Original card sets using these mechanics, with original names, text and art | None identified, if independently designed | Built: Kingdom & Commerce (then called Clockwork Commons), from the owner's own card file (CLOCKWORK.md) |
| 2.5D table and card UI in the hub's own design language | None, if the look is our own | Built; in production through Kingdom & Commerce |
| Dominion's name and branding | Trademark question; Claude won't build it | Not built |
| Dominion's card list and expansions, card by card, including renamed copies | Not a settled legal question here; Claude won't build it | Not built |
| Its recommended market lists | Selection may be protected; Claude won't build it | Not built |
| Its card text and rulebook wording | Copyright: expression | Not built |
| Its card art, layout and look | Copyright, possibly trade dress | Not built |

**Closest alternative that keeps the mechanics:** original card sets on this engine, drawing on the same families of
mechanics (see DECKBUILDER.md), designed as their own game and added to the hub only with the owner's approval. The owner
supplied and approved one: Kingdom & Commerce, then called Clockwork Commons.

## Comparison with this repo's Bohnanza

The owner asked whether Dominion Second Edition could be approached the way Bohnanza was. The review on 2026-11-03 found:

| Question | What the Bohnanza code does |
|---|---|
| Rules to logic | The rulebooks were translated into numbered rules in `docs/RULES.md` and `docs/VARIANTS.md`, each with a test named by its ID. Gaps are written down as "Interpretation" lines. The logic is a hand-written reducer in `src/games/bohnanza/rules/engine.ts` |
| Card definitions | One table in `src/games/bohnanza/rules/cards.ts`, typed `Record<Bean, BeanInfo>` |
| Names, quantities, effects | The published names, counts and beanometers are reproduced, in code and in RULES.md. Bean behaviour is uniform, so the data is short. Special cases are in comments and the engine |
| Artwork | Original placeholders in `src/games/bohnanza/ui/art.ts`. `docs/ASSETS.md` says no licence permitting redistribution was found, and nothing was scraped |
| Separating mechanics from visuals | Rules never import art. `ASSET_OVERRIDES` allows licensed art to be added without touching rules |

**The repo holds no permission for Bohnanza's content.** The position in `docs/ASSETS.md` covers art only. There is no
document covering its names, counts, beanometers or the rules reproduced in RULES.md, and the README states only that
it is an unofficial private project. So Bohnanza is not a precedent for permission. Whether that content needs
permission is an open question for the owner, not something this note settles.

**Technically the method would transfer. Claude won't apply it to Dominion's cards.** Numbered rules, typed definitions,
tests by ID and art kept apart all work on this engine. But that method writes a published game's card set into the
repo, which is the limit under Scope above. The difference from Bohnanza is one of what Claude will build, plus scale:
Bohnanza's content is a short table of uniform beans, while Dominion's is a catalogue of individually designed cards,
which is closer to open question 2 below. This note doesn't conclude that one is lawful and the other isn't.

**Rulebook not read.** The fetch of the Second Edition rulebook PDF returned HTTP 403 on 2026-11-03, and no way around
that was tried. Nothing here claims conformance to it. Mechanics were assessed from general knowledge of the genre.

**What was done instead.** The engine gained general mechanics common across the genre (DB-FX-19…34, DB-ATT-8…14,
DB-TRIG-5…7, DB-END-6, DB-PRIV-7…9), tested on cards named for what they exercise. The engine accepts any valid
`Ruleset`, and has no Dominion ruleset, stub, setup table or card-by-card mapping. The limitation stays isolated: nothing
in the engine, UI or server depends on which card set runs on it.

An untracked planning file, `data/dominion/`, was in the working tree during this review. It wasn't used for anything here, it
isn't in the tree now, and it was never committed.

## Sources reviewed

### Copyright Office, game guidance

The page states that "the idea for a game is not protected by copyright" and that "the name or title given to the
game and the methods for playing it are not protected by copyright." It also says literary or pictorial expression
may be protected, including "the text describing the rules of the game" and "the graphic art appearing on the
gameboard or container." It does not address trademark, or whether a full set of specific cards counts as method or
expression.

### `paulbatum/Dominion`

- **Licence:** MIT, "Copyright (c) 2010 Paul Batum, Glenn Condron, Trent Kerin". Last commit 2011-06-01.
- **What it is:** a C# ASP.NET game with 302 `.cs` files, a rules engine of about 2.5k lines, about 83 per-card files,
  and SpecFlow specs (about 81 `.feature` files).
- **Not covered by that licence just by being in the repo:** the bundled `Binaries/` (Autofac, Rx, SpecFlow, MvcContrib,
  NUnit, Newtonsoft and others) and the jQuery and jQuery UI files, which have their own terms.
- **Card images:** its README says they are not distributed.
- **MIT does not answer the game question.** It licenses those authors' code. It can't grant rights in a publisher's
  names, cards or text.
- **Reused here: nothing.** The architecture is a live object graph that doesn't serialise, and the cards and specs
  are specific to that game. An effect stack with decision records is a common pattern and this engine has one too,
  but its code is independently written in a different language with a different, JSON-persistent design. If MIT code
  is ever adapted, its notice must be kept.

### `mehtank/androminion`

- **Licence:** none. GitHub's API reports no licence and the repo has no licence file. The only licence text found was
  the Apache header on the third-party `TouchListView`. With no licence, no reuse right is granted. **Treat it as not
  reusable.**
- **What it is:** a Java Android app whose README calls it "Unofficial Dominion for Android" and says it is "neither
  supported nor endorsed by Rio Grande Games". It has 109 Java files, and card strings in several languages under
  `res/values-*/strings-cards.xml`.
- **Reused here: nothing.** The card strings were located but not copied, and are the publisher's wording at most.

### `sgraaf/dominion-setup`

- **Licence:** GPL-3.0-only (`LICENSE` and `pyproject.toml`), by Steven van de Graaf.
- **What it is:** a Python library and CLI that picks a setup. `src/dominion_setup/data/cards/*.json` holds structured
  card data (`base.json` has 39 entries) with name, types, purpose, cost, set, editions, quantity, image and
  instructions. `bin/scrape_cards_list.py` indicates the data was scraped.
- **The licence does not clear the data.** The GPL can cover the author's code and, at most, their arrangement of the
  data. It can't grant rights in a publisher's names or card text, and the README says nothing about card content.
  Bundling GPL code or data here could also impose copyleft on what ships with it.
- **Reused here: nothing.** Its market-selection idea is ordinary functionality, and this engine has its own.

### Result

None of the three repos supplies authorised card content. Nothing from them was copied, and none of their code was
run. Game mechanics are generally not protected by copyright, but names, text, art and trade dress may be. Software
licences on fan projects can't settle that, because the authors can only license what they own.

## Open questions

Only a lawyer or the rights holder can answer these with any authority.

1. Does a private, noncommercial, friends-and-family deployment change the analysis? Noncommercial use can matter to
   some questions, but it is not a general exemption. A public URL on the internet may also not count as "private".
2. Where is the line between game mechanics and protected expression for a large set of specific cards?
3. What are the trademark limits on naming a game, or describing compatibility with one?
4. What would a licence from the publisher cover, and on what terms? This is the one route that would settle all of
   the above. Nothing in this repo assumes one exists.
5. How much functional card wording stays outside copyright? Original sets avoid this by writing their own.

## Repo rules

- No unlicensed third-party art, card text, scans, or files extracted from commercial apps.
- Nothing is to be described as licensed or authorised without a document that says so, recorded in `docs/ASSETS.md`.
- Third-party code keeps its licence notice, and the licence is checked for each file rather than assumed from the repo.
