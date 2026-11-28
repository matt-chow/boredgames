# Assets

## Licensing position

Bohnanza's card illustrations belong to their publishers and artists (AMIGO Spiel + Freizeit / Rio Grande Games).
We found no licence that permits redistributing them. We did not scrape them, hotlink them, or assume that images
found online are licensed. The game ships with **original placeholder artwork** instead.

The placeholders are fully functional:

- Each card shows its bean name, a distinct colour and silhouette, and its card count.
- The beanometer is on the inspect view.
- Card text contrast is at least 4.5:1.

## Manifest

| Asset | Path | Source | Licence |
|---|---|---|---|
| 13 bean "crate label" cards (inline SVG + CSS colours) | `src/games/bohnanza/ui/art.ts` | Original, made for this project | Project's own |
| Card back, coin, crate, table surface | CSS in `Card.svelte`, `Coins.svelte`, `Field.svelte`, `Camera.svelte` | Original (CSS only) | Project's own |
| UI icons | `src/hub/Icon.svelte` (inline SVG paths) | Original, drawn for this project | Project's own |
| Big Shoulders Stencil (label font, Latin subset, variable woff2) | `public/fonts/big-shoulders-stencil-latin.woff2` | The Big Shoulders Project Authors (github.com/xotypeco/big_shoulders) | SIL Open Font License 1.1 (`public/fonts/OFL.txt`) |
| Box covers | `public/art/covers/*.svg` | Original, made for this project | Project's own |
| Kingdom & Commerce card and Crown Project scenes (179 manifest entries; none are generated paintings). All 179 are clear-line SVGs in `public/cards/`, drawn from code in `scripts/art/`, with inline fallback scenes for a card not yet drawn; see docs/ART_BIBLE.md | `public/cards/`, `src/games/clockwork/ui/art.ts`, listed in `data/clockwork-commons/art-manifest.json` | Original, made for this project | Project's own |
| Favicon | `public/favicon.svg` | Original | Project's own |
| Sound effects | `src/client/lib/sound.ts` | Synthesised at runtime with the Web Audio API; no audio files | Project's own |

No asset is fetched from a third-party origin at runtime. The Content-Security-Policy in `public/_headers` allows only
`'self'` (plus `data:` images).

## Dead Drop

All original, drawn in SVG by `scripts/art/deaddrop.mjs` (run it with `node` to regenerate), with no third-party material and no image service. Stamps and the report letterhead are SVG text in the system Courier stack, so no font file ships.

| Files | What |
|---|---|
| `public/art/covers/dead-drop.svg` | Game cover: two rival agents in a European city at night |
| `public/art/deaddrop/{embassy,station,hotel,harbour}.svg` | The four locations |
| `public/art/deaddrop/icon-{deliver,investigate,intercept,decoy,cover,challenge}.svg` | Order, Cover and challenge icons |
| `public/art/deaddrop/{dossier,report,paper}.svg` | Mission folder, report letterhead, paper texture |

## Miners & Saboteurs

The card faces are original paintings made for this project in v1.3. They were generated from text prompts plus a
layout guide that `scripts/art/mines-paint.mjs` draws from each card's own metadata. No reference images, artist
names or third-party pictures were used. The script holds every prompt, seed and pick and can regenerate the set. It
also checks each tunnel's painted openings against its links (MS-ART2). The look is described in
[MINES_ART.md](MINES_ART.md). The model, host, licence and caveat are the same as for Sealed Correspondence (below):
Deliberate on AI Horde's free anonymous tier.

Since v1.4 the roles, actions, backs and rewards are repainted with the image tool built into the Codex CLI
(`codex exec`), on the owner's ChatGPT plan, with no API key, per-image billing or paid asset. They share one style
prompt, and the only reference image is the Miner face from this same set. The raw PNGs stay outside the repo in
`.art/mines/raw`. The tunnels and destinations are still the AI Horde paintings.

The small badges, the deep mine view and the cover are original SVG, drawn by `scripts/art/mines.mjs` from the same
card registry with no third-party material. MS-ART1 checks that every registered kind has its file.

| Files | What |
|---|---|
| `public/art/mines/*.webp` (69) | Tabletop faces, 240×360: 35 tunnels, entrance, gold and two coal destinations; 7 roles; 18 actions; deck and role backs (a face-down destination shows the deck back); 3 rewards |
| `data/mines-art-manifest.json` | One row per painted face: asset, card, category, rulesets, file, size, variant, source, fallback |
| `public/art/mines/{nugget,crystal,tool*}.svg` (8) | Round badges for gold, crystals and tools, intact and broken |
| `public/art/mines/deep/*.svg` (39) | Deep mine view: tunnels, entrance and destinations by lamplight |
| `public/art/covers/mines.svg` | Game cover: a lantern-lit timbered shaft and a cart of gold |

## Using licensed artwork

If you obtain permission from the rights holders:

1. Put the images under `public/assets/beans/`, for example `blue.webp`. Use portrait images at a 5:7 ratio, about
   400×560 px, WebP or AVIF.
2. Map them in `ASSET_OVERRIDES` in `src/games/bohnanza/ui/art.ts`:
   ```ts
   export const ASSET_OVERRIDES: Partial<Record<Bean, string>> = { blue: '/assets/beans/blue.webp' };
   ```
3. Record each file and its licence in the manifest above.

`Card.svelte` draws the image in place of the placeholder silhouette. Nothing in the rules, server or protocol changes.
Partial sets are fine, so any beans you don't map keep their placeholders.

## Sealed Correspondence

The portraits, card back, favor seal and cover are original images made for this project. They were generated from
text prompts only, with no reference images, artist names or third-party pictures. `scripts/art/sealed.mjs` holds
every prompt, seed and pick and can regenerate the set. The look is described in [SEALED_ART.md](SEALED_ART.md).

- **Model:** Deliberate, a Stable Diffusion 1.5 checkpoint, released under the CreativeML OpenRAIL-M licence.
- **Where:** run on AI Horde's free anonymous tier (aihorde.net), a volunteer network that charges nothing and adds
  no watermark.
- **Licence:** OpenRAIL-M places use restrictions on the model (no harmful uses). It claims no rights in the images
  it produces.
- **Caveat:** in some jurisdictions, images generated by a model may not be protected by copyright at all. Treat them
  as the project's own, but not as exclusively owned artwork.

| Files | What |
|---|---|
| `public/art/sealed/{heir,dowager,ambassador,archivist,magistrate,confessor,duelist,scribe,censor,informant}.webp` | The ten character portraits, 360×504 |
| `public/art/sealed/back.webp` | Card back |
| `public/art/sealed/seal.webp` | Favor seal, cut to a circle |
| `public/art/covers/sealed.webp` | Game cover, 600×840 |

The card frame, value medallion and name plate are CSS in `src/games/sealed/ui/Card.svelte`. The sounds are
synthesized at runtime in `src/games/sealed/ui/audio.svelte.ts`; no audio file ships.

## Palazzo

The five role portraits, the card back and the cover are original images made for this project, generated the same
way as Sealed Correspondence's: from text prompts only, with no reference images, artist names or third-party
pictures, using Deliberate (CreativeML OpenRAIL-M) on AI Horde's free anonymous tier. The same licence and caveat
apply. `scripts/art/palazzo.mjs` holds every prompt, seed and pick and can regenerate the set.

| Files | What |
|---|---|
| `public/art/palazzo/{chancellor,magistrate,bravo,envoy,sentinel}.webp` | The five role portraits, 360×504 |
| `public/art/palazzo/back.webp` | Card back |
| `public/art/covers/palazzo.webp` | Game cover, 600×840 |

The engraved frame and name plate are CSS in `src/games/palazzo/ui/Card.svelte`. The sounds are synthesized at run
time, so there are no audio files.

## Apex '66

The paintings are original images made for this project with the image tool built into the Codex CLI
(`codex exec`), signed in with the owner's ChatGPT plan. There was no API key, no per-image billing and no paid asset.
OpenAI's terms assign the output to the user. The prompts are written from [APEX_ART_BIBLE.md](APEX_ART_BIBLE.md),
with no artist names, real brands, circuits or people. The only reference images are earlier accepted paintings
from this same set, which keeps the family consistent. `scripts/art/apex-paint.mjs` holds the prompts and builds the
web files. `data/apex-art-manifest.json` records every attempt: prompt, references, raw file, time, status and the
reason for each rejection. The raw PNGs stay outside the repo in `.art/apex/raw`.

| Files | What |
|---|---|
| `public/art/apex/card-*.webp` | Driving-card art windows, 480×360: Pace 1–5, Coast, Stress, Strain |
| `public/art/apex/part-*.webp` | Upgrade catalogue pictures, 320×320 |
| `public/art/apex/{sponsor,press,event,weather,rival}-*.webp` | Paddock spot pictures, 320×320 |
| `public/art/apex/poster-*.webp` | Eight circuit posters, 600×900 |
| `public/art/apex/prop-*.webp` | Eighteen board scenery miniatures with alpha, longest side 256 |
| `public/art/apex/car-{0..7}.webp` | One painted car, recoloured to the eight liveries, 240×112 with alpha |
| `public/art/apex/misc-{cover,trophy,school}.webp` | Game cover (also the hub cover), championship trophy, Driving School coach |

Every painting has a code-drawn fallback: the SVG symbols in `src/games/apex/ui/Art.svelte` for scenery and the car,
and the plain card and panel layouts elsewhere. The track, lanes, spaces, corner markers, gauges, icons and the car's
stripe and number roundel stay SVG.
