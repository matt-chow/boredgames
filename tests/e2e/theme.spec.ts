import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

// Each game's look stays in its own rooms, whichever order they are visited in.

test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});

async function room(page: Page, gameId: string) {
  await page.goto('/');
  const code = await page.evaluate(async (gameId) => {
    const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', gameId, bots: 1 }) });
    return ((await r.json()) as { code: string }).code;
  }, gameId);
  await page.goto(`/r/${code}`);
  await expect(page.getByText('Ada (you)')).toBeVisible({ timeout: 15_000 });
}

const token = (page: Page, selector: string, name: string) => page.locator(selector).first().evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), name);

test('KC-THEME-1: Kingdom & Commerce is themed in its rooms, and nothing reaches the hub or Bohnanza', async ({ browser }) => {
  const { page } = await newPlayer(browser, 'Ada');

  await room(page, 'clockwork');
  await expect.poll(() => token(page, '[data-game-theme="clockwork"] > *', '--ground-1')).toBe('#261d23');
  expect(await token(page, 'body', '--ground-1')).toBe('#16110d');
  await page.getByRole('button', { name: 'Start the game' }).click();
  await expect(page.locator('.tile').first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.locator('.table').first().evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('repeating-linear-gradient');

  // In one page, so the theme's stylesheet is still loaded when the hub comes back.
  await page.evaluate(() => {
    history.pushState({}, '', '/');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('.hub')).toBeVisible();
  await expect(page.locator('[data-game-theme="clockwork"]:not([data-fan])')).toHaveCount(0);
  expect(await token(page, '.hub', '--sprout')).toBe('#c9e04a');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(22, 17, 13)');

  await room(page, 'bohnanza');
  expect(await token(page, '[data-game-theme="bohnanza"] > *', '--ground-1')).toBe('#16110d');
  expect(await token(page, '[data-game-theme="bohnanza"] > *', '--sprout')).toBe('#c9e04a');
  expect(await token(page, '[data-game-theme="bohnanza"] > *', '--card-face')).toBe('');
});
