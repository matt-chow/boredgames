import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 700 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
];

const centre = (page: Page) => page.locator('.row.on');
const live = (page: Page) => page.locator('.wheel ~ [aria-live]');
/** The rail's dots are visually hidden on narrow screens but stay in the accessibility tree. */
const show = (page: Page, game: string) => page.getByRole('button', { name: `Show ${game}`, exact: true }).dispatchEvent('click');

async function noSideScroll(page: Page) {
  const r = await page.evaluate(() => {
    const hub = document.querySelector('.hub')!;
    return { doc: document.documentElement.scrollWidth - innerWidth, hub: hub.scrollWidth - hub.clientWidth };
  });
  expect(r.doc).toBeLessThanOrEqual(0);
  expect(r.hub).toBeLessThanOrEqual(0);
}

test.describe('the home wheel', () => {
  for (const size of SIZES)
    test(`fits ${size.width}x${size.height} with 24 extra games, drawing only the rows near the centre`, async ({ page }) => {
      test.skip(!!process.env.E2E_BASE_URL, 'the ?games fixture exists only on the dev server');
      await page.setViewportSize(size);
      await page.goto('/?games=24');
      await expect(page.getByRole('navigation', { name: 'All games' }).getByRole('button')).toHaveCount(33); // seven games, coming soon, the bench, 24 samples
      expect(await page.locator('.row').count()).toBeLessThanOrEqual(11);
      await noSideScroll(page);
      const button = page.getByRole('button', { name: 'Open Table: Bohnanza' });
      await button.scrollIntoViewIfNeeded();
      const b = (await button.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(size.width);
      expect(b.height).toBeGreaterThanOrEqual(44);
    });

  test('each game fans its own cards in the centre, never another game’s', async ({ page }) => {
    await page.goto('/');
    await expect(centre(page).locator('[data-bean]')).toHaveCount(5);
    await expect(centre(page).locator('.dc')).toHaveCount(0);
    await show(page, 'Kingdom & Commerce');
    await expect(centre(page).locator('.dc.face')).toHaveCount(5);
    await expect(centre(page).locator('[data-bean]')).toHaveCount(0);
    await expect(centre(page).locator('.dc .art :is(svg, img)').first()).toBeVisible();
  });

  test('on a narrow phone the fan simplifies and Open Table spans the card', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await show(page, 'Kingdom & Commerce');
    await expect(centre(page).locator('.dc.face')).toHaveCount(3);
    const button = (await page.getByRole('button', { name: 'Open Table: Kingdom & Commerce' }).boundingBox())!;
    const card = (await centre(page).locator('.sheet').boundingBox())!;
    expect(button.width).toBeGreaterThan(card.width * 0.8);
    await noSideScroll(page);
  });

  test('the theme of a fan does not reach the page around it', async ({ page }) => {
    await page.goto('/');
    await show(page, 'Kingdom & Commerce');
    await expect(page.locator('[data-fan] .dc').first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(22, 17, 13)');
    expect(await page.locator('.hub').evaluate((el) => getComputedStyle(el).getPropertyValue('--sprout').trim())).toBe('#c9e04a');
  });

  test('a game without a fan draws blank cards', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'the ?games fixture exists only on the dev server');
    await page.goto('/?games=1');
    await show(page, 'A very long sample game title that keeps on going, number 0');
    await expect(centre(page).locator('.blank')).toHaveCount(3);
    await noSideScroll(page);
  });

  test('keys turn it round in a loop, and Enter opens only the game in the centre', async ({ page }) => {
    await page.goto('/');
    const wheel = page.getByRole('region', { name: /^Games/ });
    await wheel.focus();
    await page.keyboard.press('ArrowUp');
    await expect(live(page)).toHaveText(/, (\d+) of \1$/); // up from the first is the last
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(live(page)).toHaveText(/^Kingdom & Commerce, 2 of/);
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(wheel).toBeFocused();

    // Tab reaches the centre game's Open Table, and focus comes back to it.
    await page.keyboard.press('Tab');
    const button = page.getByRole('button', { name: 'Open Table: Kingdom & Commerce' });
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  });

  test('clicking another row only turns to it', async ({ page }) => {
    await page.goto('/');
    await page.locator('.row:not(.on) .pick').first().click();
    await expect(live(page)).not.toHaveText(/^Bohnanza,/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a drag that starts on Open Table turns the wheel and opens nothing', async ({ page }) => {
    await page.goto('/');
    const b = (await page.getByRole('button', { name: 'Open Table: Bohnanza' }).boundingBox())!;
    const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(x, y - i * 25);
    await page.mouse.up();
    await expect(live(page)).not.toHaveText(/^Bohnanza,/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('remembers the centre game and the chosen view; a tile turns the wheel without changing the view', async ({ page }) => {
    await page.goto('/');
    await show(page, 'Palazzo');
    await expect(live(page)).toHaveText(/^Palazzo,/);
    await page.reload();
    await expect(live(page)).toHaveText(/^Palazzo,/);

    await page.getByRole('button', { name: 'Gallery' }).click();
    const tile = page.getByRole('list', { name: 'Games' }).getByRole('button', { name: /^Dead Drop/ });
    await tile.click();
    await expect(live(page)).toHaveText(/^Dead Drop,/);
    await expect(page.getByRole('button', { name: 'Wheel' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload(); // the gallery was the person's choice; the tile was not
    await expect(tile).toHaveAttribute('aria-current', 'true');
    await page.getByRole('button', { name: 'Wheel' }).click();
    await page.reload();
    await expect(live(page)).toHaveText(/^Dead Drop,/);
  });

  test('a coming-soon game says so and offers no way to make a room', async ({ page }) => {
    await page.goto('/');
    await show(page, 'Next game');
    await expect(centre(page).getByText('Coming soon')).toBeVisible();
    await expect(centre(page).getByRole('button')).toHaveCount(0);
  });

  test('each panel lists its own setup, and needs a name before creating', async ({ page }) => {
    await page.goto('/');
    await openGame(page, 'Bohnanza');
    let panel = page.getByRole('dialog', { name: 'Bohnanza' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText('The Field Bean')).toBeVisible();
    await expect(panel.getByText('Market codes')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Create room' }).click();
    await expect(panel.getByRole('alert')).toContainText('name');
    await page.keyboard.press('Escape');

    await openGame(page, 'Kingdom & Commerce');
    panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText(/Market codes/)).toBeVisible();
    await expect(panel.getByText('The Field Bean')).toHaveCount(0);
  });

  test('creating from a panel seats you in that game, and the home page then offers the way back', async ({ page }) => {
    await page.goto('/');
    await openGame(page, 'Kingdom & Commerce');
    await page.fill('#name', 'Ana');
    await page.getByRole('button', { name: 'Create room' }).click();
    await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
    const code = page.url().split('/').pop()!;

    await page.goto('/');
    const chip = page.getByRole('button', { name: `Resume Kingdom & Commerce, room ${code}, waiting` });
    await expect(chip).toBeVisible();

    // Every room, finished or not, is behind All rooms.
    await page.getByRole('button', { name: /^All rooms/ }).click();
    await expect(page.getByRole('dialog', { name: 'Your rooms on this device' }).getByRole('button', { name: new RegExp(code) })).toBeVisible();
    await page.keyboard.press('Escape');

    // Listed under its own game only.
    await openGame(page, 'Kingdom & Commerce');
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toBeVisible();
    await page.keyboard.press('Escape');
    await openGame(page, 'Bohnanza');
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await chip.click();
    await page.waitForURL(new RegExp(`/r/${code}$`));
    await expect(page.getByText('Ana (you)')).toBeVisible();
  });
});
