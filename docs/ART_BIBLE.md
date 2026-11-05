# Kingdom & Commerce art bible

The standard for card illustrations. Status: **approved by the owner, and complete.** All 110 cards and Crown Projects have
an illustration: the five approved pilots, unchanged, and 105 drawn afterwards to the same standard. A card added later
falls back to an inline scene from `src/games/clockwork/ui/art.ts` until it is drawn.

## The look in one paragraph

Original clear-line illustration of Renaissance Europe. One dark ink describes every form, flat natural colour fills
it, and the world is researched and solid while the people are simple and expressive. A scene should reward a second
look without being hard to read at a first. The drawing belongs to this game: never copy a comic panel, a named
character, a published card or a specific artist's composition.

## Period and setting

Europe, 1450 to 1600, in an invented kingdom: no real coats of arms, no real cities, no named historical people.

- **Allowed:** merchant houses, civic squares, guildhalls, palaces, chapels, harbours, farms and estates, period dress
  and tools. A little fantasy, if it could pass as a legend told in that kingdom.
- **Banned:** steampunk, gears as decoration, industrial machinery, Victorian dress, modern objects, high-fantasy
  exaggeration, printed text or lettering inside the art.

### Architectural references

Draw from the general building types, not from one building.

| Type | What makes it read |
| ---- | ------------------ |
| Palace or villa | Symmetric block, rusticated ground floor, smooth upper floor, arcaded loggia, pedimented centre, low terracotta roof |
| Fortified house | Square corner towers on corbels with steep roofs, kept from an older castle |
| Guildhall | Open arcade on piers below, tall hall windows above, a bell tower off centre |
| Town house | Narrow gable to the street, small windows, plaster or brick |
| Curtain wall | Merlons, wall walk, arrow loops, round or square tower, door onto the walk |
| Chapel interior | Vaulted ceiling, lancet window with diamond leading, hung tapestry, patterned tiled floor |

## Palette

Colour comes from these tokens only. They live in `scripts/art/kit.mjs` as `C`.

| Role | Base | Light and dark steps |
| ---- | ---- | -------------------- |
| Burgundy, the kingdom's colour | `#783547` | `#9C5566`, `#54263A` |
| Gold, wealth and light | `#C9A263` | `#E6CE97`, `#9A7A40` |
| Ivory and parchment | `#F5E9D6` | `#E8D9BC`, `#D3C09C` |
| Charcoal, the only ink | `#261D23` | none |
| Stone | `#BDB19D` | `#D6CCB8`, `#8F8474`, `#6C6358` |
| Terracotta | `#B4694A` | `#CF8D69`, `#8A4B35` |
| Slate blue | `#56697A` | `#8DA0AC`, `#364553`, `#232D3B` |
| Sage | `#8A9A72` | `#AEBB92`, `#5F704C`, `#445237` |
| Wood | `#7A5438` | `#A17A55`, `#4F3625` |
| Sky | `#D5E0DE`, `#EEE9D8` | none |
| Skin | `#E8C9A8`, `#CDA27C`, `#98694A` | none |

Sprout green is the interface's signal colour and never appears in art. A shadow is a flat step darker. No gradients,
blurs, filters, textures or painterly shading anywhere. Opacity is reserved for a single shaft of light where a scene
needs one.

## Line standards

Measured at the 640 by 360 master. Round joins and caps throughout. Charcoal is the only ink, except for the fine
inner lines listed below.

| Weight | Width | Used for |
| ------ | ----- | -------- |
| Heavy | 3.2 | Outer contour of each main mass: a tower, a roof, a coin |
| Form | 2 | Inner forms: windows, stalls, steps, drapery edges |
| Fine | 1.2 | Detail: masonry, roof tiles, leading, a stitch, a fold |

Fine detail may use the darker step of its surface instead of ink (roof tiles in dark terracotta, masonry in deep
stone), which keeps it quiet. Figures scale with the drawing, so a person's `line` value is set so the printed weight
stays between 2 and 3 at master size: small distant figures get a larger value.

## Figures

- **Proportion:** about six and a half heads, 130 units tall at scale 1. Slightly big hands and feet are fine.
  Children about four and a half heads. Scale figures in a scene by depth, not by importance.
- **Faces:** a face is a plain oval of skin. No eyes, noses, mouths, eyebrows, cheeks, beards or marks of any kind,
  in any card, at any size. Hair, a hat, a hood or a veil can cover part of the head. `person()` has no way to draw
  a feature, and a test checks that.
- **Telling the story:** use the whole body: the line of the spine, the reach of an arm, who is turned towards whom,
  what the hands hold, and how the clothes mark rank and trade.
- **No clones:** within a scene, no two figures share a pose and a costume. Vary height, stance, hat, and skin and
  hair tones.
- **Dress:** doublets, hose, gowns, aprons, cloaks, berets, coifs, veils, hoods, kettle hats. Fur and gold only on
  people who could afford them.

## Composition and detail

Compositions must differ card to card. A catalog page should never look like one template with different props.

1. **One reading at a glance.** Name the subject in three words. If it takes more, remove things.
2. **Three depths.** A large framing foreground, the subject in the middle, a quieter distance.
3. **A safe centre.** Cards are cropped to several ratios. The subject sits inside the middle 70 percent of the width
   and the middle 80 percent of the height, and the crop never needs to reach an edge to be understood.
4. **Detail hierarchy.** The most fine lines go on the subject. Foreground masses stay simple and dark. The sky and
   far distance get next to nothing. Masonry and tiles are hinted at with a few scattered strokes, never a full grid.
5. **Complexity follows subject, not card power.** A cheap Market Square can be busy, a costly Gold can be plain.

### Categories

| Category | For | Treatment | Pilot |
| -------- | --- | --------- | ----- |
| Object | Treasury, currency | One object large on a plain or minimal ground. Few props | Gold |
| Architecture | Estates, castles | The building is the subject. People optional and small | Grand Duchy |
| Activity | Markets, courts, guilds, defence, trade | People doing something, in a place, with small stories | Night Watch, Royal Confessor, Market Square |

## File structure

- **Location and name:** `public/cards/<card key>.svg`, using the stable internal card key from the rules, never the
  display name. So Gold is `dynamo.svg`, and a later rename cannot break an asset.
- **Registration:** a file is shown once its key is listed in `ILLUSTRATED` in `src/games/clockwork/ui/art.ts`. Any card
  not listed keeps its scene, so a card never has a missing image.
- **Source:** drawn from code, using the shared primitives in `scripts/art/kit.mjs` and `scripts/art/scene.mjs`. The pilots
  are in `scripts/art/pilot.mjs` (`node scripts/build-pilot-art.mjs`), and are not rebuilt by the catalogue script. The rest
  are in `treasury.mjs`, `work.mjs`, `town.mjs` and `court.mjs`: run `node scripts/build-card-art.mjs [key ...]`. That script
  refuses a pilot key, and warns above the size budget.
- **Shape of a file:** one root `<svg>` with `viewBox="0 0 640 360"`, a `<title>`, and one group setting round joins.
  Standalone: no external references, `<image>`, scripts, event handlers, `<style>`, fonts or text.
- **Card text** is never in the art. Svelte draws name, cost and rules text around it.

## Optimization

- Coordinates are rounded to one decimal.
- Repeated strokes merge into one path (`ticks`, `masonry`).
- Budget: 48 KB per file before compression, enforced by a test. SVG text gzips to roughly a third.
- Files load through `<img loading="lazy">`, so an inline DOM tree is never built for them and a long catalog costs
  nothing until a row scrolls into view. The browser's cache handles repeats.

Measured on the complete set of 110: smallest 3,177 bytes, median 9,299, largest 40,523 (`relay_junction`, a pilot), and
1,139,876 in all. Gzipped, the whole set is 197,338 bytes, a mean of 1.8 KB and at most 5.8 KB a card. `public/_headers`
lets browsers cache `/cards/*` for a day. The inline fallback scenes stay in the bundle, so its size did not change.

## Legibility at card size

Review every illustration at these sizes before accepting it:

| Where | Size |
| ----- | ---- |
| Hand and table card | about 88 by 50 |
| Small card on a phone | about 60 by 34 |
| Supply row strip | about 130 by 28 |
| Details dialog | about 180 by 101 and up |

At 60 pixels wide, the subject's silhouette and colour must still say what it is. Fine lines are allowed to fade away,
main masses are not. The strip crop must show part of the subject, not only sky.

## Known weak spots

All 110 were reviewed in contact sheets at 60 by 34, 88 by 50 and as a 150-pixel strip crop. Silhouettes read at each
size. These are accepted but are the first to redraw if the owner wants more:

- `burden_relief`: the bundle sits above a figure who only bends slightly, so the weight reads less than it should.
- `patent_ledger`: the warden is small behind the book, and the quill stands free.
- `belt_sorter`, `noise_complaint` and a few others: the strip crop shows the subject but can cut off heads.

Contact-sheet review is not the same as seeing every card in play, and no person other than the author has reviewed the
105 new drawings yet.

## Pilot cards and how they resolve

| Asked for | Card used | Key | Note |
| --------- | --------- | --- | ---- |
| Gold | Gold | `dynamo` | Exact |
| Grand Duchy | Grand Duchy | `monument` | Exact |
| Castle Guard | Night Watch | `night_watch` | No card has this name. Closest fortified defensive card. No new card was added |
| Royal Confessor | Royal Confessor | `royal_confessor` | Exact |
| Grand Market | Market Square | `relay_junction` | No card has this name. Closest market card. No new card was added |
