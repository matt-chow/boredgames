import { expect, test, type Page } from '@playwright/test';

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 700 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
];

const open = (page: Page, game: string) => page.getByRole('button', { name: `Open Table: ${game}` });

async function noSideScroll(page: Page) {
  const r = await page.evaluate(() => {
    const hub = document.querySelector('.hub')!;
    return { doc: document.documentElement.scrollWidth - innerWidth, hub: hub.scrollWidth - hub.clientWidth };
  });
  expect(r.doc).toBeLessThanOrEqual(0);
  expect(r.hub).toBeLessThanOrEqual(0);
}

test.describe('the home page', () => {
  for (const size of SIZES)
    test(`every game card is whole and reachable at ${size.width}x${size.height}, with 24 extra games`, async ({ page }) => {
      test.skip(!!process.env.E2E_BASE_URL, 'the ?games fixture exists only on the dev server');
      await page.setViewportSize(size);
      await page.goto('/?games=24');
      const cards = page.locator('.games .feature');
      await expect(cards).toHaveCount(28); // two games, the coming-soon entry, the bench, 24 samples
      await noSideScroll(page);
      for (const card of await cards.all()) {
        await card.scrollIntoViewIfNeeded();
        const b = (await card.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(size.width);
      }
      await noSideScroll(page);
    });

  test('each game fans its own cards, never the other game’s', async ({ page }) => {
    await page.goto('/');
    const bean = page.locator('.feature', { hasText: 'Bohnanza' });
    const kingdom = page.locator('.feature', { hasText: 'Kingdom & Commerce' });
    await expect(bean.locator('[data-bean]')).toHaveCount(5);
    await expect(bean.locator('.dc')).toHaveCount(0);
    await expect(kingdom.locator('.dc.face')).toHaveCount(5);
    await expect(kingdom.locator('[data-bean]')).toHaveCount(0);
    await expect(kingdom.locator('.dc .art :is(svg, img)').first()).toBeVisible();
  });

  test('the fan stays inside its card and simplifies on a narrow phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    const kingdom = page.locator('.feature', { hasText: 'Kingdom & Commerce' });
    await expect(kingdom.locator('.dc.face')).toHaveCount(3);
    const button = (await open(page, 'Kingdom & Commerce').boundingBox())!;
    const card = (await kingdom.boundingBox())!;
    expect(button.width).toBeGreaterThan(card.width * 0.8);
    await noSideScroll(page);
  });

  test('the theme of a fan does not reach the page around it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-fan] .dc').first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(22, 17, 13)');
    expect(await page.locator('.hub').evaluate((el) => getComputedStyle(el).getPropertyValue('--sprout').trim())).toBe('#c9e04a');
  });

  test('a long name wraps, and a game without a fan draws blank cards', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'the ?games fixture exists only on the dev server');
    await page.goto('/?games=1');
    const sample = page.locator('.feature', { hasText: 'A very long sample' });
    await expect(sample.locator('.blank')).toHaveCount(3);
    await noSideScroll(page);
  });

  test('keyboard: tab to Open Table, open it, close it, and focus returns', async ({ page }) => {
    await page.goto('/');
    const button = open(page, 'Kingdom & Commerce');
    await button.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('a coming-soon game says so and offers no way to make a room', async ({ page }) => {
    await page.goto('/');
    const soon = page.locator('.feature', { hasText: 'Next game' });
    await expect(soon.getByText('Coming soon')).toBeVisible();
    await expect(soon.getByRole('button')).toHaveCount(0);
  });

  test('each panel lists its own setup, and needs a name before creating', async ({ page }) => {
    await page.goto('/');
    await open(page, 'Bohnanza').click();
    let panel = page.getByRole('dialog', { name: 'Bohnanza' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText('The Field Bean')).toBeVisible();
    await expect(panel.getByText('Market codes')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Create room' }).click();
    await expect(panel.getByRole('alert')).toContainText('name');
    await page.keyboard.press('Escape');

    await open(page, 'Kingdom & Commerce').click();
    panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText(/Market codes/)).toBeVisible();
    await expect(panel.getByText('The Field Bean')).toHaveCount(0);
  });

  test('creating from a panel seats you in that game, and the home page then offers the way back', async ({ page }) => {
    await page.goto('/');
    await open(page, 'Kingdom & Commerce').click();
    await page.fill('#name', 'Ana');
    await page.getByRole('button', { name: 'Create room' }).click();
    await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
    const code = page.url().split('/').pop()!;

    await page.goto('/');
    const row = page.locator('.resume').getByRole('button', { name: new RegExp(code) });
    await expect(row).toContainText('Kingdom & Commerce');
    await expect(row).toContainText('Waiting');

    // Listed under its own game only.
    await open(page, 'Kingdom & Commerce').click();
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toBeVisible();
    await page.keyboard.press('Escape');
    await open(page, 'Bohnanza').click();
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await row.click();
    await page.waitForURL(new RegExp(`/r/${code}$`));
    await expect(page.getByText('Ana (you)')).toBeVisible();
  });
});
