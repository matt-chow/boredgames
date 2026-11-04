/**
 * Clockwork Commons' card illustrations: original flat SVG scenes, built from a small kit of parts so that every card
 * shares one look. Static strings from this file only, so rendering them as markup is safe. No gradients or ids, since
 * one card can be on screen many times. See docs/CLOCKWORK.md for how to replace them with finished paintings.
 */

/** Finished images, by card key, once they exist. A card listed here shows the image instead of its scene. */
const IMAGES: Record<string, string> = {};

interface Sky {
  top: string;
  low: string;
  ground: string;
  a: string;
  b: string;
  c: string;
}

const BRASS = '#d7a648';
const COPPER = '#c0703f';
const TEAL = '#58c4bd';
const SILVER = '#c4c8cc';
const INK = '#20170f';
const CREAM = '#efe4cc';
const LAMP = '#f5cf72';

const SKIES: Record<string, Sky> = {
  bench: { top: '#4a3020', low: '#6b4529', ground: '#2f1e13', a: BRASS, b: COPPER, c: INK },
  dusk: { top: '#26304f', low: '#8a5a58', ground: '#201a26', a: BRASS, b: LAMP, c: '#141019' },
  night: { top: '#10162b', low: '#1f2a48', ground: '#0b0d18', a: TEAL, b: LAMP, c: '#05060c' },
  lab: { top: '#123238', low: '#1f5354', ground: '#0d2024', a: TEAL, b: BRASS, c: '#061214' },
  paper: { top: '#e6d7b4', low: '#d9c596', ground: '#a98c5c', a: '#5a4228', b: COPPER, c: '#33241a' },
  plan: { top: '#1d3d66', low: '#254b7a', ground: '#16304f', a: '#cfe0ee', b: BRASS, c: '#0e2138' },
  velvet: { top: '#3c1a2c', low: '#55243c', ground: '#28101d', a: BRASS, b: SILVER, c: '#160810' },
  day: { top: '#8db2c2', low: '#c9d3bd', ground: '#5e6b4c', a: COPPER, b: BRASS, c: '#2f2a22' },
  steam: { top: '#5a5f63', low: '#8b8678', ground: '#35332f', a: COPPER, b: CREAM, c: '#1f1d1a' },
  rust: { top: '#3d2219', low: '#7a3f25', ground: '#23130d', a: '#b4623a', b: '#d99a57', c: '#150b07' },
};

const gearPath = (teeth: number) => {
  const points: string[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const r = i % 4 < 2 ? 10 : 7.8;
    const t = ((i - 0.5) / (teeth * 4)) * Math.PI * 2;
    points.push(`${(Math.cos(t) * r).toFixed(1)} ${(Math.sin(t) * r).toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
};
const GEAR = gearPath(9);

/** Each part is drawn around 0,0 at about 20 units wide. `a` is the main colour, `b` the accent, `c` the dark. */
const PARTS: Record<string, (a: string, b: string, c: string) => string> = {
  gear: (a, _b, c) => `<path d="${GEAR}" fill="${a}"/><circle r="3.4" fill="${c}"/>`,
  gear2: (_a, b, c) => `<path d="${GEAR}" fill="${b}"/><circle r="5" fill="${c}"/><circle r="2" fill="${b}"/>`,
  bell: (a, b, c) => `<path d="M0-10C-5-10-6-5-6-1C-6 3-8 5-9 6H9C8 5 6 3 6-1C6-5 5-10 0-10Z" fill="${a}"/><circle cy="8" r="2.2" fill="${b}"/><rect x="-1" y="-12" width="2" height="3" fill="${c}"/>`,
  lamp: (a, b, c) => `<rect x="-.8" y="-2" width="1.6" height="14" fill="${c}"/><path d="M-4-9H4L5-2H-5Z" fill="${b}"/><path d="M-5-9L0-12L5-9Z" fill="${a}"/><rect x="-5" y="-2" width="10" height="1.4" fill="${a}"/>`,
  lantern: (a, b) => `<path d="M0-11V-8" stroke="${a}" stroke-width="1"/><path d="M-4-8H4L6-4V4L4 7H-4L-6 4V-4Z" fill="${b}"/><path d="M-4-8H4M-6 0H6M-4 7H4" stroke="${a}" stroke-width="1.4"/>`,
  tower: (a, b, c) => `<rect x="-5" y="-6" width="10" height="20" fill="${c}"/><path d="M-6-6L0-14L6-6Z" fill="${a}"/><circle cy="-1" r="4" fill="${b}"/><path d="M0-1V-4M0-1H2.4" stroke="${c}" stroke-width=".8"/>`,
  crane: (a, b, c) => `<rect x="-9" y="-10" width="2.6" height="22" fill="${c}"/><path d="M-10-9H11L-7-4Z" fill="${a}"/><path d="M8-9V1" stroke="${c}" stroke-width=".7"/><rect x="4" y="1" width="8" height="6" fill="${b}"/>`,
  crate: (a, b, c) => `<rect x="-7" y="-6" width="14" height="12" fill="${a}"/><path d="M-7-6L7 6M7-6L-7 6" stroke="${c}" stroke-width="1"/><rect x="-7" y="-6" width="14" height="12" fill="none" stroke="${b}" stroke-width="1"/>`,
  bolt: (a) => `<path d="M2-11L-6 1H-1L-3 11L6-3H1Z" fill="${a}"/>`,
  arc: (a, b) => `<path d="M-10 6L-5-3L-1 2L3-6L6-1L10-8" fill="none" stroke="${a}" stroke-width="1.6"/><circle cx="-10" cy="6" r="1.8" fill="${b}"/><circle cx="10" cy="-8" r="1.8" fill="${b}"/>`,
  coil: (a, b, c) => `<rect x="-10" y="-5" width="20" height="10" rx="2" fill="${c}"/><path d="M-8-5V5M-5-5V5M-2-5V5M1-5V5M4-5V5M7-5V5" stroke="${a}" stroke-width="1.6"/><circle cx="11" r="1.8" fill="${b}"/>`,
  dynamo: (a, b, c) => `<circle r="9" fill="${c}"/><circle r="6.5" fill="${a}"/><circle r="3" fill="${b}"/><rect x="-10" y="7" width="20" height="3" fill="${b}"/>`,
  book: (a, b, c) => `<path d="M0-5C-3-8-7-8-10-7V7C-7 6-3 6 0 9C3 6 7 6 10 7V-7C7-8 3-8 0-5Z" fill="${a}"/><path d="M0-5V9" stroke="${c}" stroke-width=".9"/><path d="M-8-3H-3M-8 0H-3M3-3H8M3 0H8" stroke="${b}" stroke-width=".8"/>`,
  ledger: (a, b, c) => `<rect x="-8" y="-10" width="16" height="20" rx="1" fill="${a}"/><path d="M-5-6H5M-5-3H5M-5 0H5M-5 3H2" stroke="${c}" stroke-width=".8"/><circle cx="4" cy="6" r="2.4" fill="${b}"/>`,
  scroll: (a, b, c) => `<rect x="-9" y="-6" width="18" height="12" fill="${a}"/><circle cx="-9" r="2" cy="-6" fill="${b}"/><circle cx="9" r="2" cy="-6" fill="${b}"/><circle cx="-9" r="2" cy="6" fill="${b}"/><circle cx="9" r="2" cy="6" fill="${b}"/><path d="M-5-3H5V3H-5ZM0-3V3" fill="none" stroke="${c}" stroke-width=".7"/>`,
  arch: (a, b, c) => `<path d="M-11 11V-2C-11-14 11-14 11-2V11H5V-2C5-7-5-7-5-2V11Z" fill="${a}"/><circle cy="-8" r="2.6" fill="${b}"/><path d="M-12 11H12" stroke="${c}" stroke-width="1.6"/>`,
  tram: (a, b, c) => `<rect x="-11" y="-6" width="22" height="12" rx="3" fill="${a}"/><path d="M-8-3H-3V1H-8ZM-1-3H4V1H-1ZM6-3H9V1H6Z" fill="${b}"/><circle cx="-6" cy="7" r="2" fill="${c}"/><circle cx="6" cy="7" r="2" fill="${c}"/><path d="M0-6L4-11" stroke="${c}" stroke-width=".8"/>`,
  wheel: (a, b, c) => `<circle r="10" fill="none" stroke="${a}" stroke-width="2.4"/><path d="M-10 0H10M0-10V10M-7-7L7 7M7-7L-7 7" stroke="${a}" stroke-width="1.2"/><circle r="2.4" fill="${b}"/><path d="M-12 8H12V12H-12Z" fill="${c}"/>`,
  bridge: (a, b, c) => `<path d="M-14-2H14V1C7-5-7-5-14 1Z" fill="${a}"/><path d="M-10-2V-7M-5-2V-7M0-2V-7M5-2V-7M10-2V-7" stroke="${c}" stroke-width=".8"/><path d="M-14-7H14" stroke="${b}" stroke-width="1"/>`,
  flag: (a, b, c) => `<rect x="-1" y="-11" width="2" height="23" fill="${c}"/><path d="M1-10H11V-5H1Z" fill="${a}"/><path d="M-1-2L-10-7V-2L-1 3Z" fill="${b}"/>`,
  coin: (a, b, c) => `<circle r="9" fill="${a}"/><circle r="6.8" fill="none" stroke="${c}" stroke-width=".8"/><path d="M0-4L1.2-1.2L4-1L1.8.9L2.6 3.8L0 2.2L-2.6 3.8L-1.8.9L-4-1L-1.2-1.2Z" fill="${b}"/>`,
  glasses: (a, b, c) => `<circle cx="-6" r="5.4" fill="${b}"/><circle cx="6" r="5.4" fill="${b}"/><circle cx="-6" r="5.4" fill="none" stroke="${a}" stroke-width="1.6"/><circle cx="6" r="5.4" fill="none" stroke="${a}" stroke-width="1.6"/><path d="M-1-1H1" stroke="${a}" stroke-width="1.6"/><circle cx="-6" r="1.4" fill="${c}"/><circle cx="6" r="1.4" fill="${c}"/>`,
  person: (a, b, c) => `<circle cy="-7.5" r="3.2" fill="${b}"/><path d="M-5 12V-1C-5-4-3-4.5 0-4.5C3-4.5 5-4 5-1V12Z" fill="${a}"/><path d="M-3.4-9H3.4" stroke="${c}" stroke-width="1"/>`,
  owl: (a, b, c) => `<path d="M-6-8L-4-5H4L6-8V4C6 8 3 10 0 10C-3 10-6 8-6 4Z" fill="${a}"/><circle cx="-2.6" cy="-2" r="2.2" fill="${b}"/><circle cx="2.6" cy="-2" r="2.2" fill="${b}"/><circle cx="-2.6" cy="-2" r=".9" fill="${c}"/><circle cx="2.6" cy="-2" r=".9" fill="${c}"/>`,
  flower: (a, b, c) => `<path d="M0 0V12" stroke="${c}" stroke-width="1.2"/><g fill="${a}"><circle cy="-5" r="3"/><circle cx="4.7" cy="-1.5" r="3"/><circle cx="2.9" cy="4" r="3"/><circle cx="-2.9" cy="4" r="3"/><circle cx="-4.7" cy="-1.5" r="3"/></g><circle r="2.4" fill="${b}"/>`,
  moon: (a) => `<path d="M3-8A8 8 0 1 0 3 8A6.4 6.4 0 1 1 3-8Z" fill="${a}"/>`,
  sun: (_a, b) => `<circle r="7" fill="${b}"/>`,
  city: (_a, b, c) => `<path d="M-30 12V2H-24V-4H-18V3H-13V-8H-8V1H-2V-3H3V-11H8V0H13V-5H19V2H24V-2H30V12Z" fill="${c}"/><path d="M-22-1H-20M-11-5H-10M5-8H6M15-2H17M-6 4H-5M26 2H27" stroke="${b}" stroke-width="1.2"/>`,
  medal: (a, b, c) => `<path d="M-5-12L-1-3H1L-3-12ZM5-12L1-3H-1L3-12Z" fill="${b}"/><circle cy="3" r="8" fill="${a}"/><g transform="translate(0 3) scale(.5)"><path d="${GEAR}" fill="${c}"/></g>`,
  statue: (a, b, c) => `<rect x="-7" y="7" width="14" height="5" fill="${c}"/><circle cy="-8" r="3" fill="${a}"/><path d="M-4 7V-3C-4-5-2-5 0-5C2-5 4-5 4-3V7Z" fill="${a}"/><path d="M4-3L10-7" stroke="${a}" stroke-width="2"/><circle cx="10" cy="-8" r="1.6" fill="${b}"/>`,
  cart: (a, b, c) => `<path d="M-10-4H8L6 4H-8Z" fill="${a}"/><circle cx="-5" cy="7" r="3" fill="${c}"/><circle cx="4" cy="7" r="3" fill="${c}"/><path d="M8-4L13-8" stroke="${b}" stroke-width="1.4"/><path d="M-5-4V-9M1-4L4-9" stroke="${b}" stroke-width="1.4"/>`,
  bike: (a, b, c) => `<circle cx="-7" cy="5" r="5" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="7" cy="5" r="5" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M-7 5L-2-3H5L7 5M-2-3L1 5H-7" fill="none" stroke="${a}" stroke-width="1.2"/><rect x="-7" y="-4" width="5" height="4" fill="${b}"/>`,
  gauge: (a, b, c) => `<circle r="10" fill="${a}"/><circle r="8" fill="${CREAM}"/><path d="M-6 3A6.5 6.5 0 0 1 6 3" fill="none" stroke="${c}" stroke-width="1"/><path d="M0 2L5-5" stroke="${b}" stroke-width="1.4"/><circle cy="2" r="1.4" fill="${c}"/>`,
  fan: (a, b, c) => `<path d="M0 9L-11-3C-7-9 7-9 11-3Z" fill="${a}"/><path d="M0 9L-7-6M0 9L-3-7.5M0 9L1-7.5M0 9L5-6.5M0 9L9-4" stroke="${c}" stroke-width=".6"/><circle cy="9" r="1.6" fill="${b}"/>`,
  desk: (a, _b, c) => `<rect x="-12" y="0" width="24" height="2.4" fill="${a}"/><path d="M-10 2V11M10 2V11" stroke="${c}" stroke-width="2"/>`,
  spring: (a, b) => `<path d="M-6 10L6 7L-6 4L6 1L-6-2L6-5L-6-8" fill="none" stroke="${a}" stroke-width="1.6"/><rect x="-9" y="-11" width="18" height="2.4" fill="${b}"/>`,
  press: (a, b, c) => `<rect x="-9" y="-11" width="18" height="4" fill="${a}"/><rect x="-1.5" y="-7" width="3" height="7" fill="${c}"/><rect x="-7" y="0" width="14" height="3" fill="${a}"/><rect x="-7" y="5" width="14" height="2" fill="${b}"/><rect x="-10" y="7" width="20" height="4" fill="${c}"/>`,
  waves: (a) => `<path d="M-30 0C-25-3-20 3-15 0S-5-3 0 0S10 3 15 0S25-3 30 0M-30 5C-25 2-20 8-15 5S-5 2 0 5S10 8 15 5S25 2 30 5" fill="none" stroke="${a}" stroke-width="1.2"/>`,
  belt: (a, b, c) => `<rect x="-14" y="-3" width="28" height="6" rx="3" fill="${c}"/><g fill="${a}"><circle cx="-10" r="2.2"/><circle cx="-3.4" r="2.2"/><circle cx="3.4" r="2.2"/><circle cx="10" r="2.2"/></g><rect x="-7" y="-8" width="5" height="5" fill="${b}"/><rect x="4" y="-8" width="5" height="5" fill="${b}"/>`,
  drawers: (a, b, c) => `<rect x="-9" y="-11" width="18" height="22" fill="${a}"/><path d="M-9-4H9M-9 3H9M0-11V11" stroke="${c}" stroke-width=".9"/><g fill="${b}"><rect x="-6" y="-8.6" width="3" height="1.6"/><rect x="3" y="-8.6" width="3" height="1.6"/><rect x="-6" y="-1.6" width="3" height="1.6"/><rect x="3" y="-1.6" width="3" height="1.6"/><rect x="-6" y="5.6" width="3" height="1.6"/><rect x="3" y="5.6" width="3" height="1.6"/></g>`,
  jars: (a, b, c) => `<g fill="${a}"><rect x="-12" y="-6" width="6" height="14" rx="1.6"/><rect x="-3" y="-6" width="6" height="14" rx="1.6"/><rect x="6" y="-6" width="6" height="14" rx="1.6"/></g><path d="M-9-6V-10H9V-6M0-10V-6" fill="none" stroke="${b}" stroke-width="1.2"/><path d="M-14 8H14" stroke="${c}" stroke-width="2"/>`,
  caliper: (a, _b, c) => `<rect x="-11" y="-3" width="22" height="2.4" fill="${a}"/><path d="M-9-1V9L-7 5V-1ZM3-1V9L5 5V-1Z" fill="${a}"/><path d="M-6-2H9" stroke="${c}" stroke-width=".5"/>`,
  kiosk: (a, b, c) => `<rect x="-8" y="-4" width="16" height="16" fill="${a}"/><path d="M-11-4L0-12L11-4Z" fill="${b}"/><rect x="-5" y="-1" width="10" height="6" fill="${c}"/><rect x="-9" y="5" width="18" height="1.6" fill="${b}"/>`,
  stamp: (a, b, c) => `<circle cy="-8" r="3" fill="${a}"/><path d="M-1.4-5H1.4L2.4 1H-2.4Z" fill="${a}"/><rect x="-7" y="1" width="14" height="4" fill="${b}"/><rect x="-10" y="7" width="20" height="2" fill="${c}"/>`,
  flame: (a, b) => `<path d="M0-11C5-5 8-2 8 3C8 8 4 10 0 10C-4 10-8 8-8 3C-8-1-5-2-4-6C-3-4-2-3-1-3C-1-6-1-8 0-11Z" fill="${a}"/><path d="M0-2C3 1 4 3 4 5C4 8 2 9 0 9C-2 9-4 8-4 5C-4 3-2 1 0-2Z" fill="${b}"/>`,
  furnace: (a, b, c) => `<path d="M-10 11V-3L-5-11H5L10-3V11Z" fill="${c}"/><path d="M-5 11V3C-5-3 5-3 5 3V11Z" fill="${a}"/><path d="M-3 11V5C-3 1 3 1 3 5V11Z" fill="${b}"/>`,
  hook: (a, _b, c) => `<path d="M0-12V-1" stroke="${c}" stroke-width="1.4"/><path d="M0-1C5-1 6 5 2 8C-2 11-7 7-5 3" fill="none" stroke="${a}" stroke-width="2.4"/>`,
  chain: (a) => `<g fill="none" stroke="${a}" stroke-width="1.6"><rect x="-13" y="-3" width="9" height="6" rx="3"/><rect x="-5" y="-3" width="9" height="6" rx="3"/><rect x="3" y="-3" width="9" height="6" rx="3"/></g>`,
  ribbon: (a, b) => `<path d="M-14-3H14V3H-14Z" fill="${a}"/><path d="M0 0L-6 10L-2 9L0 3L2 9L6 10Z" fill="${b}"/><circle r="3" fill="${b}"/>`,
  plaque: (a, b, c) => `<rect x="-11" y="-7" width="22" height="14" rx="1" fill="${a}"/><rect x="-9" y="-5" width="18" height="10" fill="none" stroke="${c}" stroke-width=".7"/><path d="M-6-1.6H6M-4 1.6H4" stroke="${c}" stroke-width="1"/><g fill="${b}"><circle cx="-10" cy="-6" r=".7"/><circle cx="10" cy="-6" r=".7"/><circle cx="-10" cy="6" r=".7"/><circle cx="10" cy="6" r=".7"/></g>`,
  bond: (a, b, c) => `<rect x="-9" y="-11" width="18" height="22" fill="${a}"/><path d="M-6-7H6M-6-4H6M-6-1H3" stroke="${c}" stroke-width=".8"/><circle cx="3" cy="6" r="3.4" fill="${b}"/>`,
  lever: (a, b, c) => `<rect x="-9" y="5" width="18" height="5" fill="${c}"/><path d="M0 7L7-8" stroke="${a}" stroke-width="2"/><circle cx="7" cy="-9" r="2.4" fill="${b}"/>`,
  wire: (a, b, c) => `<path d="M0-12V4" stroke="${a}" stroke-width="1.6"/><path d="M-8 4H8M-5 7H5M-2 10H2" stroke="${b}" stroke-width="1.6"/><path d="M-5-12H5" stroke="${c}" stroke-width="2"/>`,
  horn: (a, b) => `<path d="M-10-2L8-9V9L-10 2Z" fill="${a}"/><rect x="-13" y="-2.4" width="4" height="4.8" fill="${b}"/>`,
  sign: (a, b, c) => `<rect x="-1" y="-2" width="2" height="14" fill="${c}"/><rect x="-10" y="-11" width="20" height="10" fill="${a}"/><path d="M-6-8H6M-6-5H3" stroke="${b}" stroke-width="1.2"/>`,
  valve: (a, b, c) => `<rect x="-14" y="-3" width="28" height="6" fill="${a}"/><rect x="-3" y="-7" width="6" height="10" fill="${c}"/><circle cy="-9" r="4.4" fill="none" stroke="${b}" stroke-width="1.6"/><path d="M-4.4-9H4.4" stroke="${b}" stroke-width="1"/>`,
  pipe: (a, _b, c) => `<path d="M-14 6H0V-10" fill="none" stroke="${a}" stroke-width="4"/><path d="M-3-6H3M-8 3V9" stroke="${c}" stroke-width="1"/>`,
  puff: (_a, b) => `<g fill="${b}" opacity=".55"><circle r="4"/><circle cx="5" cy="-3" r="5"/><circle cx="11" cy="-1" r="3.4"/></g>`,
  fair: (a, b, c) => `<path d="M-12-3L-6-10L0-3ZM0-3L6-10L12-3Z" fill="${a}"/><path d="M-6-10L0-3L6-10" fill="${b}"/><rect x="-11" y="-3" width="10" height="12" fill="${c}"/><rect x="1" y="-3" width="10" height="12" fill="${c}"/>`,
  shelves: (a, b, c) => `<rect x="-14" y="-11" width="28" height="22" fill="${c}"/><path d="M-14-4H14M-14 3H14" stroke="${a}" stroke-width="1"/><path d="M-11-10V-5M-8-10V-5M-5-9V-5M1-10V-5M4-9V-5M-9-3V2M-5-3V2M0-2V2M5-3V2M9-3V2M-11 4V9M-6 4V9M2 4V9M7 4V9" stroke="${b}" stroke-width="1.8"/>`,
  meter: (a, b, c) => `<rect x="-8" y="-11" width="16" height="22" rx="2" fill="${c}"/><rect x="-5" y="-8" width="10" height="9" fill="${b}"/><path d="M0 0L3-6" stroke="${c}" stroke-width="1"/><circle cx="-3" cy="6" r="1.6" fill="${a}"/><circle cx="3" cy="6" r="1.6" fill="${a}"/>`,
  rust: (a, b, c) => `<path d="M-9-3L-3-9L4-7L10-1L7 7L-1 9L-8 5Z" fill="${a}"/><g fill="${c}"><circle cx="-3" cy="-2" r="1.6"/><circle cx="4" cy="2" r="2.2"/><circle cx="-2" cy="5" r="1"/></g><g fill="${b}"><circle cx="3" cy="-4" r="1"/><circle cx="-5" cy="2" r=".8"/></g>`,
  scales: (a, b, c) => `<path d="M0-11V9M-10-7H10" stroke="${a}" stroke-width="1.4"/><path d="M-10-7L-13 1H-7ZM10-7L7 1H13Z" fill="${b}"/><rect x="-5" y="9" width="10" height="2" fill="${c}"/>`,
};

/**
 * One sky, then parts as `name x y size`, back to front; `^` after the size uses the accent as the main colour. The
 * view is 100 by 56, and the ground starts at y=44.
 */
const SCENES: Record<string, string> = {
  // Basics
  scrap: 'bench gear 28 38 .7|gear2 50 42 .55|rust 72 40 .7|caliper 45 30 .5',
  cog: 'velvet gear 50 28 1.9',
  dynamo: 'lab dynamo 50 28 1.5|arc 22 22 .8|arc 78 22 .8',
  notebook: 'bench book 50 32 1.5|chain 50 50 .5',
  blueprint: 'plan city 50 34 1|gear 80 14 .6',
  monument: 'dusk arch 50 28 1.5|lamp 16 34 .9|lamp 84 34 .9',
  rust: 'rust rust 34 32 1.3|rust 66 36 .9|gear2 54 16 .5',
  // Core: economy and cycling
  gearwright: 'bench person 24 30 1.2|desk 62 36 1|gear 58 28 .7|caliper 72 24 .6',
  shift_bell: 'steam bell 50 18 1.1|belt 50 44 1.5|puff 18 22 .7',
  tally_clerk: 'bench person 26 32 1.2|desk 64 34 1|ledger 62 24 .7',
  supply_crane: 'dusk crane 48 26 1.6|waves 50 48 1.2|crate 80 36 .6',
  copper_press: 'bench press 50 28 1.7|flame 80 36 .5^',
  foreman: 'steam person 30 28 1.3|person 62 38 .6|person 76 38 .6|gear 88 18 .6',
  paper_fan: 'paper fan 50 26 1.8|scroll 18 42 .5|scroll 84 42 .5',
  conveyor: 'bench belt 50 34 2.4|gear 22 14 .6|gear2 40 14 .45',
  sorting_glasses: 'bench glasses 50 22 1.6|drawers 16 36 .6|gear 84 40 .6',
  springboard: 'day spring 50 32 1.4|gear2 50 8 .6|desk 50 44 1.2',
  clockwork_archive: 'lab drawers 28 28 1.2|drawers 72 28 1.2|lantern 50 16 .7',
  whistle_stop: 'dusk tower 28 26 1.4|tram 66 36 1.2|moon 86 12 .5',
  // Core: Spark
  hand_crank: 'lab coil 46 34 1.3|lever 68 30 1|bolt 24 18 .8',
  charge_meter: 'night gauge 50 27 1.9|arc 14 20 .7|arc 86 20 .7',
  capacitor_bank: 'lab jars 50 28 2|arc 50 8 .9',
  steam_diverter: 'steam valve 50 30 1.8|puff 76 14 .9|puff 10 16 .7',
  glow_mason: 'dusk person 26 30 1.2|lantern 54 38 .7|lantern 70 38 .7|lantern 86 38 .7',
  overcharge_lab: 'lab arc 50 16 2.2|jars 50 40 1.1|bolt 88 18 .6',
  // Core: interaction and defence
  signal_tower: 'day tower 36 24 1.5|flag 66 24 1.3',
  city_messenger: 'steam bike 50 32 1.6|tower 88 28 .9',
  inspection_team: 'steam person 22 30 1.1|person 40 32 1|gear 68 28 1.3|sign 90 34 .5',
  mutual_aid: 'dusk bridge 50 34 2.2|person 34 20 .7|person 66 20 .7|waves 50 50 1.2',
  permit_office: 'paper kiosk 44 26 1.6|stamp 80 30 .9',
  night_watch: 'night person 42 28 1.3|lantern 60 28 .8|owl 74 18 .6|moon 16 12 .7',
  maintenance_cart: 'night cart 50 34 1.6|gear 76 44 .5|lamp 88 30 .8',
  lamplighter: 'dusk city 50 34 1|person 34 32 1.1|lantern 54 14 .7',
  clock_garden: 'day flower 24 30 1|flower 50 26 1.3|flower 76 30 1|gear2 50 48 .5',
  gear_lease: 'paper gear 34 26 1.3|gear2 66 30 1|sign 86 18 .6',
  city_blueprint: 'plan scroll 50 28 2.1|gear 86 12 .5',
  grand_engine: 'bench wheel 50 26 1.9|coil 18 36 .7|coil 82 36 .7',
  // Core: scoring
  civic_scholar: 'paper person 28 30 1.3|book 62 34 1|scroll 76 16 .7',
  museum_curator: 'velvet person 22 32 1.1|plaque 62 18 1.2|gear2 62 40 .7',
  patron_circle: 'velvet person 24 34 .9|person 44 32 1|person 66 32 1|lantern 50 10 .6|coin 86 38 .5',
  silver_statue: 'steam statue 50 28 1.7^|puff 16 34 .9|puff 72 34 .8',
  civic_embassy: 'day arch 30 30 1.1|arch 70 30 1.1|bridge 50 24 .7',
  inventors_medal: 'velvet medal 50 26 1.8',
  // Foundry Row
  spark_coil: 'lab coil 50 32 1.8|arc 50 12 1.2',
  brass_bond: 'paper bond 38 28 1.3|coin 70 34 1',
  relay_junction: 'lab wire 26 26 .9|wire 74 26 .9|arc 50 22 1.2',
  chain_drive: 'bench gear 26 28 1.2|gear2 74 28 1.2|chain 50 28 1.5',
  flywheel: 'steam wheel 50 26 1.8|puff 88 16 .6',
  timer_switch: 'night gauge 32 28 1.3|lever 68 28 1.2',
  belt_sorter: 'steam belt 50 38 2|glasses 50 14 .7',
  salvage_hook: 'rust hook 50 22 1.7|rust 50 46 .6|crate 80 42 .5',
  millrace: 'day wheel 34 26 1.4|waves 62 40 1.2|pipe 84 28 .6',
  slag_furnace: 'rust furnace 50 28 1.6|puff 72 10 .7|gear2 16 40 .5',
  spark_exchange: 'lab scales 50 26 1.7|bolt 26 28 .6|coin 76 30 .5',
  // Night Shift
  picket_line: 'night person 22 32 1|person 44 32 1|person 66 32 1|sign 22 14 .55|sign 66 14 .55',
  corrosion_crew: 'rust person 26 30 1.2|rust 58 34 1|gear2 80 22 .7',
  noise_complaint: 'night horn 40 26 1.4|sign 78 30 .9|moon 14 12 .5',
  whistleblower: 'night person 30 30 1.2|horn 58 18 .7|ledger 80 34 .7',
  ground_wire: 'lab wire 50 26 1.6|bolt 24 16 .7',
  redline_boiler: 'rust gauge 34 26 1.3|furnace 74 30 1.1|puff 86 8 .5',
  pressure_test: 'steam gauge 50 16 .9|valve 50 36 1.6|puff 86 24 .7',
  overload_relay: 'night arc 30 22 1.2|arc 70 20 1.2|meter 50 34 .9|bolt 88 40 .4',
  scrapyard_broker: 'rust crate 24 36 .8|rust 44 40 .7|person 66 30 1.1|coin 88 18 .5',
  // Town Hall
  surveyor: 'day person 28 30 1.2|caliper 56 24 .9|flag 80 30 .8',
  zoning_board: 'plan city 50 42 .7|stamp 36 16 .8|sign 70 14 .7',
  ribbon_cutter: 'day ribbon 50 26 1.8|arch 50 28 .6|person 16 32 .7',
  town_crier: 'dusk person 32 30 1.2|horn 60 20 .9|tower 88 28 .8',
  civic_bond: 'paper bond 50 28 1.5|medal 78 28 .6',
  city_charter: 'paper scroll 50 22 1.6|stamp 50 44 .6|tower 88 26 .7',
  patent_ledger: 'bench ledger 40 28 1.4|gear 72 22 .8|gear2 80 38 .5',
  plaque_foundry: 'rust plaque 50 22 1.2|furnace 50 44 .6|flame 18 34 .6',
  // Public Works
  canal_lights: 'night bridge 50 24 2.2|lantern 22 14 .5|lantern 50 8 .5|lantern 78 14 .5|waves 50 46 1.3',
  public_clock: 'day tower 50 26 2',
  makers_fair: 'day fair 28 32 1.2|fair 70 32 1.2|flag 50 18 .8',
  tram_extension: 'day tram 54 34 1.5|flower 14 34 .7|flower 92 34 .7',
  skybridge: 'dusk tower 16 28 1.5|tower 84 28 1.5|bridge 50 18 1.3|person 50 12 .3',
  library_lanterns: 'velvet shelves 50 30 1.6|lantern 28 10 .5|lantern 50 8 .5|lantern 72 10 .5',
  waterwheel: 'day wheel 48 26 2|waves 50 50 1.2',
  city_illumination: 'night city 50 34 1.1|lantern 18 12 .5|lantern 40 8 .5|lantern 62 12 .5|lantern 84 8 .5',
  harbor_beacon: 'night tower 34 26 1.5|arc 68 16 1|waves 50 48 1.3',
  foundry_gate: 'rust arch 50 28 1.6|flame 50 28 .5|gear 16 16 .6|gear2 84 16 .6',
  power_exchange: 'lab scales 50 24 1.2|coil 22 38 .7|coil 78 38 .7',
  aqueduct: 'day bridge 50 20 1.8|arch 28 38 .6|arch 72 38 .6|waves 50 52 1',
  rail_terminus: 'dusk arch 50 26 1.5|tram 50 40 .9|lamp 12 32 .7|lamp 88 32 .7',
};

const cache = new Map<string, string>();

function draw(scene: string): string {
  const [first, ...parts] = scene.split('|');
  const [skyName, ...firstPart] = first.split(' ');
  const sky = SKIES[skyName];
  const body = [firstPart.join(' '), ...parts]
    .map((p) => {
      const [name, x, y, size] = p.split(' ');
      const part = PARTS[name];
      if (!part) return '';
      const accent = size.endsWith('^');
      const s = accent ? size.slice(0, -1) : size;
      return `<g transform="translate(${x} ${y}) scale(${s})">${part(accent ? sky.b : sky.a, accent ? sky.a : sky.b, sky.c)}</g>`;
    })
    .join('');
  return `<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="100" height="56" fill="${sky.top}"/><rect y="24" width="100" height="20" fill="${sky.low}"/><rect y="44" width="100" height="12" fill="${sky.ground}"/>${body}</svg>`;
}

/** The illustration for a card or Public Work as SVG markup, or null when it has none. */
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
