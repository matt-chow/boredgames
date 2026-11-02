# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the owner's written brief ("BOARD GAME HUB — BOHNANZA v1.2"). The owner asked for autonomous
> execution without interruption, so no interview round was run. Items marked *(inferred)* were not confirmed.

## Platform

web

## Stack

Pinned by the brief: Svelte 5 + TypeScript + Vite, plain CSS with design tokens, CSS 3D transforms and the
Web Animations API. Cloudflare Workers + Durable Objects backend. No WebGL, game engines or heavy frameworks.

## Users

A small private group of friends (about 3–5 per table, around 12 people at once) playing Bohnanza together from their
own devices: laptops and phones. They are usually on a video or voice call, or in the same room *(inferred)*.
Their job is to start a game quickly, play by the rules without arguing about them, and trade with each other.

## Product Purpose

A private board game hub. Its first game is a complete, faithful online Bohnanza for 3–5 players with the official
anniversary variants. Success means a full game plays to completion across devices without anyone needing to know
the rules by heart. Hidden information stays hidden, and reconnecting after a refresh is seamless.

## Positioning

A rules-exact, server-authoritative table that feels like sitting at a real one. Your hand order is fixed, as in
the physical game. The trading is negotiated, not menu-driven. Nobody can cheat by inspecting the browser.

## Operating Context

- Sessions run about 45–75 minutes.
- Play is dominated by negotiation. Players spend most of their time looking at the shared trading area and their
  own hand, then commit to small, decisive actions (plant, harvest, offer, accept).
- Play typically happens in the evening at home *(inferred)*.

## Capabilities and Constraints

- Rooms are joined by a 6-character code, and players enter only a display name.
- Variants: Three New Bean Types, Field Bean, Bean Coin and Magpie. Duel is never offered, because it is for 2 players only.
- The game has a "How to Play" popup, an end-of-game summary, reduced-motion, low-performance and mute settings, and
  both spatial and compact table layouts.
- **Artwork is original.** No official Bohnanza artwork is licensed. Card art must be replaceable through an asset
  manifest without touching rules or networking.

## Brand Commitments

- The brief binds the look: "premium, minimalist, dark 2.5D tabletop", with a fixed isometric camera and no rotation.
- No official Bohnanza art, logos or trade dress may be used.

## Evidence on Hand

No artwork, logos or brand assets have been supplied. Nothing should be invented that implies an official affiliation.

## Product Principles

1. The table is the interface: state is shown where it lives (fields, piles, hand), not in side panels.
2. Legal moves are always visible; illegal ones explain themselves.
3. Motion reports confirmed state; it never invents it.
4. Negotiation first: trading must be faster than talking about it.

## Accessibility & Inclusion

- Reduced-motion and low-performance modes are required.
- Readable on phones.
- Bean types must be distinguishable without relying on colour alone (name plus count) *(inferred)*.
