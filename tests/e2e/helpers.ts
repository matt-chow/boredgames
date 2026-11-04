import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';

export const PHONE: BrowserContextOptions = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
export const DESKTOP: BrowserContextOptions = { viewport: { width: 1366, height: 860 } };

export interface Player {
  name: string;
  page: Page;
  /** Every server→client WebSocket frame this player received, parsed. */
  frames: unknown[];
  /** Uncaught page errors; tests assert this stays empty. */
  errors: string[];
}

export async function newPlayer(browser: Browser, name: string, opts: BrowserContextOptions = DESKTOP): Promise<Player> {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', ...opts });
  const page = await ctx.newPage();
  const frames: unknown[] = [];
  page.on('websocket', (ws) =>
    ws.on('framereceived', (f) => {
      try {
        frames.push(JSON.parse(String(f.payload)));
      } catch {
        /* binary or non-JSON: ignore */
      }
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { name, page, frames, errors };
}

export async function createRoom(p: Player): Promise<string> {
  await p.page.goto('/');
  await p.page.getByRole('button', { name: /^Open Table: Bohnanza/ }).click();
  await p.page.fill('#name', p.name);
  await p.page.getByRole('button', { name: 'Create room' }).click();
  await p.page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  return p.page.url().split('/').pop()!;
}

export async function joinRoom(p: Player, code: string) {
  await p.page.goto(`/r/${code}`);
  await p.page.fill('#jname', p.name);
  await p.page.getByRole('button', { name: 'Take a seat' }).click();
  // Generous: other tables may be busy on the same machine.
  await expect(p.page.getByText(`${p.name} (you)`)).toBeVisible({ timeout: 15_000 });
}

/** Host opens a table, the others join, and the host starts the game. */
export async function startTable(players: Player[], configure?: (host: Player) => Promise<void>): Promise<string> {
  const [host, ...rest] = players;
  const code = await createRoom(host);
  for (const p of rest) await joinRoom(p, code);
  await configure?.(host);
  const start = host.page.getByRole('button', { name: 'Start the game' });
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of players) await expect(p.page.locator('.table .turn')).toBeVisible();
  return code;
}

export async function activePlayer(players: Player[]): Promise<Player> {
  await expect
    .poll(async () => {
      for (const p of players) if (await p.page.locator('.turn.you').count()) return p.name;
      return null;
    })
    .not.toBeNull();
  for (const p of players) if (await p.page.locator('.turn.you').count()) return p;
  throw new Error('no active player');
}

/**
 * One step of a simple UI-driven bot: answer a coin claim, steal with a
 * Magpie, plant into the first highlighted field, sometimes claim the Bean
 * Coin, else press the primary action, else harvest to make room.
 * Returns what it did, or null when it had nothing to do.
 */
export async function botStep(p: Player): Promise<string | null> {
  // One round-trip per step: the decision and the click happen in the page,
  // on the same real buttons a person would press.
  return p.page.evaluate(() => {
    const q = (s: string) => document.querySelector<HTMLButtonElement>(s);
    const named = (s: string, re: RegExp) => [...document.querySelectorAll<HTMLButtonElement>(s)].find((b) => !b.disabled && re.test(b.innerText));
    const coin = named('.ask button', Math.random() < 0.5 ? /Resist/ : /Hand it over/);
    if (coin) return coin.click(), coin.innerText.trim();
    const steal = q('.steal');
    if (steal) return steal.click(), 'steal';
    const claim = named('.actions button', /Claim Bean Coin/);
    if (claim && Math.random() < 0.3) return claim.click(), 'claim';
    const hit = q('.mine .hit');
    if (hit) return hit.click(), 'plant';
    const go = q('.actions .go:not([disabled])');
    if (go && !/Results/.test(go.innerText)) return go.click(), go.innerText.trim();
    const step = q('.step.mine');
    const needsRoom = q('.mine .pending') || (step && /fits no field/.test(step.innerText));
    const harvest = [...document.querySelectorAll<HTMLButtonElement>('.mine .crate button')].find((b) => /Harvest/.test(b.innerText));
    if (needsRoom && harvest) return harvest.click(), 'harvest';
    return null;
  });
}

/** The parsed RoomView messages a player received. */
export function roomViews(p: Player): { you: number; game: { you: number; players: { hand?: unknown }[] } | null }[] {
  return p.frames.filter((f): f is { t: 'room'; room: never } => (f as { t?: string }).t === 'room').map((f) => f.room);
}

type Ack = { t: 'ack'; id: string; ok: boolean; code?: string; error?: string; v: number };

/**
 * Open a second, raw WebSocket from a player's page (same cookie, same
 * origin) and send hand-written messages, bypassing the UI. `v: 'current'`
 * is replaced with the room version from the first snapshot.
 */
export async function rawSend(p: Player, code: string, msgs: Record<string, unknown>[]): Promise<Ack[]> {
  return p.page.evaluate(
    ({ code, msgs }) =>
      new Promise<Ack[]>((resolve, reject) => {
        const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/${code}`);
        const acks: Ack[] = [];
        let sent = false;
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (m.t === 'room' && !sent) {
            sent = true;
            for (const msg of msgs) ws.send(JSON.stringify({ ...msg, v: msg.v === 'current' ? m.room.version : msg.v }));
          }
          if (m.t === 'ack') {
            acks.push(m);
            if (acks.length === msgs.length) {
              ws.close();
              resolve(acks);
            }
          }
        };
        ws.onerror = () => reject(new Error('socket refused'));
        setTimeout(() => reject(new Error(`timeout; acks=${JSON.stringify(acks)}`)), 8000);
      }),
    { code, msgs },
  );
}
