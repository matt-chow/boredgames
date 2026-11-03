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
| Original card sets using these mechanics, with original names, text and art | None identified, if independently designed | Not started; needs approval |
| 2.5D table and card UI in the hub's own design language | None, if the look is our own | Not started |
| Dominion's name and branding | Trademark question; Claude won't build it | Not built |
| Dominion's card list and expansions, card by card, including renamed copies | Not a settled legal question here; Claude won't build it | Not built |
| Its recommended market lists | Selection may be protected; Claude won't build it | Not built |
| Its card text and rulebook wording | Copyright: expression | Not built |
| Its card art, layout and look | Copyright, possibly trade dress | Not built |

**Closest alternative that keeps the mechanics:** original card sets on this engine, drawing on the same families of
mechanics (see DECKBUILDER.md), designed as their own game and added to the hub only with the owner's approval.

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

- **Licence:** no repo-level licence file found in my search. The only licence text found was the Apache header on the
  third-party `TouchListView`. **Treat it as not reusable.**
- **Not inspected further:** the card description strings. Nothing from this repo was used.

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
