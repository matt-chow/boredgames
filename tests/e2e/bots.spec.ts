import { expect, test } from '@playwright/test';
import { PHONE, botStep, newPlayer } from './helpers';

test('one player practises against bots: the home page seats them, the lobby adds one, and the bots take their turns', async ({ browser }) => {
  test.setTimeout(6 * 60_000);
  const ana = await newPlayer(browser, 'Ana', PHONE);
  const { page } = ana;
  await page.goto('/');
  await page.fill('#name', 'Ana');
  await page.getByRole('article', { name: 'Bohnanza' }).getByRole('button', { name: /Practise with bots/ }).click();
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

test('panning the table selects no text, and an offer started from a card asks who it is for', async ({ browser }) => {
  test.setTimeout(3 * 60_000);
  const ana = await newPlayer(browser, 'Ana');
  const { page } = ana;
  await page.goto('/');
  await page.fill('#name', 'Ana');
  await page.getByRole('article', { name: 'Bohnanza' }).getByRole('button', { name: /Practise with bots/ }).click();
  await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  await page.getByRole('button', { name: 'Start the game' }).click();
  await expect(page.locator('.table .turn')).toBeVisible();

  // A leftover selection on the table (Firefox keeps one) must not turn the next pan into a drag of that text.
  await page.evaluate(() => {
    const r = document.createRange();
    r.selectNodeContents(document.querySelector('.viewport')!);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(r);
  });
  const plane = () => page.evaluate(() => getComputedStyle(document.querySelector('.viewport')!.firstElementChild!).transform);
  const before = await plane();
  const b = (await page.getByText(/in deck/).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 220, b.y + 120, { steps: 10 });
  await page.mouse.up();
  await expect.poll(plane).not.toBe(before);
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');

  // On Ana's turn: plant, turn over, then tap a hand card without choosing a recipient first.
  await expect(page.locator('.turn.you')).toBeVisible({ timeout: 2 * 60_000 });
  const tradeOpen = page.locator('.trade .new button');
  while (!(await tradeOpen.count())) {
    const did = await botStep(ana);
    await page.waitForTimeout(did ? 60 : 250);
  }
  await page.locator('.hand .slot').first().click();
  const slip = page.locator('.slip.draft');
  await expect(slip.locator('.recipient')).toHaveCount(2);
  await expect(slip.locator('.recipient[aria-pressed="true"]')).toHaveCount(0);
  await expect(slip.getByRole('button', { name: /^Send/ })).toBeDisabled();
  await slip.getByRole('button', { name: 'Bot Bix' }).click();
  await expect(slip.locator('.kind')).toContainText('to Bot Bix');
  await slip.getByRole('button', { name: /^Send/ }).click();
  await expect(page.locator('.slip.draft')).toHaveCount(0);
  await expect(page.locator('.offers')).toContainText('Bot Bix');
  expect(ana.errors).toEqual([]);
});
