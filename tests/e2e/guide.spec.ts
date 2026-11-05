import { expect, test, type Page } from '@playwright/test';
import { PHONE, newPlayer, startTable } from './helpers';

// The three-level guides: from the pre-game panel, the ? menu and the contextual ? on the table.

test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});

const SHOTS = process.env.GUIDE_SHOTS;
const dialog = (page: Page) => page.getByRole('dialog');

async function kingdomTable(page: Page, name: string) {
  await page.goto('/');
  const code = await page.evaluate(async (name) => {
    const r = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gameId: 'clockwork', name, bots: 1 }),
    });
    return ((await r.json()) as { code: string }).code;
  }, name);
  await page.goto(`/r/${code}`);
  await page.getByRole('button', { name: 'Start the game' }).click();
  await expect(page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });
}

test('GUIDE-E1: the panel opens the full guide, with levels, search and Escape', async ({ browser }) => {
  const p = await newPlayer(browser, 'Ada');
  await p.page.goto('/');
  await p.page.getByRole('button', { name: /^Open Table: Bohnanza/ }).click();
  await p.page.getByText('How to play', { exact: false }).first().click();
  await p.page.getByRole('button', { name: 'Open the full guide' }).click();
  const d = dialog(p.page).last();
  await expect(d.getByRole('button', { name: 'Quick reference' })).toHaveAttribute('aria-pressed', 'true');
  await d.getByRole('button', { name: 'How to play' }).click();
  await d.getByRole('searchbox').fill('forced harvest');
  await expect(d.getByRole('status')).toContainText('found');
  await d.getByRole('searchbox').fill('zzzzz');
  await expect(d.getByRole('status')).toContainText('Nothing found');
  // Escape clears a search first, as every search box does, then closes only the guide.
  await p.page.keyboard.press('Escape');
  await expect(d.getByRole('searchbox')).toHaveValue('');
  await p.page.keyboard.press('Escape');
  await expect(p.page.getByRole('searchbox')).toBeHidden();
  await expect(p.page.getByRole('button', { name: 'Create room' })).toBeVisible();
  expect(p.errors).toEqual([]);
});

test('GUIDE-E2: Kingdom & Commerce help opens at the current step, and the ? menu opens the guide', async ({ browser }) => {
  const p = await newPlayer(browser, 'Ada');
  await kingdomTable(p.page, 'Ada');
  const ctx = p.page.getByRole('button', { name: 'Explain this step' });
  await expect(ctx).toBeVisible({ timeout: 15_000 });
  await ctx.click();
  const d = dialog(p.page).last();
  await expect(d.locator('details[open]').first()).toBeVisible();
  // A second open section stays open: the contextual link must not fight the reader.
  const summary = d.locator('details:not([open]) summary').first();
  await summary.click();
  await expect(d.locator('details[open]')).toHaveCount(2);
  await p.page.keyboard.press('Escape');
  await p.page.getByRole('button', { name: 'How to play' }).click();
  await expect(dialog(p.page).last().getByRole('searchbox')).toBeVisible();
  expect(p.errors).toEqual([]);
});

test('GUIDE-E3: Bohnanza help opens from the table', async ({ browser }) => {
  const players = [await newPlayer(browser, 'Ada'), await newPlayer(browser, 'Bea'), await newPlayer(browser, 'Cy')];
  await startTable(players);
  const page = players[0].page;
  await page.getByRole('button', { name: 'Explain this step' }).click();
  await expect(dialog(page).last().locator('details[open]').first()).toBeVisible();
  for (const x of players) expect(x.errors).toEqual([]);
});

test('GUIDE-E5: the room’s guide states the rules chosen for it, in the lobby and at the table', async ({ browser }) => {
  const p = await newPlayer(browser, 'Ada');
  await p.page.goto('/');
  const code = await p.page.evaluate(async () => {
    const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'clockwork', name: 'Ada', bots: 1 }) });
    return ((await r.json()) as { code: string }).code;
  });
  await p.page.goto(`/r/${code}`);
  await p.page.getByRole('button', { name: 'How to play' }).click();
  let d = dialog(p.page).last();
  await expect(d.locator('#guide-q-end')).toBeVisible();
  await d.locator('#guide-q-end summary').click();
  await expect(d.locator('#guide-q-end')).toContainText('All 5 Crown Projects');
  await p.page.keyboard.press('Escape');
  const pick = p.page.locator('[data-edition]');
  if (await pick.count()) {
    await pick.selectOption('F2');
    await expect(pick).toHaveValue('F2');
    await p.page.getByRole('button', { name: 'How to play' }).click();
    d = dialog(p.page).last();
    await expect(d).toContainText('Trial F2');
    await d.locator('#guide-q-end summary').click();
    await expect(d.locator('#guide-q-end')).toContainText('All 5');
    await p.page.keyboard.press('Escape');
  }
  await p.page.getByRole('button', { name: 'Start the game' }).click();
  await expect(p.page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });
  await p.page.locator('[data-project-help]').click();
  d = dialog(p.page).last();
  await expect(d.locator('#guide-f-projects')).toHaveAttribute('open', '');
  await expect(d.locator('#guide-f-projects')).toContainText('1 stage');
  expect(p.errors).toEqual([]);
});

test('GUIDE-E4: the guide fits a phone', async ({ browser }) => {
  const p = await newPlayer(browser, 'Ada', PHONE);
  await kingdomTable(p.page, 'Ada');
  await p.page.getByRole('button', { name: 'Explain this step' }).click();
  const d = dialog(p.page).last();
  await expect(d.getByRole('searchbox')).toBeVisible();
  const box = (await d.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await p.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (SHOTS) await p.page.screenshot({ path: `${SHOTS}/guide-phone.png` });
  expect(p.errors).toEqual([]);
});
