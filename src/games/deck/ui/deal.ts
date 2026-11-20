import { loadString, save } from '../../../client/lib/storage';

const STEP = 70;
const FLIGHT = 420;

/**
 * Deal the market and the projects onto the table from one point above them, one card at a time.
 * Only the first time this device sees the room, so a refresh or reconnect doesn't replay it.
 * Animates transform and opacity only; the cards stay where the layout puts them and stay clickable.
 */
export function deal(root: HTMLElement, table: string): Animation[] {
  const key = `deal:${table}`;
  if (loadString(key)) return [];
  save(key, '1');
  const cards = [...root.querySelectorAll<HTMLElement>('[data-deal]')];
  if (!cards.length) return [];
  const area = root.querySelector('[data-deal-from]')?.getBoundingClientRect() ?? root.getBoundingClientRect();
  const from = { x: area.left + area.width / 2, y: area.top };
  return cards.map((el, i) => {
    const r = el.getBoundingClientRect();
    const dx = from.x - (r.left + r.width / 2);
    const dy = from.y - (r.top + r.height / 2);
    return el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${i % 2 ? 4 : -4}deg) scale(0.6)`, opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: FLIGHT, delay: i * STEP, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
    );
  });
}
