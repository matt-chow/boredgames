/**
 * The asset manifest (APEX_ARCHITECTURE.md §8): every visual the table draws, by a stable key. Each key has an SVG
 * fallback drawn in `Art.svelte` (`<symbol id="ax-…">`). A later illustration pass sets `raster` to a file under
 * public/art/apex/ and nothing else changes: the board draws an <image> instead of the symbol.
 */
import type { PropKind } from '../rules/content/circuits';

export interface Asset {
  /** The SVG fallback's symbol id. */
  symbol: string;
  /** A raster override, relative to the site root, or null for the SVG. */
  raster: string | null;
  /** Drawn size in board units, and the anchor (fraction of the size) that sits on the ground point. */
  w: number;
  h: number;
  ax: number;
  ay: number;
}

const prop = (kind: PropKind, w: number, h: number): [string, Asset] => [`prop.${kind}`, { symbol: `ax-prop-${kind}`, raster: null, w, h, ax: 0.5, ay: 0.9 }];

export const ASSETS: Record<string, Asset> = Object.fromEntries([
  prop('stand', 96, 54),
  prop('tree', 38, 46),
  prop('pine', 30, 50),
  prop('palm', 40, 56),
  prop('cactus', 24, 36),
  prop('house', 46, 42),
  prop('hangar', 92, 56),
  prop('tower', 34, 72),
  prop('windmill', 44, 76),
  prop('rock', 40, 28),
  prop('barn', 56, 46),
  prop('tent', 40, 32),
  prop('lighthouse', 30, 80),
  prop('boat', 48, 30),
  prop('shrine', 44, 48),
  prop('dune', 80, 26),
  prop('pits', 110, 40),
  prop('bridge', 120, 40),
  ['car', { symbol: 'ax-car', raster: null, w: 30, h: 14, ax: 0.5, ay: 0.5 }],
  ['poster', { symbol: 'ax-poster', raster: null, w: 300, h: 420, ax: 0, ay: 0 }],
  ['card.back', { symbol: 'ax-card-back', raster: null, w: 70, h: 98, ax: 0, ay: 0 }],
  ['badge.weather', { symbol: 'ax-weather', raster: null, w: 24, h: 24, ax: 0.5, ay: 0.5 }],
]);

export const propAsset = (kind: PropKind) => ASSETS[`prop.${kind}`];

/** Car liveries: body, stripe and number roundel, all original combinations. */
export const LIVERIES = [
  { name: 'Vermilion', body: '#c8402c', stripe: '#f1ead8', roundel: '#f1ead8' },
  { name: 'Lagoon', body: '#2c5d7c', stripe: '#f1ead8', roundel: '#f1ead8' },
  { name: 'Mustard', body: '#d9a53a', stripe: '#1d1a14', roundel: '#f1ead8' },
  { name: 'Ivory', body: '#ece4cf', stripe: '#c8402c', roundel: '#ffffff' },
  { name: 'Spruce', body: '#2e5b44', stripe: '#d9a53a', roundel: '#f1ead8' },
  { name: 'Graphite', body: '#4a4a52', stripe: '#d9a53a', roundel: '#f1ead8' },
  { name: 'Coral', body: '#e07a52', stripe: '#1d1a14', roundel: '#f1ead8' },
  { name: 'Plum', body: '#6d3b5e', stripe: '#ece4cf', roundel: '#f1ead8' },
] as const;
export const livery = (i: number) => LIVERIES[((i % LIVERIES.length) + LIVERIES.length) % LIVERIES.length];
