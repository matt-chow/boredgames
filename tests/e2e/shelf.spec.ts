import { expect, test, type Page } from '@playwright/test';

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 700 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
];

async function noSideScroll(page: Page) {
  const r = await page.evaluate(() => {
    const hub = document.querySelector('.hub')!;
    return { doc: document.documentElement.scrollWidth - innerWidth, hub: hub.scrollWidth - hub.clientWidth };
  });
  expect(r.doc).toBeLessThanOrEqual(0);
  expect(r.hub).toBeLessThanOrEqual(0);
}

test.describe('the shelf', () => {
  for (const size of SIZES)
    test(`every box is whole and reachable at ${size.width}x${size.height}, with 24 extra games`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/?shelf=24');
      const boxes = page.locator('.case .box');
      await expect(boxes).toHaveCount(28); // two games, the kept space, the bench, 24 samples
      await noSideScroll(page);
      for (const box of await boxes.all()) {
        await box.scrollIntoViewIfNeeded();
        const b = (await box.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(size.width);
        expect(b.y + b.height).toBeGreaterThan(0);
        expect(b.y).toBeLessThan(size.height);
      }
      await noSideScroll(page);
    });

  test('phones show two readable columns', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const [a, b] = await Promise.all([page.locator('.case .box').nth(0).boundingBox(), page.locator('.case .box').nth(1).boundingBox()]);
    expect(a!.y).toBe(b!.y);
    expect(a!.width).toBeGreaterThan(130);
    await expect(page.locator('.case .title').first()).toBeVisible();
  });

  test('a missing cover still draws the box and its title', async ({ page }) => {
    await page.goto('/?shelf=1');
    const sample = page.getByRole('button', { name: /^A very long sample/ });
    await expect(sample.locator('.plain')).toBeVisible();
  });

  test('keyboard: tab to a box, open it, close it, and focus returns', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('button', { name: /^Kingdom & Commerce,/ });
    await box.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(box).toBeFocused();
  });

  test('a coming-soon box opens details but no way to make a room', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Next game,/ }).click();
    const panel = page.getByRole('dialog', { name: 'Next game' });
    await expect(panel.getByText('Coming soon')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Create room' })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Join' })).toHaveCount(0);
  });

  test('each panel lists its own setup, and needs a name before creating', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Bohnanza,/ }).click();
    let panel = page.getByRole('dialog', { name: 'Bohnanza' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText('The Field Bean')).toBeVisible();
    await expect(panel.getByText('Market codes')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Create room' }).click();
    await expect(panel.getByRole('alert')).toContainText('name');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Kingdom & Commerce,/ }).click();
    panel = page.getByRole('dialog', { name: 'Kingdom & Commerce' });
    await panel.getByText('Room setup').click();
    await expect(panel.getByText(/Market codes/)).toBeVisible();
    await expect(panel.getByText('The Field Bean')).toHaveCount(0);
  });

  test('creating from a panel seats you in that game, and the shelf then offers the way back', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Kingdom & Commerce,/ }).click();
    await page.fill('#name', 'Ana');
    await page.getByRole('button', { name: 'Create room' }).click();
    await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
    const code = page.url().split('/').pop()!;

    await page.goto('/');
    const row = page.locator('.resume').getByRole('button', { name: new RegExp(code) });
    await expect(row).toContainText('Kingdom & Commerce');
    await expect(row).toContainText('Waiting');

    // Listed under its own game only.
    await page.getByRole('button', { name: /^Kingdom & Commerce,/ }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Bohnanza,/ }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: new RegExp(code) })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await row.click();
    await page.waitForURL(new RegExp(`/r/${code}$`));
    await expect(page.getByText('Ana (you)')).toBeVisible();
  });
});
