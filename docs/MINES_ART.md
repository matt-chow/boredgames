# Miners & Saboteurs art bible

This is the look of the Miners & Saboteurs card faces from v1.3 on. The rest of the site follows DESIGN.md. The
licensing is in [ASSETS.md](ASSETS.md#miners--saboteurs).

## The look

The style is a light, slightly comic, ligne-claire-inspired fantasy mine: clean, even black ink outlines, flat colour
with soft cel shading, and warm lantern light. The palette is sandstone, ochre, moss green and slate blue, kept warm and
earthy. Every figure is invented, and nothing is copied from any published game. The images carry no text; the
card's own bands and badges carry the information.

## What is painted

| Group | Count | How it reads |
|---|---|---|
| Tunnels, entrance, destinations | 39 | Overhead tile: sandy floor, sleepers and rails through dark boulders. Dead ends are heaps of grey rubble. Ladders, gates and crystals are drawn where the card has them. |
| Roles | 7 | One full-body character, hat to boots, with a coloured band along the bottom in the role's colour |
| Actions | 18 | One small scene per action, with a dark band at the top and bottom. Tool cards show the tool badges top right. |
| Card backs, rewards | 6 | Deck, role and destination backs (the backs have an inner gold border); 1, 2 and 3 gold pips on the rewards |

The eight round badges (nugget, crystal, the three tools and their broken forms) stay crisp SVG icons. So do the deep
mine tiles in `public/art/mines/deep/` and the cover.

## Tunnel geometry

A tunnel's picture has to match its connectivity metadata exactly. The model never decides where the tunnels go:

1. `layout(def)` in `scripts/art/mines-paint.mjs` draws a guide from the card's `links` (the same metadata the
   engine uses): a sandy shaft from each open edge to the centre, or to a stub of rubble for a dead end. Ladders,
   gates, crystals, nuggets and the overpass bridge are drawn in too.
2. The guide goes to the model as img2img at denoising strength 0.5. Above about 0.6 the model paints buildings
   instead of tunnels. A tile whose opening washes out can be given a lower strength in `STRENGTH`.
3. `openings()` measures every painted edge of the framed card: the contrast lift of a strip 3–9 px in from the edge
   midpoint against the same strip 85 px either side. A lift over 35 counts as open. In the shipped set every opening
   measures at least 37 and every closed edge at most 27, so a repainted tile near either figure needs another seed.
4. `build` measures each tunnel after framing it and refuses the set if any measured openings differ from the links.
   MS-ART2 repeats the check on the shipped files.

Rotation stays a CSS half turn, so a turned tile is the same picture upside down.

## Making more

Run `node scripts/art/mines-paint.mjs generate <dir> [kind…]` to render every face for its seeds (`SEEDS` for
tunnels; three second-pass seeds for the rest, or the single seed of a first-pass picture kept in `V1`). Record
the chosen seed in `PICKS`, then run `node scripts/art/mines-paint.mjs build <dir>`. The build resizes to 240×360,
frames, overlays and writes `public/art/mines/<kind>.webp`, plus the manifest `data/mines-art-manifest.json`. Keep the
shared style line and negative prompt from the script. Reject an image if any of these hold:

- It contains text, a signature, a frame or a panel border.
- A figure is cropped, or has broken hands or extra limbs.
- A tunnel opening is blocked, or extra tunnel appears where the card has rock (the build catches most of this).
- It turns into a building, a landscape or a perspective view rather than a tile seen from above.
- It no longer reads at 56 px wide, the board's smallest tile.
