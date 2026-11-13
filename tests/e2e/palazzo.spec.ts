import { expect, test } from '@playwright/test';
import { DESKTOP, newPlayer, PHONE, type Player } from './helpers';

const shot = async (p: Player, name: string) => {
  if (process.env.PZ_SHOTS) await p.page.screenshot({ path: `${process.env.PZ_SHOTS}/${name}.png` });
};

async function openTable(players: Player[], configure?: (host: Player) => Promise<void>) {
  const [a, ...rest] = players;
  await a.page.goto('/');
  await a.page.getByRole('button', { name: /^Open Table: Palazzo/ }).click();
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
  const start = a.page.getByRole('button', { name: 'Start the game' });
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of players) await expect(p.page.locator('.myseat .slot').first()).toBeVisible();
  return code;
}

const act = (p: Player, name: string) => p.page.getByRole('group', { name: 'Actions', exact: true }).getByRole('button', { name: new RegExp(`^${name}`) });

/**
 * Whoever has a decision makes the plainest one: reveal or return the first card it can, let any claim stand, Depose
 * when it can and take Income otherwise. Returns false when nobody can act.
 */
async function step(players: Player[]) {
  for (const p of players) {
    const page = p.page;
    if (!(await page.locator('.status.mine').count())) continue;
    const answer = page.getByRole('region', { name: 'Your answer' });
    if (await answer.isVisible()) {
      await answer.getByRole('button', { name: /^(Let it stand|Let it happen|Accept the block)$/ }).click();
      return true;
    }
    const confirm = page.getByRole('button', { name: /^(Reveal|Return) the / });
    if (await page.locator('.choose .btn.primary', { hasText: /^Choose a card|^(Reveal|Return) the / }).isVisible()) {
      await page.locator('.myseat .slot:not([disabled])').first().click();
      await confirm.click();
      await expect(confirm).toHaveCount(0);
      return true;
    }
    const depose = act(p, 'Depose');
    if (await depose.isEnabled()) {
      await depose.click();
      const chips = page.getByRole('radiogroup', { name: 'Choose a player' });
      if (await chips.isVisible()) await chips.getByRole('radio').first().click();
    } else await act(p, 'Income').click();
    const go = page.getByRole('button', { name: /^Declare / });
    await expect(go).toBeEnabled();
    await go.click();
    await expect(go).toHaveCount(0);
    return true;
  }
  return false;
}

async function playUntilOver(players: Player[], limit = 120) {
  for (let i = 0; i < limit; i++) {
    if (await players[0].page.getByRole('button', { name: 'Rematch' }).isVisible()) return;
    if (!(await step(players))) await players[0].page.waitForTimeout(150);
  }
  throw new Error('the game did not finish');
}

/** PZ-NET6: no frame may carry the deck, the generator or an opponent's hidden card. */
function assertNoLeaks(p: Player) {
  let seen = 0;
  for (const f of p.frames as { t?: string; room?: { game?: Record<string, unknown> } }[]) {
    const g = f.room?.game;
    if (f.t !== 'room' || !g) continue;
    seen++;
    expect(typeof g.deck).toBe('number');
    for (const k of ['rng', 'seats', 'seed', 'seen', 'losses']) expect(g[k], `${k} must not be sent`).toBeUndefined();
    const me = g.me as { hand: { role: string; up: boolean }[] } | null;
    // Every opponent's card is either face up (a role) or null; only `me` holds ids.
    for (const x of g.players as { cards: (string | null)[] }[]) for (const c of x.cards) expect(c === null || typeof c === 'string').toBe(true);
    if (g.phase !== 'over' && g.turn === 1 && g.log && (g.log as unknown[]).length <= 1) {
      for (const [i, x] of (g.players as { cards: (string | null)[] }[]).entries()) if (i !== g.you) expect(x.cards).toEqual([null, null]);
    }
    expect(me === null || Array.isArray(me.hand)).toBe(true);
  }
  expect(seen).toBeGreaterThan(0);
}

async function noSideScroll(p: Player) {
  const over = await p.page.evaluate(() => [...document.querySelectorAll('html, body, .table, .play')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName));
  expect(over).toEqual([]);
}

test('two desktops: a challenge, the reference, chat, a refresh, a whole game and a rematch', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await newPlayer(browser, 'Ada', DESKTOP);
  const b = await newPlayer(browser, 'Bea', DESKTOP);
  await openTable([a, b], async (host) => {
    await host.page.getByLabel('Time to answer a claim').selectOption('30');
  });
  for (const p of [a, b]) await expect(p.page.locator('.myseat .slot')).toHaveCount(2);
  await shot(a, 'desktop-table');
  await noSideScroll(a);

  // The reference opens beside the table and never pauses anything.
  await a.page.getByRole('button', { name: 'Reference', exact: true }).click();
  await expect(a.page.getByRole('heading', { name: 'Reference' })).toBeVisible();
  await expect(a.page.getByRole('cell', { name: 'Seize' }).or(a.page.getByRole('rowheader', { name: 'Seize' })).first()).toBeVisible();

  await a.page.fill('#pz-chat', 'A fine evening at the palazzo.');
  await a.page.keyboard.press('Enter');
  await expect(b.page.locator('.line', { hasText: 'A fine evening' })).toBeVisible();

  // Whoever opens claims the Chancellor, and the other challenges: somebody loses an influence.
  const [opener, other] = (await a.page.locator('.status.mine').count()) ? [a, b] : [b, a];
  await act(opener, 'Collect').click();
  await opener.page.getByRole('button', { name: /^Declare / }).click();
  const answer = other.page.getByRole('region', { name: 'Your answer' });
  await expect(answer).toBeVisible();
  await expect(other.page.locator('.timer')).toHaveText(/\d+s/);
  await answer.getByRole('button', { name: 'Challenge' }).click();
  await expect(opener.page.locator('.history li', { hasText: /challenge/i }).first()).toBeAttached();

  await a.page.reload();
  await expect(a.page.locator('.myseat .slot')).toHaveCount(2, { timeout: 15_000 });

  await playUntilOver([a, b]);
  for (const p of [a, b]) await expect(p.page.getByRole('region', { name: 'Final result' })).toBeVisible();
  await shot(a, 'desktop-over');
  assertNoLeaks(a);
  assertNoLeaks(b);

  // Rematch: back to the lobby with the same seats, and the settings are open again.
  await a.page.getByRole('button', { name: 'Rematch' }).click();
  await expect(a.page.getByRole('button', { name: 'Start the game' })).toBeVisible();
  await expect(a.page.getByLabel('Time to answer a claim')).toBeEnabled();
  expect(a.errors).toEqual([]);
  expect(b.errors).toEqual([]);
});

test('three phones: layout, tabs, chat, the reference sheet and a pause when someone drops', async ({ browser }) => {
  test.setTimeout(180_000);
  const c = await newPlayer(browser, 'Cy', PHONE);
  const d = await newPlayer(browser, 'Di', PHONE);
  const e = await newPlayer(browser, 'Ed', PHONE);
  const ps = [c, d, e];
  await openTable(ps);
  await shot(c, 'phone-table');
  for (const p of ps) await noSideScroll(p);

  await c.page.getByRole('button', { name: 'Reference', exact: true }).click();
  await expect(c.page.getByRole('dialog', { name: 'Reference' })).toBeVisible();
  await shot(c, 'phone-reference');
  await c.page.getByRole('dialog', { name: 'Reference' }).getByRole('button', { name: 'Close' }).click();
  await expect(c.page.getByRole('dialog', { name: 'Reference' })).toHaveCount(0);

  await d.page.getByRole('button', { name: /^Chat/ }).click();
  await d.page.fill('#pz-chat', 'Who holds the Bravo?');
  await d.page.keyboard.press('Enter');
  await c.page.getByRole('button', { name: /^Chat/ }).click();
  await expect(c.page.locator('.line', { hasText: 'Who holds the Bravo?' })).toBeVisible();
  await c.page.getByRole('button', { name: 'Table' }).click();
  await d.page.getByRole('button', { name: 'Table' }).click();

  for (let i = 0; i < 4; i++) await step(ps);
  await c.page.getByRole('button', { name: 'History' }).click();
  await expect(c.page.locator('.history li').first()).toBeVisible();
  await c.page.getByRole('button', { name: 'Table' }).click();

  // PZ-NET2: under the default policy a drop pauses the table, and nothing is played for anyone.
  await e.page.context().close();
  await expect(c.page.getByText(/Paused until Ed reconnects/)).toBeVisible({ timeout: 30_000 });
  await shot(c, 'phone-paused');
  for (const p of [c, d]) if (await p.page.getByRole('group', { name: 'Actions', exact: true }).isVisible()) await expect(act(p, 'Income')).toBeDisabled();
  assertNoLeaks(c);
  assertNoLeaks(d);
  expect(c.errors).toEqual([]);
  expect(d.errors).toEqual([]);
});
