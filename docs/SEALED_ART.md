# Sealed Correspondence art bible

This is the look for Sealed Correspondence. The rest of the site follows DESIGN.md. The art is a set of storybook
portraits of an invented Renaissance court. The licensing is in [ASSETS.md](ASSETS.md#sealed-correspondence).

## The look

Each image is a half-length portrait of one court character, in gouache and ink. The palette is muted: ivory,
burgundy, brass and charcoal. Light comes from warm candlelight against a dark, plain backdrop.

Every face is invented. No real people, coats of arms or historical figures appear. The images contain no text and
are never framed: the card supplies the frame.

## The cast

| Value | Character | Reads as | Prop |
|---|---|---|---|
| 9 | Heir | Young noblewoman, gold circlet, burgundy gown | A sealed letter held close |
| 8 | Dowager | Elderly widow in black velvet, pearls and a veil | A small book or fan |
| 7 | Ambassador | Bearded envoy in a dark doublet and chain of office | Letters on a desk |
| 6 | Archivist | Stern woman among shelves | A ledger |
| 5 | Magistrate | Judge in crimson robes and cap | A staff of office |
| 4 | Confessor | Hooded monk, eyes lowered | A lit candle |
| 3 | Duelist | Confident young swordsman in a slashed doublet | A rapier |
| 2 | Scribe | Elderly bearded scribe | A quill |
| 1 | Censor | Severe official in black | A quill striking a letter |
| 0 | Informant | Cloaked figure half in shadow | A folded note |

## Card layout

The layout is in `src/games/sealed/ui/Card.svelte`. Cards are 5:7. The portrait fills the card. A wine-red value
medallion with a brass rim sits top left. An ivory name plate along the bottom carries the name, and the ability on
the larger sizes. The plate covers the bottom of the portrait, so key detail sits in the top three quarters.

The card back is a burgundy and brass ornament around a wax seal. Favors are drawn as red wax seals.

## Making more

Use `node scripts/art/sealed.mjs generate <dir>` to produce two seeds for every prompt. Pick one per character, then
record the choice in `PICKS`. Then run `node scripts/art/sealed.mjs build <dir>`. Prompts carry the shared style line
and negative prompt from the script; keep them. Reject an image for any of these:

- It has text, a mock signature the crop can't remove, or a frame.
- It has broken hands or extra limbs.
- It reads as a photo.
- It is so dark that the character no longer reads at 54 px wide.
