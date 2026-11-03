---
name: Bored Games
description: A private night-market table for playing Bohnanza with friends.
colors:
  ground-0: "#0f0b08"
  ground-1: "#16110d"
  ground-2: "#1f1813"
  ground-3: "#2a211a"
  rim: "#3d3026"
  rim-hi: "#5a4636"
  ink: "#efe6da"
  ink-2: "#c3b5a4"
  ink-3: "#8f8070"
  sprout: "#c9e04a"
  sprout-ink: "#1a1f05"
  warn: "#f08a5d"
  coin: "#e8b84a"
  coin-ink: "#3a2706"
typography:
  display:
    fontFamily: "Big Shoulders Stencil, system-ui, sans-serif"
    fontSize: "clamp(56px, 9vw, 96px)"
    fontWeight: 800
    letterSpacing: "0.01em"
  label:
    fontFamily: "Big Shoulders Stencil, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "0.06em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    lineHeight: 1.45
  button:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
components:
  button:
    backgroundColor: "{colors.ground-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary:
    backgroundColor: "{colors.sprout}"
    textColor: "{colors.sprout-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
  button-small:
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  text-input:
    backgroundColor: "{colors.ground-0}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "48px"
  card:
    width: "76px"
    height: "106px"
    rounded: "{rounded.sm}"
---

# Design System: Bored Games

## Overview

**Creative North Star: "The night-market produce stall"**

A wooden stall after dark: charred timber, warm lamplight on paper, stencilled crate labels. The table is dark and
quiet so the cards, the only bright paper on it, carry the colour. Everything the player can act on right now is
marked in one acid "sprout" green; nothing else uses it.

The table sits under a fixed isometric camera (CSS 3D, no WebGL). Players zoom and pan but never rotate, so the layout
stays readable and front-facing text never skews. Density is low: one hand, two or three fields per player, two
piles, one trading dock.

**Key characteristics:**

- Dark warm neutrals, never pure black or cool grey.
- One signal colour (sprout) meaning "legal / your move". Coin gold is for coins only; warn orange for errors only.
- Stencil display type for labels and headings; the system UI font for everything people read at length.
- Motion follows confirmed server state: cards move because something happened, never in anticipation.

## Colors

Warm, low-chroma browns with three accents that each have one job.

- **Ground 0–3** (`#0f0b08` → `#2a211a`): the table and surfaces, darkest at the back. Elevation is shown by stepping
  up one ground, not by new hues.
- **Rim / Rim-hi** (`#3d3026`, `#5a4636`): hairline borders on surfaces and controls.
- **Ink 1–3** (`#efe6da`, `#c3b5a4`, `#8f8070`): primary text, secondary text, hints and placeholders.
- **Sprout** (`#c9e04a` on `#1a1f05`): the single signal. Primary buttons, legal drop targets, the active turn, focus
  rings, selection.
- **Warn** (`#f08a5d`): illegal-move explanations and errors.
- **Coin** (`#e8b84a` on `#3a2706`): coins and the Bean Coin only.
- **Bean colours** live with the card art (`src/games/bohnanza/ui/art.ts`), each chosen for 4.5:1 label contrast.

## Typography

- **Display / label:** Big Shoulders Stencil (self-hosted variable woff2, SIL OFL). Uppercase with 0.06em tracking for
  labels; the hub title at `clamp(56px, 9vw, 96px)`.
- **Body and controls:** the system UI stack at 15px / 1.45. Buttons are 600 weight; small buttons 13px. Text inputs
  use 17px so phones do not zoom on focus.
- Numbers (coins, counts) use tabular figures via `.num`.

## Layout

- **Spatial layout** (wide screens): the isometric table fills the viewport, the fanned hand sits at the bottom, the
  trading dock is always present on the right so the camera never re-fits when it opens.
- **Compact layout** (phones): a flatter, stacked table; the trading dock becomes a bottom sheet that opens itself
  when an offer arrives.
- The camera has zoom bounds and a reset control. Side gutters are 16px on phones.

## Elevation & Depth

Layered and lit from above. Three shadow steps: `--shadow-1` for resting surfaces, `--shadow-2` for raised panels and
dialogs, `--shadow-lift` for a card being hovered, dragged or inspected. Depth on the table comes from the real CSS 3D
camera; shadows only reinforce it.

## Shapes

Small radii, like die-cut card and planed wood: 6px for cards and small controls, 10px for buttons and inputs, 16px
for panels and dialogs. Cards are portrait 5:7 (76 × 106 px at rest).

## Components

- **Buttons:** solid ground-3 with a rim-hi border; primary is sprout; ghost is text-only until hovered. Press scales
  to 0.97. Disabled is 45% opacity.
- **Text input:** recessed (ground-0), 48px tall, border turns sprout on focus.
- **Cards:** crate-label art with bean name, silhouette and card count; the back is a stencilled crate. Hover lifts,
  click opens an enlarged inspection with the beanometer.
- **Fields:** wooden crates that show the stacked beans and their current harvest value; legal targets glow sprout
  during a drag or selection.
- **Trading dock:** each proposed offer is a dashed "slip" (an offer addressed to you is edged in sprout). Once
  accepted, the cards fly to the receivers' pending area, so proposed and committed are never confused. Accept /
  Reject / Withdraw / Counter sit on the slip.
- **Hub shelf:** the home page is a shelf of timber crates, one per listed game. A crate holds the game's cards fanned
  as if dealt into it (the deal plays once on load, and the fan opens on hover or focus) and a paper label with the
  stencilled name, a one-line pitch, players and length, and two actions: the sprout primary "Open a table" and the
  plain "Practise with bots". An empty crate with dashed card outlines holds the place for the next game. The single
  name field sits in the header and serves every action.
- **Switches** (lobby variants): sprout when on; options that cannot be used at this player count stay visible with
  the reason.

## Do's and Don'ts

- **Do** use the tokens in `src/client/styles/global.css`; never literal colours.
- **Do** keep sprout for "legal / your turn" only.
- **Do** animate `transform` and `opacity` only, with `--ease-out` and `--dur-1..3`, and skip motion under reduced
  motion or the low-performance setting.
- **Don't** rotate the camera or skew text; controls stay front-facing.
- **Don't** add publisher artwork without a licence (docs/ASSETS.md).
- **Don't** animate a move before the server confirms it.
