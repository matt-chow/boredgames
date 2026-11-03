import { expect, test } from '@playwright/test';
import { PHONE, botStep, newPlayer } from './helpers';

test('one player practises against bots: the home page seats them, the lobby adds one, and the bots take their turns', async ({ browser }) => {
  test.setTimeout(6 * 60_000);
  const ana = await newPlayer(browser, 'Ana', PHONE);
  const { page } = ana;
  await page.goto('/');
  await page.fill('#name', 'Ana');
  await page.getByRole('button', { name: /Practise with bots/ }).click();
  await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);

  // Bohnanza needs three players, so two bots are already seated.
  await expect(page.getByText('Ana (you)')).toBeVisible();
  await expect(page.getByText('Bot Ada')).toBeVisible();
  await expect(page.getByText('Bot Bix')).toBeVisible();
  await page.getByRole('button', { name: /Add a bot/ }).click();
  await expect(page.getByText('Bot Cog')).toBeVisible();

  await page.getByRole('button', { name: 'Start the game' }).click();
  await expect(page.locator('.table .turn')).toBeVisible();

  // Play Ana's turns through the UI until the turn has come back to her twice:
  // each return means all three bots finished a turn on their own.
  let returns = 0;
  let mine = await page.locator('.turn.you').count() > 0;
  const deadline = Date.now() + 5 * 60_000;
  while (returns < 2) {
    if (Date.now() > deadline) throw new Error(`Bots stalled: ${await page.locator('.step').innerText()}`);
    const now = await page.locator('.turn.you').count() > 0;
    if (now && !mine) returns++;
    mine = now;
    const did = await botStep(ana);
    await page.waitForTimeout(did ? 60 : 250);
  }
  expect(ana.errors).toEqual([]);
});
