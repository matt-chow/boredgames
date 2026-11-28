# Apex ’66 art bible

The paintings for Apex ’66 look like one illustrated 1966 motorsport board game by one artist. Cohesion beats novelty:
a striking picture that does not match its family is regenerated. The rest of the site follows DESIGN.md; the board
geometry, cards' text and every functional mark stay code-drawn (see "What is not painted").

## The look

Mid-century geometric motorsport illustration crossed with screenprinting, like period racing posters and automotive
advertising:

- bold, simplified silhouettes with moderate, recognisable mechanical detail;
- flat colour shapes with two or three tonal steps, light from the upper left;
- restrained thin charcoal outlines, used sparingly;
- subtle printed ink grain and screenprint texture, never heavy grunge;
- generous negative space and three to five dominant colours per picture.

Never: photorealism, 3D renders, gloss, airbrushed gradients, modern cars or aerodynamics, exaggerated cartoons, clip
art, neon, or any text, numbers, logos or brand marks inside a painting. The UI prints every name, number and rule.

## Palette

| Role | Colour |
|---|---|
| Ivory (paper, light body) | `#EDE3CB` |
| Red | `#B43D32` |
| Deep green | `#254C3D` |
| Ochre | `#D0A34B` |
| Petrol blue | `#486E8A` |
| Charcoal (ink, tyres) | `#292D2B` |
| Secondary: terracotta, sage, mist | `#BD7858`, `#94A58A`, `#B9C2BF` |

Circuit posters add one controlled regional accent: Ashford green/ivory, Bellavista red/ochre, Belle-Rive
turquoise/coral, Redwood forest/rust, Mizukawa indigo/mist, Puerto del Sol terracotta/sandstone, Noordzee blue/sand,
Kalahari burnt orange/brown.

## Prompts

Every prompt is the master prompt, then the family template with one subject line, then the negative prompt. The exact
text lives in `scripts/art/apex-paint.mjs` (`MASTER`, `FAMILIES`, `AVOID`); subjects live in
`scripts/art/apex-subjects.mjs`. Within a family only the subject line changes.

**Master.** A mid-century geometric motorsport illustration in the style of a 1966 screenprinted racing poster and
period automotive advertising. Bold simplified silhouettes, moderate recognisable mechanical detail, flat colour shapes
with two or three tonal shading steps, restrained thin charcoal outlines used sparingly, subtle printed ink grain with
slight screenprint texture, generous negative space, light from the upper left. Palette as above; three to five
dominant colours.

**Negative.** Any text, letters, numbers, logos, brand names, watermarks, signatures, frames or borders; photorealism,
3D render, glossy reflections, airbrushed gradients, modern cars or aerodynamics, sponsor decals, exaggerated cartoon
proportions, heavy grunge, clip art, neon colours.

## Families

| Family | Count | Template (what stays fixed) | Shipped as |
|---|---|---|---|
| Driving cards | 8 | Edge-to-edge 4:3 scene, low horizon, one car small to medium. Pace 1→5 runs from a calm roll-out to flat out with speed bands; Coast is petrol-blue cooling air; Stress is a twitch at the limit; Heat is a hot engine in red. | 480×360 WebP in the card's art window |
| Upgrades | 63 | Parts-catalogue object, three-quarter view from slightly above, centred at two thirds of the frame, flat ivory ground with a small flat shadow. Related parts share motifs (tyres, radiators, brakes) but each is its own object. | 320×320 WebP |
| Paddock | 46 | Square edge-to-edge spot scene: 6 sponsors (product vignettes, no lettering), 10 press objectives, 16 events, 6 weathers, 8 rival portraits sharing one head-and-shoulders framing. | 320×320 WebP |
| Circuit posters | 8 | Portrait 2:3; top quarter empty sky for the title; landmark at the upper third; signature bend from lower left to centre right; one car in the lower third. | 600×900 WebP |
| Scenery | 18 | One tabletop miniature, high three-quarter view (~55°), lit from the upper left, chunky scale-model proportions, keyed from magenta to transparency. | WebP with alpha, longest side 256 |
| Car | 1 + 8 | One canonical overhead car, nose right, plain ivory body. The eight liveries are recoloured from that one picture, so silhouette, scale, orientation and pivot are identical. Stripe, number roundel and shadow stay SVG on top. | 240×112 WebP with alpha |
| Cover and extras | 3 | Cover (also the hub cover), Driving School coach, championship trophy. | 600×840 WebP |

## Consistency protocol

1. Pilot a dozen pictures across the families and compare them on one contact sheet
   (`node scripts/art/apex-paint.mjs sheet`).
2. Lock canonical references per family from the accepted pilot. Every later batch attaches them (`--ref`).
3. Paint in batches of four in one Codex session, so a batch shares one hand.
4. Compare each batch against the references and the accepted batches. Reject outliers, even good-looking ones, and
   repaint them; never let the style drift towards the newest picture.
5. `data/apex-art-manifest.json` keeps every attempt: prompt, references, raw file, time, status and notes.
6. A final contact sheet of the whole catalogue is checked before shipping.

## Where the pictures come from

Pictures are made with the image tool built into Codex CLI (`codex exec`), signed in with the owner's ChatGPT plan.
There is no API key, no per-image billing and no paid asset. Prompts are written from this bible: no artist names,
real brands, real circuits, real people or third-party pictures. Raw PNGs stay out of the repo in `.art/apex/raw`.

## What is not painted

The track, lanes, spaces, corner markers, tunnels, gravel and every functional icon are drawn from circuit geometry in
SVG, so painted scenery never decides a space. Card names, numbers and rules text are printed by the UI over or beside
the art. The dashboard gauges and gear selector stay vector. Each painting has an SVG or CSS fallback that draws if the
file is missing.

The module emblems, a card back and a table texture have subjects in `apex-subjects.mjs` but are not painted:
the module switches are drawn by the hub's shared options UI, the deck is shown as a count, and the board keeps its
flat field colour.
