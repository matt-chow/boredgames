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
| Kingdom & Commerce card and Crown Project scenes (110 manifest entries; none are generated paintings). All 110 are clear-line SVGs in `public/cards/`, drawn from code in `scripts/art/`, with inline fallback scenes for a card not yet drawn; see docs/ART_BIBLE.md | `public/cards/`, `src/games/clockwork/ui/art.ts`, listed in `data/clockwork-commons/art-manifest.json` | Original, made for this project | Project's own |
| Favicon | `public/favicon.svg` | Original | Project's own |
| Sound effects | `src/client/lib/sound.ts` | Synthesised at runtime with the Web Audio API; no audio files | Project's own |

No asset is fetched from a third-party origin at runtime. The Content-Security-Policy in `public/_headers` allows only
`'self'` (plus `data:` images).

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
