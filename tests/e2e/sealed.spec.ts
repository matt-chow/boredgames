import { expect, test } from '@playwright/test';
import { DESKTOP, newPlayer, PHONE, type Player } from './helpers';

const shot = async (p: Player, name: string) => {
  if (process.env.SC_SHOTS) await p.page.screenshot({ path: `${process.env.SC_SHOTS}/${name}.png` });
};

async function openTable(players: Player[], configure?: (host: Player) => Promise<void>) {
  const [a, ...rest] = players;
  await a.page.goto('/');
  await a.page.getByRole('button', { name: /^Open Table: Sealed Correspondence/ }).click();
  await a.page.fill('#name', a.name);
  await a.page.getByRole('button', { name: 'Create room' }).click();
  await a.page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = a.page.url().split('/').pop()!;
  for (const p of rest) {
    await p.page.goto(`/r/${code}`);
    await p.page.fill('#jname', p.name);
    await p.page.getByRole('button', { name: 'Take a seat' }).click();
    await expect(p.page.getByText(`${p.name} (you)`)).toBeVisible({ timeout: 15_000 });
  }
  await configure?.(a);
  for (const p of players) {
    const ready = p.page.getByRole('button', { name: 'I’m ready' });
    if (await ready.isVisible()) await ready.click();
  }
  const start = a.page.getByRole('button', { name: 'Start the game' });
  await expect(start).toBeEnabled();
  await start.click();
  // First visit: the tutorial opens by itself and can be dismissed.
  for (const p of players) {
    await expect(p.page.getByRole('dialog', { name: /^Tutorial/ })).toBeVisible();
    await p.page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(p.page.getByRole('dialog')).toHaveCount(0);
  }
  return code;
}

/** Whoever has something to do does the first legal thing the screen offers. Returns false when nobody can act. */
async function step(players: Player[]) {
  for (const p of players) {
    const page = p.page;
    if (!(await page.locator('.status.mine').count())) continue;
    const deal = page.getByRole('button', { name: /^Deal round/ });
    if (await deal.isVisible()) return deal.click().then(() => true);
    await page.locator('.myseat .hand .slot:not([disabled])').first().click();
    const keep = page.getByRole('button', { name: /^Keep the/ });
    if (await keep.isVisible()) return keep.click().then(() => true);
    for (const group of ['Choose a player', 'Name a character']) {
      const g = page.getByRole('radiogroup', { name: group });
      if (await g.isVisible()) await g.getByRole('radio').first().click();
    }
    const go = page.getByRole('button', { name: /^Seal and play/ });
    await expect(go).toBeEnabled();
    await go.click();
    await expect(go).toHaveCount(0);
    return true;
  }
  return false;
}

async function playUntilOver(players: Player[], limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await players[0].page.getByRole('button', { name: 'Rematch' }).isVisible()) return;
    if (!(await step(players))) await players[0].page.waitForTimeout(150);
  }
  throw new Error('the game did not finish');
}

/** No frame may carry another player's hand, the deck, the reserve or the generator. */
function assertNoLeaks(p: Player) {
  for (const f of p.frames as { t?: string; room?: { game?: Record<string, unknown> } }[]) {
    const g = f.room?.game;
    if (f.t !== 'room' || !g) continue;
    expect(typeof g.deck).toBe('number');
    for (const k of ['rng', 'seats', 'seed']) expect(g[k], `${k} must not be sent`).toBeUndefined();
    for (const x of g.players as { hand: unknown }[]) expect(typeof x.hand).toBe('number');
    expect(JSON.stringify(g.reserve ?? null)).not.toContain('kind');
  }
}

async function noSideScroll(p: Player) {
  const over = await p.page.evaluate(() => [...document.querySelectorAll('html, body, .table, .play')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName));
  expect(over).toEqual([]);
}

test('two desktops: a whole game to one favor, the rules, chat, a refresh and a rematch', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await newPlayer(browser, 'Ada', DESKTOP);
  const b = await newPlayer(browser, 'Bea', DESKTOP);
  await openTable([a, b], async (host) => {
    await host.page.getByLabel('Favors to win').selectOption('1');
  });
  for (const p of [a, b]) {
    await expect(p.page.locator('.myseat .hand .slot')).not.toHaveCount(0);
    await expect(p.page.getByText('Set aside')).toBeVisible();
  }
  await shot(a, 'desktop-table');
  await noSideScroll(a);

  // The rules for this ruleset are a click away.
  await a.page.getByRole('button', { name: /how to play|help|rules/i }).first().click();
  await expect(a.page.getByRole('dialog').getByText(/How to win/).first()).toBeVisible();
  await a.page.keyboard.press('Escape');
  await expect(a.page.getByRole('dialog')).toHaveCount(0);

  await a.page.fill('#sc-chat', 'A fine evening at court.');
  await a.page.keyboard.press('Enter');
  await expect(b.page.locator('.line', { hasText: 'A fine evening' })).toBeVisible();

  await step([a, b]);
  await a.page.reload();
  await expect(a.page.locator('.myseat .hand .slot')).not.toHaveCount(0, { timeout: 15_000 });

  await playUntilOver([a, b]);
  for (const p of [a, b]) await expect(p.page.getByText(/court’s favor|win together/)).toBeVisible();
  await shot(a, 'desktop-over');
  assertNoLeaks(a);
  assertNoLeaks(b);

  await a.page.getByRole('button', { name: 'Rematch' }).click();
  for (const p of [a, b]) await expect(p.page.getByRole('button', { name: 'Rematch' })).toHaveCount(0);
  expect(a.errors).toEqual([]);
  expect(b.errors).toEqual([]);
});

test('three phones on Expanded: tabs, the tutorial, an offline player pauses the table', async ({ browser }) => {
  test.setTimeout(240_000);
  const ps = [await newPlayer(browser, 'Cy', PHONE), await newPlayer(browser, 'Di', PHONE), await newPlayer(browser, 'Ed', PHONE)];
  await openTable(ps, async (host) => {
    await host.page.getByRole('radio', { name: /Expanded/ }).click();
    await expect(host.page.getByRole('radio', { name: /Expanded/ })).toHaveAttribute('aria-checked', 'true');
  });
  const [c, d, e] = ps;
  await expect(c.page.getByText('Expanded · first to 5 favors')).toBeVisible();
  await shot(c, 'phone-table');
  await noSideScroll(c);

  // The tutorial can be reopened and answered.
  await c.page.getByRole('button', { name: 'Tutorial' }).click();
  await c.page.getByRole('button', { name: 'Next' }).click();
  await c.page.getByRole('button', { name: '2 Scribe' }).click();
  await expect(c.page.getByRole('status').filter({ hasText: 'Only you see' })).toBeVisible();
  await c.page.getByRole('button', { name: 'Skip tutorial' }).click();

  // Chat and history live in their own tabs on a phone.
  await d.page.getByRole('button', { name: 'Chat' }).click();
  await d.page.fill('#sc-chat', 'Who holds the Heir?');
  await d.page.keyboard.press('Enter');
  await c.page.getByRole('button', { name: /^Chat/ }).click();
  await expect(c.page.locator('.line', { hasText: 'Who holds the Heir?' })).toBeVisible();
  await c.page.getByRole('button', { name: 'Table' }).click();
  await d.page.getByRole('button', { name: 'Table' }).click();

  for (let i = 0; i < 4; i++) await step(ps);
  await c.page.getByRole('button', { name: 'History' }).click();
  await expect(c.page.locator('.history li').first()).toBeVisible();
  await c.page.getByRole('button', { name: 'Table' }).click();

  // One player drops: the others are told the table waits, and nothing is played for them.
  await e.page.context().close();
  await expect(c.page.getByText(/Ed is offline\. The game waits for them/)).toBeVisible({ timeout: 20_000 });
  await shot(c, 'phone-away');
  assertNoLeaks(c);
  assertNoLeaks(d);
  expect(c.errors).toEqual([]);
  expect(d.errors).toEqual([]);
});
