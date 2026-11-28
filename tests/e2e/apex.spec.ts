import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, newPlayer, PHONE, type Player, openGame } from './helpers';

const shot = async (p: Player, name: string) => {
  if (process.env.AX_SHOTS) await p.page.screenshot({ path: `${process.env.AX_SHOTS}/${name}.png` });
};

async function openTable(players: Player[], configure?: (page: Page) => Promise<void>) {
  const [a, ...rest] = players;
  await a.page.goto('/');
  await openGame(a.page, 'Apex ’66');
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
  await configure?.(a.page);
  const start = a.page.getByRole('button', { name: 'Start the game' });
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of players) await expect(p.page.getByRole('application', { name: /lap 1 of/ })).toBeVisible({ timeout: 15_000 });
  return code;
}

const laps1 = async (page: Page) => {
  await page.getByRole('combobox', { name: /^Laps/ }).selectOption('1');
  await expect(page.getByRole('combobox', { name: /^Laps/ })).toHaveValue('1');
};

/**
 * Play your part of a round through the dashboard. In your turn: take a slipstream, else Continue, else Finish turn.
 * Otherwise lock a plan: the highest gear that can be reached, then cards in hand order until legal.
 */
async function drive(page: Page): Promise<boolean> {
  const dash = page.getByRole('region', { name: 'Your dashboard' });
  const turn = dash.getByRole('group', { name: 'Your turn' });
  if (await turn.isVisible()) {
    const next = turn.getByRole('button', { name: /^(Take it|Continue|Finish turn)/ }).first();
    // The bar may change or be busy between checks: never wait on it for long.
    if (!(await next.isEnabled({ timeout: 1000 }).catch(() => false))) return false;
    await next.click({ timeout: 2000 }).catch(() => {});
    return true;
  }
  const lock = dash.getByRole('button', { name: /^Lock in/ });
  if (!(await lock.isVisible()) || !(await page.locator('.status.mine').count())) return false;
  const gears = dash.getByRole('radio');
  const hand = dash.getByRole('list', { name: /Your hand/ }).getByRole('button');
  // Tap only unpressed cards, so a tap that lands while an earlier ack is in flight never toggles a card back off.
  const fill = async (gear: number) => {
    await gears.nth(gear - 1).check({ force: true });
    for (let i = 0; i < (await hand.count()); i++) {
      if ((await hand.and(page.getByRole('button', { pressed: true })).count()) >= gear) break;
      // Fanned cards overlap and rotate, so pick them by keyboard: no hit-testing, and it covers keyboard play.
      if ((await hand.nth(i).getAttribute('aria-pressed')) !== 'true') await hand.nth(i).press('Enter');
    }
    return expect(lock).toBeEnabled({ timeout: 3000 }).then(() => true, () => false);
  };
  // A clogged hand can only limp, and that plan is ready as it stands.
  let ok = /limp/.test((await lock.textContent()) ?? '') && (await lock.isEnabled());
  // Highest reachable gear first; too few playable cards for it means trying the next one down.
  for (const g of [4, 3, 2, 1]) if (!ok && (await gears.nth(g - 1).isEnabled())) ok = await fill(g);
  if (!ok) return false;
  const before = await page.locator('.title .sub').textContent();
  if (!(await lock.click({ timeout: 5000 }).then(() => true, () => false))) return false;
  // Either the plan waits for the others, or (against computer cars only) the turns begin at once.
  await expect
    .poll(async () => (await dash.getByRole('button', { name: 'Take back' }).isVisible()) || (await turn.isVisible()) || /is driving/.test((await page.locator('.status').textContent()) ?? '') || (await page.locator('.title .sub').textContent()) !== before || (await page.getByRole('heading', { name: 'Results' }).isVisible()))
    .toBe(true);
  return true;
}

test.describe('Apex ’66', () => {
  // The table re-renders under the helper as rounds resolve: a vanished element should fail fast, not hang.
  test.use({ actionTimeout: 5000 });

  test('a solo race from the grid to the replay, on desktop', async ({ browser }) => {
    test.setTimeout(180_000);
    const a = await newPlayer(browser, 'Ada', DESKTOP);
    await openTable([a], async (page) => {
      await page.getByRole('radio', { name: /^Solo/ }).check();
      await laps1(page);
      await page.getByLabel('Cars on the grid').selectOption('4');
    });
    const page = a.page;
    if (await page.getByRole('button', { name: 'To the grid' }).isVisible()) await page.getByRole('button', { name: 'To the grid' }).click();
    await shot(a, 'desktop-grid');
    // Take back is the only undo, and only before the reveal.
    await drive(page);
    await shot(a, 'desktop-locked');
    const until = Date.now() + 150_000;
    for (let i = 0; Date.now() < until && !(await page.getByRole('heading', { name: 'Results' }).isVisible()); i++) {
      if (!(await drive(page).catch(() => false))) await page.waitForTimeout(100);
      if (i === 3) await shot(a, 'desktop-mid');
    }
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    await shot(a, 'desktop-results');
    // A single race ends the table at once: the sheet offers a rematch rather than Continue.
    await expect(page.getByRole('button', { name: 'Race again' })).toBeVisible();
    await page.getByRole('button', { name: 'Watch the replay' }).click();
    const replay = page.getByRole('dialog', { name: 'Replay' });
    await expect(replay.getByText(/the grid of \d+/)).toBeVisible();
    await replay.getByRole('slider').fill('2');
    await expect(replay.getByText(/after round 2 of/)).toBeVisible();
    await shot(a, 'desktop-replay');
    expect(a.errors).toEqual([]);
  });

  test('two drivers plan in secret on phones, retract, and the host hands an absent car to the computer', async ({ browser }) => {
    test.setTimeout(120_000);
    const a = await newPlayer(browser, 'Ada', PHONE);
    const b = await newPlayer(browser, 'Bo', PHONE);
    await openTable([a, b], laps1);
    for (const p of [a, b]) if (await p.page.getByRole('button', { name: 'To the grid' }).isVisible()) await p.page.getByRole('button', { name: 'To the grid' }).click();
    await shot(a, 'phone-grid');
    await drive(a.page);
    // Ada's plan is hidden from Bo: he only sees that it is locked.
    await expect(b.page.getByText('Waiting for')).toHaveCount(0);
    await a.page.getByRole('button', { name: 'Take back' }).click();
    await expect(a.page.getByRole('button', { name: /^Lock in/ })).toBeVisible();
    await drive(a.page);
    await expect(a.page.getByRole('status').filter({ hasText: 'Waiting for Bo' })).toBeVisible();
    await shot(a, 'phone-locked');
    await b.page.context().close();
    const hand = a.page.getByRole('button', { name: /Let the computer drive for Bo/ });
    await expect(hand).toBeVisible({ timeout: 20_000 });
    await hand.click();
    await expect(a.page.getByRole('application', { name: /round 2|lap/ })).toBeVisible();
    await expect(a.page.locator('.status.mine')).toBeVisible({ timeout: 15_000 });
    expect(a.errors).toEqual([]);
  });

  test('the rules open from the table and Driving School coaches', async ({ browser }) => {
    const a = await newPlayer(browser, 'Ada', DESKTOP);
    await openTable([a], (page) => page.getByRole('radio', { name: /^Driving School/ }).check());
    await expect(a.page.getByRole('region', { name: /Coach/ })).toContainText('Gears');
    await a.page.getByRole('button', { name: 'Got it' }).click();
    await a.page.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(a.page.getByRole('dialog', { name: 'Apex ’66' }).getByRole('button', { name: 'Corners' })).toBeVisible();
    await shot(a, 'desktop-school');
    expect(a.errors).toEqual([]);
  });
});
