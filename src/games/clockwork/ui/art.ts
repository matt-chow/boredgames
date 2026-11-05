/**
 * Kingdom & Commerce's card illustrations: original flat SVG scenes of places, people and work, built from a small kit
 * so that every card shares one look. Static strings from this file only, so rendering them as markup is safe. No
 * gradients or ids, since one card can be on screen many times. See docs/CLOCKWORK.md for replacing them with paintings.
 */

/** Finished images, by card key (docs/ART_BIBLE.md). A card listed here shows the image instead of its scene. */
const IMAGES: Record<string, string> = {
  dynamo: '/cards/dynamo.svg',
  monument: '/cards/monument.svg',
  night_watch: '/cards/night_watch.svg',
  relay_junction: '/cards/relay_junction.svg',
  royal_confessor: '/cards/royal_confessor.svg',
};
export const artImages = () => IMAGES;

const BURGUNDY = '#783547';
const WINE = '#54263a';
const GOLD = '#c9a263';
const IVORY = '#f5e9d6';
const CHARCOAL = '#261d23';
const SLATE = '#4f6272';
const MOSS = '#69794f';
const TERRA = '#a8674a';
const STONE = '#a89a88';
const STONE_DARK = '#7f7367';
const WOOD = '#6a4a35';
const WOOD_DARK = '#46301f';
const ROOF = '#8d4a5c';
const WATER = '#6f8c9a';
const SKINS = ['#e0bd98', '#b98a63', '#8a5f42'];

/** Colours a scene can ask for, by letter. */
const INKS: Record<string, string> = { b: BURGUNDY, w: WINE, g: GOLD, i: IVORY, c: CHARCOAL, s: SLATE, m: MOSS, t: TERRA, o: STONE, d: WOOD };

const SKIES: Record<string, { top: string; low: string; ground: string }> = {
  dawn: { top: '#e9cfae', low: '#f3e3cb', ground: '#9a8a6c' },
  day: { top: '#bcd0d2', low: '#e4e3d0', ground: '#8f9a6c' },
  dusk: { top: '#6d4a5e', low: '#d6a57e', ground: '#5b4a42' },
  night: { top: '#1f2235', low: '#39395a', ground: '#2a2630' },
  street: { top: '#d9d2c0', low: '#ece3cf', ground: '#a7957c' },
  hall: { top: '#92867a', low: '#a59889', ground: '#6e5f50' },
  study: { top: '#6e5240', low: '#7f6049', ground: '#47311f' },
  court: { top: '#5c2a3b', low: '#6d3346', ground: '#3b2a2a' },
  parchment: { top: '#ead9b9', low: '#f1e4c9', ground: '#c9b48c' },
};

const body = (a: string) => `<path d="M-4.4 0L-3.5-11C-3.3-13-1.8-13.6 0-13.6S3.3-13 3.5-11L4.4 0Z" fill="${a}"/>`;
const head = (skin: string) => `<circle cy="-16" r="2.7" fill="${skin}"/>`;
const hair = (c = WOOD_DARK) => `<path d="M-2.8-16.2C-3-20 3-20 2.8-16.2C1-17.8-1-17.8-2.8-16.2Z" fill="${c}"/>`;
const arm = (a: string, skin: string, x: number, y: number) => `<path d="M2.6-11.4L${x} ${y}" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x + 0.4}" cy="${y}" r="1.2" fill="${skin}"/>`;
const coinAt = (x: number, y: number, r = 1.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD}"/>`;
const arch = (x: number, y: number, w: number, h: number, c: string) => `<path d="M${x - w / 2} ${y}V${y - h + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y - h + w / 2}V${y}Z" fill="${c}"/>`;
const battlement = (x: number, y: number, w: number, c: string) => {
  let d = '';
  for (let i = 0; i * 3 < w; i += 2) d += `M${x + i * 3} ${y}v-2.6h3v2.6Z`;
  return `<path d="${d}" fill="${c}"/>`;
};

/**
 * Each part stands on 0,0, so a scene places it by where it meets the ground. A person is about 20 units tall at size
 * 1. `a` is the colour the scene chose, or the part's own; `skin` varies with where the figure stands.
 */
const PARTS: Record<string, (a: string, skin: string) => string> = {
  // People: activity and dress, never faces.
  person: (a, s) => body(a) + head(s) + hair(),
  hooded: (a, s) => body(a) + head(s) + `<path d="M-3.6-14C-4.6-20 4.6-20 3.6-14C2-17.6-2-17.6-3.6-14Z" fill="${a}"/>`,
  noble: (a, s) => `<path d="M-6 0L-4-12C-3-14 3-14 4-12L6 0Z" fill="${a}"/><path d="M-1 0V-13H1V0Z" fill="${IVORY}"/><path d="M-3.8-12.4C-2-14 2-14 3.8-12.4" stroke="${GOLD}" stroke-width="1.2" fill="none"/>` + head(s) + hair() + `<path d="M-2.8-18.2L-2.2-20L-1-18.8L0-20.6L1-18.8L2.2-20L2.8-18.2Z" fill="${GOLD}"/>`,
  lady: (a, s) => `<path d="M-6 0C-4-6-3.4-9-3-11C-2.8-13-1.6-13.6 0-13.6S2.8-13 3-11C3.4-9 4-6 6 0Z" fill="${a}"/>` + head(s) + `<path d="M-2.6-17.4L3.4-24L3-17.6Z" fill="${IVORY}"/>`,
  merchant: (a, s) => body(a) + `<path d="M-3.9-7H3.9" stroke="${WOOD_DARK}" stroke-width="1"/>` + head(s) + `<path d="M-4.4-17.4H4.4L2.8-20.4H-2.8Z" fill="${CHARCOAL}"/>` + arm(a, s, 8, -8) + coinAt(9.4, -8),
  worker: (a, s) => `<path d="M-3-5V0H-1V-5ZM1-5V0H3V-5Z" fill="${WOOD_DARK}"/><path d="M-3.8-4L-3.4-11C-3.3-13-1.8-13.6 0-13.6S3.3-13 3.4-11L3.8-4Z" fill="${a}"/>` + head(s) + `<path d="M-3-16.4C-3-19.6 3-19.6 3-16.4Z" fill="${TERRA}"/>` + arm(a, s, 7, -9),
  guard: (a, s) => `<path d="M7-24V0" stroke="${WOOD_DARK}" stroke-width="1"/><path d="M7-27L8.6-23.6H5.4Z" fill="${STONE}"/>` + body(a) + `<path d="M-3-13H3L3.4-6H-3.4Z" fill="${STONE}"/>` + head(s) + `<path d="M-3-16C-3-20.4 3-20.4 3-16Z" fill="${STONE_DARK}"/>` + arm(a, s, 6.6, -11),
  carrier: (a, s) => `<path d="M-3-5V0H-1V-5ZM1-5V0H3V-5Z" fill="${WOOD_DARK}"/><path d="M-3.8-4L-3.4-11C-3.3-13-1.8-13.6 0-13.6S3.3-13 3.4-11L3.8-4Z" fill="${a}"/><path d="M-8-11C-10-17-3-20-1-15L-2-9C-4-7-7-8-8-11Z" fill="${STONE}"/>` + head(s) + hair(),
  crier: (a, s) => body(a) + head(s) + `<path d="M-3-17.4H3L2-19.8H-2Z" fill="${BURGUNDY}"/><path d="M2.6-11.4L8-18" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/><path d="M6-19.5H11L10-23C9.4-24.5 7.6-24.5 7-23Z" fill="${GOLD}"/>`,
  kneeler: (a, s) => `<path d="M-6 0C-6-4-4-9-1-9.6C2-10 3-7 3-4L7-3V0Z" fill="${a}"/><circle cx="0" cy="-12.2" r="2.6" fill="${s}"/><path d="M2-7.8L7-9.4" stroke="${a}" stroke-width="2" stroke-linecap="round"/><path d="M7-11.4h3.6v3.4H7Z" fill="${IVORY}"/>`,
  scribe: (a, s) => `<path d="M-6 0V-8H-1V0Z" fill="${WOOD_DARK}"/><path d="M-5-8L-4-13C-3.6-15 0-15 .6-13L1-8Z" fill="${a}"/><circle cx="-1.6" cy="-17" r="2.6" fill="${s}"/><path d="M-4.4-18C-4-20.6 1-20.6 1-17.8C-1-18.8-3-18.8-4.4-18Z" fill="${WOOD_DARK}"/><path d="M0-12L6-9.6" stroke="${a}" stroke-width="2" stroke-linecap="round"/><path d="M1-8.4H13V0H11V-7H3V0H1Z" fill="${WOOD}"/><path d="M3-9.2H10V-8.4H3Z" fill="${IVORY}"/><path d="M6.4-9.6L9.4-14" stroke="${IVORY}" stroke-width=".7"/>`,
  rider: (a, s) => `<path d="M-11-7C-11-11-6-12-1-12H5L9-17L12-16L11-11L8-8V0H6V-6H-6L-8 0H-10L-9.6-6Z" fill="${WOOD}"/><path d="M-11-9C-14-9-14-5-13.4-3" stroke="${WOOD_DARK}" stroke-width="1.2" fill="none"/><path d="M-4-11C-4-17-3-19-1-19S2-17 2-11Z" fill="${a}"/><circle cx="-1" cy="-21.6" r="2.4" fill="${s}"/><path d="M-5-13H3V-9H-5Z" fill="${a}"/>`,
  // Buildings
  house: (a) => `<path d="M-8 0V-12H8V0Z" fill="${IVORY}"/><path d="M-10-12L0-21L10-12Z" fill="${a}"/><path d="M-8-8H8M-3-12V0M3-12V0" stroke="${WOOD}" stroke-width=".8"/>` + arch(0, 0, 4.4, 6.6, CHARCOAL),
  shop: (a) => `<path d="M-9 0V-14H9V0Z" fill="${IVORY}"/><path d="M-11-14L0-23L11-14Z" fill="${ROOF}"/><path d="M-11-7L-9-11H9L11-7Z" fill="${a}"/>` + arch(-4.4, 0, 4, 6, CHARCOAL) + `<path d="M1-5.6H8V0H1Z" fill="${WOOD}"/>` + coinAt(3, -6.6, 1.1) + coinAt(6, -6.6, 1.1),
  hall: (a) => `<path d="M-17 0V-17H17V0Z" fill="${STONE}"/><path d="M-19-17L0-28L19-17Z" fill="${a}"/>` + arch(0, 0, 7, 10, CHARCOAL) + arch(-10.4, -5, 3.6, 8, CHARCOAL) + arch(10.4, -5, 3.6, 8, CHARCOAL) + `<circle cy="-20.6" r="2.4" fill="${GOLD}"/>`,
  manor: (a) => `<path d="M-20 0V-12H20V0Z" fill="${IVORY}"/><path d="M-22-12L-16-20H16L22-12Z" fill="${a}"/><path d="M-6 0V-20H6V0Z" fill="${STONE}"/><path d="M-8-20L0-29L8-20Z" fill="${a}"/>` + arch(0, 0, 5, 8, CHARCOAL) + arch(-13, -4, 3, 5, CHARCOAL) + arch(13, -4, 3, 5, CHARCOAL),
  castle: (a) => `<path d="M-18 0V-15H18V0Z" fill="${a}"/>` + battlement(-18, -15, 36, a) + `<path d="M-23 0V-23H-14V0ZM14 0V-23H23V0ZM-4-15V-30H4V-15Z" fill="${a}"/>` + battlement(-23, -23, 9, a) + battlement(14, -23, 9, a) + battlement(-4, -30, 8, a) + arch(0, 0, 8, 11, CHARCOAL) + `<path d="M0-30V-37L5-35L0-33" fill="${BURGUNDY}"/>`,
  tower: (a) => `<path d="M-5.6 0V-30H5.6V0Z" fill="${a}"/>` + battlement(-5.6, -30, 11.2, a) + arch(0, 0, 4, 6.4, CHARCOAL) + arch(0, -19, 3.4, 6, CHARCOAL),
  belfry: (a) => `<path d="M-6 0V-30H6V0Z" fill="${a}"/><path d="M-7.6-30L0-40L7.6-30Z" fill="${ROOF}"/>` + arch(0, -21, 7, 8.6, CHARCOAL) + `<path d="M-2.6-22C-2.6-26 2.6-26 2.6-22L3.4-20.8H-3.4Z" fill="${GOLD}"/>` + arch(0, 0, 4, 6.4, CHARCOAL),
  abbey: (a) => `<path d="M-24 0V-16H6V0Z" fill="${a}"/><path d="M-26-16L-20-24H10L6-16Z" fill="${ROOF}"/><path d="M6 0V-28H18V0Z" fill="${a}"/><path d="M4.6-28L12-42L19.4-28Z" fill="${ROOF}"/><circle cx="12" cy="-20" r="3.4" fill="${GOLD}"/>` + arch(12, 0, 5, 9, CHARCOAL) + arch(-18, -4, 3, 7.6, CHARCOAL) + arch(-11, -4, 3, 7.6, CHARCOAL) + arch(-4, -4, 3, 7.6, CHARCOAL),
  gate: (a) => `<path d="M-22 0V-26H-9V0ZM9 0V-26H22V0ZM-9 0V-20H9V0Z" fill="${a}"/>` + battlement(-22, -26, 13, a) + battlement(9, -26, 13, a) + battlement(-9, -20, 18, a) + arch(0, 0, 13, 15, CHARCOAL) + `<path d="M-6-9H6M-6-5H6M-3-14V-1M0-15V-1M3-14V-1" stroke="${STONE_DARK}" stroke-width=".7"/>`,
  walls: (a) => `<path d="M-60 0V-13H60V0Z" fill="${a}"/>` + battlement(-60, -13, 120, a) + `<path d="M-36 0V-21H-25V0ZM25 0V-21H36V0Z" fill="${a}"/>` + battlement(-36, -21, 11, a) + battlement(25, -21, 11, a) + arch(0, 0, 8, 9, CHARCOAL),
  bridge: (a) => `<path d="M-40 0V-8C-28-14 28-14 40-8V0H31C31-9 17-9 17 0H6C6-9-6-9-6 0H-17C-17-9-31-9-31 0Z" fill="${a}"/>`,
  conduit: (a) => `<path d="M-60-18H60V-23H-60ZM-60-18V0H-52C-52-12-36-12-36 0H-28C-28-12-12-12-12 0H-4C-4-12 12-12 12 0H20C20-12 36-12 36 0H44C44-12 60-12 60 0Z" fill="${a}"/><path d="M-60-23H60" stroke="${WATER}" stroke-width="1.4"/>`,
  mill: (a) => `<path d="M-4 0V-16H16V0Z" fill="${IVORY}"/><path d="M-6-16L6-25L18-16Z" fill="${a}"/>` + arch(9, 0, 4.4, 7, CHARCOAL) + `<circle cx="-8" cy="-7" r="8" fill="none" stroke="${WOOD_DARK}" stroke-width="1.6"/><path d="M-16-7H0M-8-15V1M-13.6-12.6L-2.4-1.4M-2.4-12.6L-13.6-1.4" stroke="${WOOD}" stroke-width="1.1"/>`,
  barn: (a) => `<path d="M-15 0V-13H15V0Z" fill="${WOOD}"/><path d="M-17-13L-9-23H9L17-13Z" fill="${a}"/>` + arch(0, 0, 9, 11, WOOD_DARK) + `<path d="M-12-13V0M12-13V0" stroke="${WOOD_DARK}" stroke-width=".8"/>`,
  kiln: (a) => `<path d="M-10 0L-7-17H7L10 0Z" fill="${a}"/>` + arch(0, 0, 7, 8, CHARCOAL) + `<path d="M-2.4 0C-3-3 0-4-.4-7C2-5 3-3 2.4 0Z" fill="${GOLD}"/><g fill="${STONE}" opacity=".6"><circle cy="-21" r="2.6"/><circle cx="3" cy="-25" r="3.2"/><circle cx="-1" cy="-30" r="2.4"/></g>`,
  tollhouse: (a) => `<path d="M-6 0V-13H6V0Z" fill="${IVORY}"/><path d="M-8-13L0-20L8-13Z" fill="${a}"/>` + arch(0, 0, 4, 6, CHARCOAL) + `<path d="M8 0V-10H10V0Z" fill="${WOOD_DARK}"/><path d="M9-8L34-11" stroke="${TERRA}" stroke-width="1.8"/>`,
  stall: (a) => `<path d="M-13 0V-17M13 0V-17" stroke="${WOOD_DARK}" stroke-width="1.4"/><path d="M-13-7H13V0H-13Z" fill="${WOOD}"/><path d="M-16-14L-12-20H12L16-14Z" fill="${a}"/><path d="M-8-20L-9.6-14H-5.4L-4-20ZM0-20V-14H4L4-20ZM8-20L9.6-14H13.6L12-20Z" fill="${IVORY}"/>` + coinAt(-7, -8.4, 1.7) + coinAt(-3.4, -8.4, 1.7) + `<path d="M2-11H10V-7H2Z" fill="${TERRA}"/>`,
  ship: (a) => `<path d="M-16-6H16C14 0 10 1 8 1H-9C-12 1-14-1-16-6Z" fill="${WOOD}"/><path d="M0-6V-28" stroke="${WOOD_DARK}" stroke-width="1.2"/><path d="M0-27C9-23 10-14 0-9Z" fill="${a}"/><path d="M0-27C-5-23-6-14 0-9Z" fill="${IVORY}"/>`,
  crane: (a) => `<path d="M-6 0L-2-26L2-26L6 0Z" fill="${WOOD}"/><path d="M-2-24L22-30" stroke="${WOOD_DARK}" stroke-width="2"/><path d="M21-30V-14" stroke="${CHARCOAL}" stroke-width=".7"/><circle cy="-8" r="7.6" fill="none" stroke="${a}" stroke-width="1.6"/><path d="M-7.6-8H7.6M0-15.6V-.4" stroke="${a}" stroke-width=".9"/><path d="M17-14H25V-8H17Z" fill="${STONE}"/>`,
  // Land and water
  hill: (a) => `<path d="M-60 0C-34-16-12-18 6-11S42-14 60-6V0Z" fill="${a}"/>`,
  field: (a) => `<path d="M-60 0V-7H60V0Z" fill="${a}"/><path d="M-50 0L-40-7M-34 0L-26-7M-16 0L-12-7M2 0V-7M20 0L16-7M36 0L28-7M52 0L42-7" stroke="${WOOD}" stroke-width=".8"/>`,
  sheaves: (a) => `<path d="M-3 0L-1-9H1L3 0Z" fill="${a}"/><path d="M-2-9L-3.6-13M0-9V-14M2-9L3.6-13M-2.4-4H2.4" stroke="${a}" stroke-width="1"/>`,
  river: (a) => `<path d="M-60 0V-8H60V0Z" fill="${a}"/><path d="M-44-5H-30M-14-3H4M20-6H36M-30-2H-20" stroke="${IVORY}" stroke-width=".7" opacity=".6"/>`,
  road: (a) => `<path d="M-16 0L-3-13H3L16 0Z" fill="${a}"/>`,
  tree: (a) => `<path d="M-1 0V-9H1V0Z" fill="${WOOD_DARK}"/><circle cy="-13" r="6.4" fill="${a}"/><circle cx="-3.4" cy="-10" r="4" fill="${a}"/><circle cx="3.6" cy="-10" r="4" fill="${a}"/>`,
  hedge: (a) => `<path d="M-14 0V-5C-14-8-10-8-9-6C-7-9-3-9-2-6C0-9 4-9 5-6C7-9 12-8 14-5V0Z" fill="${a}"/><g fill="${IVORY}"><circle cx="-8" cy="-4" r=".8"/><circle cx="0" cy="-3" r=".8"/><circle cx="8" cy="-4" r=".8"/></g>`,
  sun: (a) => `<circle cy="-5" r="6.6" fill="${a}"/>`,
  moon: (a) => `<path d="M2-11A6 6 0 1 0 2 1A4.8 4.8 0 1 1 2-11Z" fill="${a}"/>`,
  stars: (a) => `<g fill="${a}"><circle cx="-34" cy="-6" r=".5"/><circle cx="-16" cy="-12" r=".6"/><circle cx="-4" cy="-4" r=".4"/><circle cx="12" cy="-10" r=".6"/><circle cx="28" cy="-5" r=".5"/><circle cx="38" cy="-13" r=".4"/></g>`,
  // Rooms
  windows: (a) => [-36, -12, 12, 36].map((x) => arch(x, 0, 11, 24, a)).join(''),
  pillars: (a) => `<path d="M-44 0V-44H-38V0ZM38 0V-44H44V0Z" fill="${a}"/>`,
  drape: (a) => `<path d="M-13-30H13V-24C8-20 4-26 0-22C-4-26-8-20-13-24Z" fill="${a}"/><path d="M-13-24V0H-9V-22ZM13-24V0H9V-22Z" fill="${a}"/>`,
  banner: (a) => `<path d="M-5-28H5V-8L0-11L-5-8Z" fill="${a}"/><path d="M-6-28H6" stroke="${GOLD}" stroke-width="1"/><circle cy="-20" r="2.2" fill="${GOLD}"/>`,
  throne: (a) => `<path d="M-7 0V-26L0-30L7-26V0H5V-8H-5V0Z" fill="${a}"/><path d="M-5-9H5V-7H-5Z" fill="${GOLD}"/>`,
  shelf: (a) => `<path d="M-14 0V-30H14V0Z" fill="${a}"/><path d="M-14-20H14M-14-10H14" stroke="${WOOD_DARK}" stroke-width="1"/><g fill="${IVORY}"><rect x="-12" y="-27" width="5" height="7" rx="1.4"/><rect x="-6" y="-26" width="4" height="6" rx="1.4"/><rect x="2" y="-27" width="5" height="7" rx="1.4"/><rect x="8" y="-25" width="4" height="5" rx="1.4"/><rect x="-11" y="-17" width="4" height="7" rx="1.4"/><rect x="-4" y="-16" width="6" height="6" rx="1.4"/><rect x="6" y="-17" width="5" height="7" rx="1.4"/><rect x="-12" y="-7" width="6" height="7" rx="1.4"/><rect x="1" y="-6" width="5" height="6" rx="1.4"/></g>`,
  hearth: (a) => `<path d="M-13 0V-24H13V0H7V-12H-7V0Z" fill="${a}"/><path d="M-5 0C-6-5-1-6-2-10C2-8 5-4 4 0Z" fill="${GOLD}"/><path d="M-15-24H15V-21H-15Z" fill="${WOOD_DARK}"/>`,
  // Goods
  table: (a) => `<path d="M-16-9H16V-7H-16ZM-13-7H-11V0H-13ZM11-7H13V0H11Z" fill="${a}"/>`,
  coins: () => `<g fill="${GOLD}" stroke="${WOOD_DARK}" stroke-width=".4"><circle cx="-4" cy="-1.8" r="2.2"/><circle cx="0" cy="-1.8" r="2.2"/><circle cx="4" cy="-1.8" r="2.2"/><circle cx="-2" cy="-4.4" r="2.2"/><circle cx="2" cy="-4.4" r="2.2"/><circle cy="-7" r="2.2"/></g>`,
  coin: () => `<g stroke="${WOOD_DARK}" stroke-width=".5"><circle cy="-8" r="8" fill="${GOLD}"/><circle cy="-8" r="5.6" fill="none"/></g><path d="M0-12V-4M-3-8H3" stroke="${WOOD_DARK}" stroke-width="1"/>`,
  clipped: () => `<path d="M-8-6C-8-11-4-15 1-14.6L3-12.4L6.4-12L8-8C8-3 4-1 -1-1.4L-3-3.6L-6.6-4Z" fill="${GOLD}" stroke="${WOOD_DARK}" stroke-width=".5"/><path d="M0-11V-4M-2.6-8H2.6" stroke="${WOOD_DARK}" stroke-width=".9"/>`,
  chest: (a) => `<path d="M-9 0V-8H9V0Z" fill="${a}"/><path d="M-9-8C-9-13 9-13 9-8Z" fill="${WOOD_DARK}"/><path d="M-9-8H9M-5 0V-11.4M5 0V-11.4" stroke="${GOLD}" stroke-width=".9"/><rect x="-1.4" y="-9.4" width="2.8" height="3" fill="${GOLD}"/>`,
  scales: (a) => `<path d="M0 0V-20M-10-18H10" stroke="${a}" stroke-width="1.2"/><path d="M-10-18L-13.4-10H-6.6ZM10-18L6.6-10H13.4Z" fill="${a}"/><path d="M-5 0H5" stroke="${a}" stroke-width="1.6"/>` + coinAt(-10, -11.4, 1.5),
  scroll: (a) => `<path d="M-8-13H8V-2H-8Z" fill="${a}"/><path d="M-5-10H5M-5-7.4H5M-5-4.8H1" stroke="${WOOD}" stroke-width=".6"/><path d="M-9.4-14H-7V-1H-9.4ZM7-14H9.4V-1H7Z" fill="${WOOD}"/><circle cx="4" cy="-3.6" r="1.6" fill="${BURGUNDY}"/>`,
  ledger: (a) => `<path d="M-9-11H9V0H-9Z" fill="${a}"/><path d="M0-11V0" stroke="${WOOD}" stroke-width=".7"/><path d="M-7-8H-2M-7-5.6H-2M-7-3.2H-2M2-8H7M2-5.6H7" stroke="${WOOD}" stroke-width=".5"/>`,
  sacks: (a) => `<path d="M-11 0C-14-7-9-10-7-10C-5-10 0-7-3 0ZM-1 0C-4-8 2-12 4-12C6-12 12-8 9 0Z" fill="${a}"/><path d="M-9-10L-5-10M2-12L6-12" stroke="${WOOD_DARK}" stroke-width="1"/>`,
  barrel: (a) => `<path d="M-5 0C-7-4-7-8-5-12H5C7-8 7-4 5 0Z" fill="${a}"/><path d="M-6-3H6M-6-9H6" stroke="${WOOD_DARK}" stroke-width=".9"/>`,
  blocks: (a) => `<path d="M-11 0V-5H-1V0ZM0 0V-5H10V0ZM-6-5V-10H4V-5Z" fill="${a}"/><path d="M-11-5H10" stroke="${STONE_DARK}" stroke-width=".5"/>`,
  cart: (a) => `<path d="M-13-10H9L7-4H-11Z" fill="${a}"/><circle cx="-6" cy="-3.6" r="3.6" fill="none" stroke="${WOOD_DARK}" stroke-width="1.2"/><circle cx="3" cy="-3.6" r="3.6" fill="none" stroke="${WOOD_DARK}" stroke-width="1.2"/><path d="M9-8L17-5" stroke="${WOOD_DARK}" stroke-width="1.3"/>`,
  bell: (a) => `<path d="M0-22C-5-22-6-17-6-12C-6-8-8-6-9-5H9C8-6 6-8 6-12C6-17 5-22 0-22Z" fill="${a}"/><circle cy="-3" r="2" fill="${WOOD_DARK}"/><path d="M-11-24H11" stroke="${WOOD_DARK}" stroke-width="1.6"/>`,
  lantern: (a) => `<path d="M0-16V-12" stroke="${CHARCOAL}" stroke-width=".7"/><path d="M-3-12H3L4-3H-4Z" fill="${a}"/><path d="M-4.6-3H4.6M-3-12H3" stroke="${CHARCOAL}" stroke-width="1"/>`,
  keys: (a) => `<circle cx="-5" cy="-7" r="3" fill="none" stroke="${a}" stroke-width="1.4"/><path d="M-2-7H9M6-7V-4M9-7V-4" stroke="${a}" stroke-width="1.4"/>`,
  plans: (a) => `<path d="M-14-9.6L-9-15H14L9-9.6Z" fill="${a}"/><path d="M-5-13H6L3-11H-7ZM-3-13V-11M2-13V-11" fill="none" stroke="${SLATE}" stroke-width=".5"/>`,
  shield: (a) => `<path d="M-7-16H7V-8C7-4 3-1 0 0C-3-1-7-4-7-8Z" fill="${a}"/><path d="M0-16V0M-7-9H7" stroke="${GOLD}" stroke-width="1.2"/>`,
  reliquary: (a) => `<path d="M-6-3H6V-13H-6ZM-8-13L0-20L8-13Z" fill="${a}"/><path d="M-3 0H3L2-3H-2Z" fill="${a}"/><path d="M0-19V-14M-2.4-17H2.4" stroke="${BURGUNDY}" stroke-width="1"/><circle cy="-8" r="2.4" fill="${BURGUNDY}"/>`,
  medal: (a) => `<path d="M-5-23L-1-11H1L-3-23ZM5-23L1-11H-1L3-23Z" fill="${BURGUNDY}"/><circle cy="-7" r="7" fill="${a}"/><path d="M-4-5V-9L-2-7.6L0-10L2-7.6L4-9V-5Z" fill="${WOOD_DARK}"/>`,
  fan: (a) => `<path d="M-13-8C-13-1 13-1 13-8Z" fill="${a}"/><path d="M-13-8H13" stroke="${WOOD_DARK}" stroke-width="1"/><g fill="${GOLD}"><circle cx="-6" cy="-12" r=".7"/><circle cx="-2" cy="-16" r=".7"/><circle cx="2" cy="-14" r=".7"/><circle cx="6" cy="-18" r=".7"/><circle cx="8" cy="-12" r=".7"/><circle cx="-8" cy="-17" r=".7"/></g>`,
  rags: (a) => `<path d="M-10 0C-11-6-5-5-4-7C-2-9 2-9 4-7C6-5 11-6 10 0Z" fill="${a}"/><path d="M-5-2L-1-5M1-2L6-5" stroke="${WOOD_DARK}" stroke-width=".6"/>`,
  brush: (a) => `<path d="M-1-20L1-20L1.6-7H-1.6Z" fill="${WOOD}"/><path d="M-2-7H2L1 -3L-1 -3Z" fill="${a}"/>`,
  petals: (a) => `<g fill="${a}"><circle cx="-14" cy="-6" r=".9"/><circle cx="-6" cy="-14" r=".9"/><circle cx="3" cy="-9" r=".9"/><circle cx="11" cy="-15" r=".9"/><circle cx="15" cy="-5" r=".9"/></g>`,
  ribbon: (a) => `<path d="M-24-12H24" stroke="${a}" stroke-width="1.6"/><path d="M-24-22V0M24-22V0" stroke="${WOOD_DARK}" stroke-width="1.2"/>`,
};

/**
 * One backdrop, then parts as `name x y size`, back to front, each standing on its y. Add a colour letter from INKS for
 * the part's main colour, and `~` to face left. The view is 100 by 56, and the ground starts at y=44.
 */
const SCENES: Record<string, string> = {
  // Basics
  scrap: 'study table 58 50 1.6 d|sacks 46 36 .45 c|coins 68 35 .75|person 22 50 1.1 s',
  cog: 'street shop 18 44 .9 b|chest 62 50 1.05 i|merchant 42 50 .95 c|person 88 50 .9 t~',
  dynamo: 'court windows 50 44 .9 w|chest 62 50 1.25 g|coins 36 48 .8|guard 86 50 1 b~|merchant 16 50 1 c',
  notebook: 'day hill 50 40 1 m|field 44 47 1.1 d|house 72 40 .9 b|worker 26 50 1.05 s|tree 92 44 .7 m',
  blueprint: 'dawn hill 50 40 1 m|manor 54 44 1 b|tree 14 44 1 m|tree 92 44 .9 m|person 26 50 .8 w',
  monument: 'dusk hill 50 42 1.1 m|castle 58 40 1 o|road 50 50 1 t|rider 22 50 1 c|tree 90 46 .8 w',
  rust: 'hall table 62 50 1.5 d|ledger 62 38 .8 i|chest 86 50 .7 c|kneeler 34 50 1.1 s|person 76 45 .7 w',
  // Core: economy and cycling
  gearwright: 'study hearth 82 44 .9 o|table 50 50 1.2 d|blocks 50 39 .55 o|worker 24 50 1.05 t|worker 72 50 .85 s~',
  shift_bell: 'dawn hill 50 40 .9 m|belfry 72 44 .9 o|bell 30 40 .8 g|worker 16 50 .9 t|worker 92 50 .75 m~',
  tally_clerk: 'study shelf 84 44 .8 d|scribe 40 50 1.25 s|ledger 66 50 .5 i|coins 60 40 .5',
  supply_crane: 'day river 50 56 1 s|crane 40 44 1 d|ship 84 50 .75 b|barrel 16 46 .7 d|sacks 62 46 .6 o',
  copper_press: 'study hearth 22 44 .9 o|table 62 50 1.3 d|worker 50 50 1 t|coins 74 39 .65|blocks 62 39 .3 s',
  foreman: 'street hall 72 44 .7 o|plans 34 39 1 i|table 34 50 1 d|noble 16 50 1 b|worker 60 50 .85 t~|blocks 90 48 .7 o',
  paper_fan: 'dawn field 50 46 1 m|barn 84 44 .7 b|person 34 50 1.1 t|fan 54 36 .7 d|sheaves 12 46 1 g',
  conveyor: 'day river 50 56 1 s|hall 40 44 .85 b|ship 86 50 .6 g|barrel 66 47 .7 d|guard 14 50 .85 s',
  sorting_glasses: 'study table 56 50 1.4 d|scales 54 39 .6 g|clipped 74 39 .35|person 22 50 1.05 m|chest 90 50 .6 c',
  springboard: 'dawn road 50 56 2.2 o|hill 50 42 1 m|tree 86 44 .8 m|rider 44 50 1.05 b',
  clockwork_archive: 'study shelf 22 44 1 d|shelf 78 44 1 d|hooded 50 50 1 c|scroll 50 28 .6 i',
  whistle_stop: 'dusk river 50 56 1 s|ship 30 50 .9 b|ship 66 50 .65 g|house 90 46 .7 t|carrier 12 50 .75 d',
  // Core: Influence
  hand_crank: 'court throne 84 50 .9 g|kneeler 38 50 1.2 t|person 16 50 .8 s|person 26 50 .7 m',
  charge_meter: 'court drape 50 50 1 b|lady 50 50 1.15 g|lady 22 50 1 i|person 80 50 .95 s~',
  capacitor_bank: 'court windows 50 44 .9 w|throne 50 50 1.05 g|banner 20 40 .75 g|banner 80 40 .75 g|noble 50 50 .95 b|kneeler 74 50 .6 s',
  steam_diverter: 'hall pillars 50 50 .9 o|chest 32 50 1 w|chest 66 50 1 w|coins 50 50 1|guard 88 50 .9 s~|keys 14 34 .9 g',
  glow_mason: 'study banner 50 36 .7 b|table 50 50 1.9 d|person 24 41 .75 t|person 40 41 .75 m|person 60 41 .75 s|person 76 41 .75 g|barrel 92 50 .6 d',
  overcharge_lab: 'court drape 50 50 1.6 w|table 50 50 1.6 c|noble 50 41 .75 b|hooded 22 41 .75 c|person 78 41 .75 s|scroll 50 41 .55 i',
  // Core: interaction and defence
  signal_tower: 'day hill 50 42 1 m|tower 84 44 .7 o|road 40 56 1.7 o|guard 28 50 1 s|rider 58 48 .7 b',
  city_messenger: 'street house 12 44 .8 t|house 90 44 .8 b|road 50 56 1.8 o|person 50 50 1.1 b|scroll 66 36 .45 i',
  inspection_team: 'street shop 80 44 .9 g|ledger 38 38 .6 i|person 24 50 1 c|person 46 50 1 s|merchant 92 50 .8 t~',
  mutual_aid: 'street hall 74 44 .75 o|person 26 50 1.05 b|sacks 50 50 .7 o|kneeler 44 50 .85 t|person 12 50 .8 m',
  permit_office: 'hall pillars 50 50 .9 o|table 54 50 1.4 d|scribe 34 50 .85 c|scroll 62 39 .6 i|merchant 86 50 .9 t~',
  night_watch: 'night stars 50 16 1 i|moon 84 16 .9 g|house 16 44 .8 w|lantern 64 36 .75 g|guard 50 50 1.1 s',
  // Core: long game
  maintenance_cart: 'day hill 50 42 1 m|tollhouse 26 46 1 b|cart 78 48 .9 d|person 94 50 .7 s~|road 62 56 1.2 o',
  lamplighter: 'study windows 50 44 .7 w|scribe 26 50 1 c|scribe 62 50 1 b|shelf 92 44 .7 d',
  clock_garden: 'day hedge 22 46 1 m|hedge 78 46 1 m|tree 50 44 1.3 m|hooded 28 50 .85 c|hooded 72 50 .85 s~',
  gear_lease: 'street house 14 44 .8 t|stall 56 46 1.5 b|person 90 50 .9 s~|merchant 56 48 .75 g',
  city_blueprint: 'day walls 50 30 .6 o|table 50 50 1.5 d|plans 50 41 1.4 i|person 22 50 1 b|person 80 50 1 s~',
  grand_engine: 'street hall 50 44 1.05 b|merchant 14 50 .8 t|carrier 88 50 .8 s~|sacks 28 46 .5 i',
  // Core: scoring
  civic_scholar: 'study shelf 86 44 .9 d|table 50 50 1.2 d|ledger 50 39 .75 i|hooded 22 50 1.05 w',
  museum_curator: 'court banner 16 42 .7 g|table 58 50 1.2 d|scroll 58 39 .8 i|scribe 34 50 .95 w|shield 90 42 .8 g',
  patron_circle: 'court windows 50 44 .85 w|noble 26 50 1 b|lady 50 50 1 g|noble 74 50 1 s~|coins 92 50 .7',
  silver_statue: 'hall pillars 50 50 .9 o|table 50 50 .9 c|reliquary 50 41 1.1 i|hooded 20 50 .95 c|person 82 50 .95 m~',
  civic_embassy: 'day castle 72 44 .55 o|rider 24 50 .9 w|banner 44 46 .8 g|person 88 50 .9 b~',
  inventors_medal: 'dawn hall 80 44 .55 o|noble 28 50 1.05 b|medal 52 38 .75 g|worker 70 50 .95 t~',
  // Artisans' Row
  spark_coil: 'court table 50 50 1.3 d|sacks 50 39 .6 w|coin 32 39 .25|lady 80 50 .95 b~|person 18 50 .95 s',
  brass_bond: 'study table 50 50 1.4 d|scroll 50 39 .85 i|merchant 16 50 1 b|merchant 84 50 1 s~',
  relay_junction: 'street shop 14 44 .75 t|shop 86 44 .75 b|stall 50 46 .9 g|person 28 50 .9 m|person 70 50 .9 s~|carrier 42 52 .7 d',
  chain_drive: 'street banner 18 42 .65 b|person 16 50 .9 g|person 34 50 .9 b|person 52 50 .9 g|person 70 50 .9 b|banner 72 42 .65 g|hall 96 44 .4 o',
  flywheel: 'dawn field 50 46 1 g|barn 66 44 1.05 b|carrier 28 50 1 t|sheaves 12 46 1 g|sheaves 88 46 1 g',
  timer_switch: 'court throne 88 50 .75 g|noble 72 50 .85 b~|scroll 46 36 .8 i|kneeler 24 50 1 s',
  belt_sorter: 'dawn field 50 46 1 g|person 20 50 1 t|fan 40 42 .5 d|sacks 66 46 .7 o|sacks 86 46 .6 i',
  salvage_hook: 'street house 86 44 .8 t|rags 50 50 1.2 s|rags 24 50 .8 t|hooded 36 50 .95 d',
  millrace: 'hall gate 50 44 .8 o|guard 16 50 .95 s|guard 32 50 .95 b|guard 68 50 .95 s~|guard 84 50 .95 b~',
  slag_furnace: 'dawn hill 50 40 .9 m|kiln 56 46 1.15 o|blocks 22 46 .9 i|worker 84 50 .9 t~',
  spark_exchange: 'court table 50 50 1.3 c|scales 50 39 .55 g|person 18 50 1 m|lady 82 50 1 b~|coins 70 39 .45',
  // Rival Houses
  picket_line: 'street house 14 44 .9 b|house 88 44 .9 t|lady 42 50 1 s|person 60 50 1 m~|person 74 50 .85 g~',
  corrosion_crew: 'street house 88 44 .85 t|cart 58 50 .95 d|coins 58 41 .7|merchant 24 50 1.05 c|guard 40 50 .85 s',
  noise_complaint: 'hall banner 50 38 .7 b|person 20 50 1 t|worker 40 50 1 s|worker 62 50 1 m~|person 82 50 1 g~',
  whistleblower: 'court drape 72 50 1 w|hooded 34 50 1 c|person 60 50 1 b~|scroll 18 30 .4 i',
  ground_wire: 'night abbey 60 44 .75 o|hooded 22 50 1 s|moon 16 16 .7 g|scroll 40 34 .5 i',
  redline_boiler: 'study table 62 50 1.2 c|coins 62 39 .9|merchant 42 50 1.05 w~|person 88 50 1 s~',
  pressure_test: 'hall table 50 50 1.5 d|ledger 44 39 .75 i|chest 72 39 .55 c|noble 18 50 1 b|person 90 50 .9 s~',
  overload_relay: 'day hill 50 42 1 m|road 50 56 1.6 o|banner 40 44 .75 g|rider 56 50 .9 b|rider 84 50 .7 w|person 14 50 .8 s',
  scrapyard_broker: 'street shop 84 44 .8 c|chest 54 50 .9 d|merchant 30 50 1.05 t|person 66 50 .9 s~',
  royal_confessor: 'hall reliquary 74 40 .7 g|hooded 58 50 1.05 c|kneeler 32 50 1.1 s|windows 22 36 .5 w',
  mintmaster: 'study hearth 22 44 1 d|table 58 50 1.3 c|coins 56 37 .7|merchant 78 50 1 g~|carrier 40 50 .85 s',
  estate_surveyor: 'day manor 72 40 .75 b|field 40 46 1.1 d|plans 30 38 .6 i|person 22 50 1.05 t|hedge 60 48 .8 m',
  purification_house: 'dawn hall 66 42 .8 i|hearth 30 46 .8 d|rags 44 46 .6 s|hooded 18 50 .95 c|person 52 50 .85 t',
  salvage_office: 'street stall 58 46 1.2 d|scales 58 34 .5 g|chest 30 50 .7 c|scribe 76 50 .95 b~|person 14 50 .95 s',
  reclamation_guild: 'dusk house 80 42 .9 c|cart 44 48 1.1 d|barrel 66 48 .6 t|worker 22 50 1 s|worker 62 50 .85 b~',
  royal_tax_collector: 'day tollhouse 76 42 .85 b|table 46 50 1.2 d|sacks 40 36 .5 c|coins 56 36 .55|noble 22 50 1.05 g',
  royal_scrivener: 'night shelf 78 34 .8 d|table 44 50 1.4 c|ledger 44 37 .75 i|scribe 18 50 1.05 b|lantern 72 42 .6 g',
  noble_resettlement: 'dawn manor 18 40 .6 c|river 50 48 1 t|hall 80 40 .75 b|cart 44 44 .85 d|noble 60 46 .8 g',
  burden_relief: 'street house 82 42 .85 b|kneeler 36 50 1 s|person 58 50 1 t~|sacks 22 50 .6 d',
  treasury_auditor: 'hall pillars 50 40 .9 w|chest 76 50 .9 g|ledger 42 38 .7 i|table 42 50 1.2 c|scribe 18 50 1 b',
  spice_exchange: 'day river 50 48 1 t|ship 80 40 .7 d|stall 40 46 1.2 o|sacks 62 50 .6 g|merchant 22 50 1 c',
  trade_bonds: 'court table 50 50 1.4 d|scroll 50 37 .65 i|coins 66 37 .5|merchant 24 50 1 g|merchant 78 50 1 c~',
  royal_mint: 'hall banner 50 26 .9 o|table 34 50 1 d|table 70 50 1 d|coins 34 38 .55|coins 70 38 .55|worker 52 50 .9 s',
  port_tariffs: 'dawn river 50 48 1 t|ship 74 40 .85 c|barrel 44 48 .7 d|barrel 54 48 .6 g|scribe 20 50 1 b',
  guild_auction: 'street hall 72 42 .8 d|crier 44 44 1 g|person 20 50 .95 s|person 32 50 .85 t|merchant 62 50 .9 c~',
  kingdom_courier: 'day hill 50 40 1 m|road 50 48 1 t|rider 48 50 1.1 o|scroll 70 34 .45 i|tree 14 44 .8 m',
  hall_of_archives: 'night shelf 30 34 1 d|shelf 70 34 1 c|lantern 50 28 .55 g|scribe 50 50 1 b|scroll 34 46 .45 i',
  great_council: 'hall throne 50 34 .85 o|table 50 50 1.6 d|noble 20 50 .95 g|lady 34 50 .9 c|noble 66 50 .9 b~|lady 82 50 .95 s~',
  edict_of_inspection: 'street stall 66 46 1.1 d|crier 24 46 1 o|scroll 38 34 .45 i|guard 84 50 .95 c~|merchant 52 50 .85 t',
  tax_arrears: 'dusk house 70 42 1 c|guard 36 50 1 b|ledger 22 40 .5 i|person 58 50 .95 s~',
  royal_advocate: 'court shield 72 38 .55 g|scroll 40 34 .5 i|lady 46 50 1.05 o|merchant 72 50 .9 c~|pillars 14 40 .5 w',
  court_saboteur: 'night chest 60 50 1 c|moon 82 18 .7 i|hooded 36 50 1.05 d|scroll 46 40 .4 i|tower 88 40 .55 m',
  noble_council: 'day field 50 46 1.1 d|house 86 40 .55 b|house 12 40 .55 b|noble 50 50 1 g|person 28 50 .9 s|person 70 50 .9 t~',
  common_fields: 'dawn field 50 46 1.2 d|sheaves 30 46 .8 g|sheaves 70 46 .8 g|worker 50 50 1 s|person 86 50 .85 t~',
  merchants_guildhall: 'day hall 50 40 1.05 c|stall 22 48 .75 o|stall 78 48 .75 d|merchant 40 50 .8 g|person 62 50 .8 s',
  // The Chancery
  surveyor: 'day hill 50 42 1 m|road 72 56 1.1 o|worker 30 50 1.05 s|sheaves 50 46 1 d|house 84 42 .7 b',
  zoning_board: 'street hall 76 44 .7 o|table 36 50 1.1 d|scroll 36 39 .65 i|person 14 50 1 b|person 58 50 .9 s~',
  ribbon_cutter: 'dawn gate 50 44 .85 o|ribbon 50 50 .8 b|noble 40 50 1 b|person 12 50 .8 s|person 88 50 .8 m~|petals 50 30 1 g',
  town_crier: 'street house 12 44 .85 b|house 92 44 .85 t|crier 48 50 1.15 b|person 22 50 .75 s|person 74 50 .75 m~',
  civic_bond: 'street belfry 84 44 .75 o|chest 50 50 .9 w|person 24 50 1 t|person 66 50 .85 s~',
  city_charter: 'hall table 50 50 1.3 d|scroll 50 39 1.1 i|noble 18 50 1 b|person 84 50 1 s~',
  patent_ledger: 'study shelf 14 44 .8 d|table 54 50 1.4 d|ledger 54 39 1 i|hooded 86 50 .95 b~',
  plaque_foundry: 'study table 50 50 1.3 d|shield 50 39 1 b|brush 66 35 .8 g|person 24 50 1.05 t|shield 90 44 .6 s',
  // Crown Projects
  canal_lights: 'dawn river 50 56 1 s|ship 72 50 .7 g|house 18 44 .9 t|carrier 44 46 .8 d|barrel 56 46 .55 d',
  public_clock: 'day house 16 44 .75 t|house 84 44 .75 b|belfry 50 44 1.2 o|person 34 50 .6 s',
  makers_fair: 'day stall 24 46 .95 b|stall 74 46 .95 g|banner 50 34 .8 b|person 48 50 .8 t|person 58 50 .7 s~',
  tram_extension: 'dawn hill 50 42 1 m|road 50 56 2.3 o|tree 12 46 .9 m|tree 90 46 .9 m|castle 50 40 .3 o|cart 62 50 .7 d',
  skybridge: 'day river 50 56 1 s|bridge 50 48 1 o|person 40 36 .5 t|rider 62 37 .45 b',
  library_lanterns: 'study windows 50 44 .5 w|shelf 18 44 1 d|shelf 82 44 1 d|lantern 50 20 .9 g|table 50 50 1 d|ledger 50 41 .6 i',
  waterwheel: 'day river 50 56 1 s|mill 50 46 1.25 b|tree 88 46 .9 m',
  city_illumination: 'dusk walls 50 44 1 o|house 22 24 .5 b|belfry 50 26 .4 o|house 76 24 .5 t|guard 50 50 .55 s',
  harbor_beacon: 'night stars 50 18 1 i|tower 38 44 1.1 o|lantern 38 12 .8 g|river 50 56 1 s|ship 76 50 .7 i',
  foundry_gate: 'dusk gate 50 44 1.25 o|guard 22 50 .8 s|guard 78 50 .8 s~',
  power_exchange: 'hall windows 50 44 .85 o|table 50 50 1.6 d|coins 34 39 .7|scales 50 39 .5 c|merchant 18 50 .95 b|merchant 84 50 .95 s~',
  rail_terminus: 'dawn barn 56 44 1.25 b|sacks 24 46 .9 o|carrier 86 50 .9 t~|sheaves 8 46 1 g',
  aqueduct: 'day hill 50 44 .8 m|conduit 50 44 .95 o|worker 26 50 .7 t|worker 74 50 .7 s~',
};

const cache = new Map<string, string>();

function draw(scene: string): string {
  const [first, ...rest] = scene.split('|');
  const [skyName, ...firstPart] = first.split(' ');
  const sky = SKIES[skyName];
  const shapes = [firstPart.join(' '), ...rest]
    .map((p) => {
      const [name, x, y, size, look = ''] = p.split(' ');
      const part = PARTS[name];
      if (!part) return '';
      const flip = look.endsWith('~') ? -1 : 1;
      const skin = SKINS[Math.floor(Number(x) * 7) % SKINS.length];
      return `<g transform="translate(${x} ${y}) scale(${Number(size) * flip} ${size})">${part(INKS[look[0]] ?? STONE, skin)}</g>`;
    })
    .join('');
  return `<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="100" height="56" fill="${sky.top}"/><rect y="24" width="100" height="20" fill="${sky.low}"/><rect y="44" width="100" height="12" fill="${sky.ground}"/>${shapes}</svg>`;
}

/** The illustration for a card or Crown Project as SVG markup, or null when it has none. */
export function artFor(key: string): string | null {
  const known = cache.get(key);
  if (known) return known;
  const image = IMAGES[key];
  const scene = SCENES[key];
  if (!image && !scene) return null;
  const markup = image ? `<img src="${image}" alt="" loading="lazy" />` : draw(scene);
  cache.set(key, markup);
  return markup;
}

export const artKeys = (): string[] => Object.keys(SCENES);
export const artParts = (scene: string): string[] => scene.split('|').map((p, i) => p.split(' ')[i === 0 ? 1 : 0]);
export const sceneOf = (key: string): string | undefined => SCENES[key];
export const knownPart = (name: string): boolean => name in PARTS;
