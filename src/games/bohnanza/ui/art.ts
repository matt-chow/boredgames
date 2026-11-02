import type { Bean } from '../rules/cards';

/**
 * Original placeholder artwork: every card is a "crate label", a flat bean
 * silhouette on a solid produce colour. Nothing here is derived from the
 * published game's illustrations. To use licensed art instead, list image
 * files in `ASSET_OVERRIDES` (see docs/ASSETS.md); rules and networking are
 * untouched by this file.
 */

export interface BeanArt {
  /** Card ground. */
  bg: string;
  /** Silhouette fill. */
  fg: string;
  /** Detail strokes / marks. */
  mark: string;
  /** Text colour on the ground (contrast ≥ 4.5:1 against bg). */
  ink: string;
  /** Inner SVG for a 100×100 viewBox. */
  svg: string;
}

const kidney = 'M27 33C40 13 79 18 77 49c-2 22-24 25-31 15-5-7-13-1-20-4-12-6-9-19 1-27Z';

export const ART: Record<Bean, BeanArt> = {
  blue: {
    bg: '#2c5590',
    fg: '#a9c8f0',
    mark: '#e6f0fc',
    ink: '#f2f6fc',
    svg: `<path d="${kidney}" fill="var(--fg)"/><path d="M40 30c10-6 24-3 28 8" stroke="var(--mark)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`,
  },
  chili: {
    bg: '#a8352a',
    fg: '#ffcf9e',
    mark: '#5d1a13',
    ink: '#fff3ea',
    svg: `<path d="M26 26c6 22 18 42 52 52-12-2-36-6-48-22-8-11-10-22-4-30Z" fill="var(--fg)"/><path d="M24 27c-2-6 2-12 8-13" stroke="#7fae55" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  },
  stink: {
    bg: '#5f5c27',
    fg: '#d9d49a',
    mark: '#f0edc8',
    ink: '#f7f5df',
    svg: `<path d="M28 46c10-14 44-14 50 6 4 14-12 22-24 16-7-4-12 2-20-1-10-4-12-12-6-21Z" fill="var(--fg)"/><path d="M34 34c-4-5 4-8 0-13M50 30c-4-5 4-8 0-13M66 34c-4-5 4-8 0-13" stroke="var(--mark)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  },
  green: {
    bg: '#356b33',
    fg: '#bfe48f',
    mark: '#356b33',
    ink: '#f1f9e8',
    svg: `<path d="M14 74C30 46 58 24 88 18c-6 18-30 50-70 62Z" fill="var(--fg)"/><path d="M26 66c18-14 34-30 52-40" stroke="var(--mark)" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>`,
  },
  soy: {
    bg: '#9c7a33',
    fg: '#f7e7bb',
    mark: '#9c7a33',
    ink: '#fff8e6',
    svg: `<path d="M18 62c0-10 8-14 16-12 2-10 12-14 20-9 4-8 16-10 22-2 8 0 12 10 6 16-6 8-20 10-36 12-14 2-28 4-28-5Z" fill="var(--fg)"/><circle cx="34" cy="60" r="5" fill="var(--mark)" opacity=".35"/><circle cx="52" cy="56" r="5" fill="var(--mark)" opacity=".35"/><circle cx="70" cy="54" r="5" fill="var(--mark)" opacity=".35"/>`,
  },
  blackeyed: {
    bg: '#d9d0bd',
    fg: '#f8f4ea',
    mark: '#1b1712',
    ink: '#221b13',
    svg: `<path d="${kidney}" fill="var(--fg)" stroke="#b5a98f" stroke-width="2"/><ellipse cx="50" cy="56" rx="11" ry="7" fill="var(--mark)" transform="rotate(-18 50 56)"/>`,
  },
  red: {
    bg: '#82202e',
    fg: '#ef8592',
    mark: '#ffd4da',
    ink: '#fff0f2',
    svg: `<path d="${kidney}" fill="var(--fg)" transform="rotate(14 50 50)"/><path d="M46 33c8-3 18 0 21 7" stroke="var(--mark)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`,
  },
  garden: {
    bg: '#4f8270',
    fg: '#d6ece1',
    mark: '#4f8270',
    ink: '#f1faf5',
    svg: `<circle cx="38" cy="54" r="17" fill="var(--fg)"/><circle cx="64" cy="44" r="14" fill="var(--fg)"/><path d="M58 18c6 4 8 12 6 18" stroke="#2e5546" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  },
  coffee: {
    bg: '#4f3322',
    fg: '#b98863',
    mark: '#2a1a10',
    ink: '#f6ece3',
    svg: `<ellipse cx="50" cy="50" rx="24" ry="32" transform="rotate(30 50 50)" fill="var(--fg)"/><path d="M38 30c14 10 10 30 24 40" stroke="var(--mark)" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  },
  wax: {
    bg: '#a77a2c',
    fg: '#f6e3a4',
    mark: '#a77a2c',
    ink: '#fff8e3',
    svg: `<path d="M20 70C28 44 54 22 84 22c-4 22-28 48-64 48Z" fill="var(--fg)"/><circle cx="74" cy="62" r="8" fill="var(--fg)"/><path d="M74 48v6" stroke="var(--fg)" stroke-width="4" stroke-linecap="round"/>`,
  },
  cocoa: {
    bg: '#432a24',
    fg: '#b57a52',
    mark: '#6e4330',
    ink: '#f6e9e2',
    svg: `<ellipse cx="50" cy="52" rx="20" ry="34" transform="rotate(-24 50 52)" fill="var(--fg)"/><path d="M36 26c-2 18 4 40 22 54M50 22c-2 20 6 40 18 50" stroke="var(--mark)" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  field: {
    bg: '#6c5d36',
    fg: '#e2d3a5',
    mark: '#a7c96b',
    ink: '#fbf6e8',
    svg: `<path d="${kidney}" fill="var(--fg)" transform="translate(4 18) scale(.8)"/><path d="M50 50V22" stroke="var(--mark)" stroke-width="4" stroke-linecap="round"/><path d="M50 30c-10-10-22-6-22-6s4 12 22 8M50 26c8-12 22-10 22-10s-4 14-22 12" fill="var(--mark)"/>`,
  },
  magpie: {
    bg: '#1c2430',
    fg: '#f1f3f6',
    mark: '#0b0f15',
    ink: '#f1f3f6',
    svg: `<path d="M18 74l22-16" stroke="var(--fg)" stroke-width="7" stroke-linecap="round"/><ellipse cx="54" cy="50" rx="22" ry="13" transform="rotate(-20 54 50)" fill="var(--mark)" stroke="var(--fg)" stroke-width="2"/><ellipse cx="55" cy="54" rx="11" ry="6" transform="rotate(-20 55 54)" fill="var(--fg)"/><circle cx="76" cy="36" r="9" fill="var(--mark)" stroke="var(--fg)" stroke-width="2"/><path d="M84 34l9 1-8 4" fill="var(--fg)"/><circle cx="78" cy="34" r="1.8" fill="var(--fg)"/>`,
  },
};

/**
 * Optional licensed artwork. Map a bean to an image path under /assets/ to
 * replace its placeholder (e.g. `blue: '/assets/beans/blue.webp'`). Images
 * must be self-hosted; see docs/ASSETS.md for licensing requirements.
 */
export const ASSET_OVERRIDES: Partial<Record<Bean, string>> = {};
