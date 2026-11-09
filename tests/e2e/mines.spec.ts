import { expect, test } from '@playwright/test';
import { DESKTOP, newPlayer, PHONE, type Player } from './helpers';

/** Where the screenshots go. Set MS_SHOTS to keep them. */
const shot = async (p: Player, name: string) => {
  if (process.env.MS_SHOTS) await p.page.screenshot({ path: `${process.env.MS_SHOTS}/${name}.png` });
};

async function openTable(host: Player) {
  await host.page.goto('/');
  await host.page.getByRole('button', { name: /^Open Table: Miners & Saboteurs/ }).click();
  await host.page.fill('#name', host.name);
  await host.page.getByRole('button', { name: 'Create room' }).click();
  await host.page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  return host.page.url().split('/').pop()!;
}

/** No room view may carry another seat's hand or role (MS-ROOM8). */
function leaks(p: Player) {
  const bad: string[] = [];
  for (const f of p.frames as { t?: string; room?: { game?: { players?: Record<string, unknown>[] } } }[]) {
    if (f.t !== 'room' || !f.room?.game) continue;
    for (const pl of f.room.game.players ?? []) if ('role' in pl || typeof pl.hand !== 'number') bad.push(JSON.stringify(pl));
  }
  return bad;
}

/** One move by the person at this page: lay the first card that fits, else discard; answer any choice dialog. */
async function step(p: Player) {
  return p.page.evaluate(() => {
    const btn = (re: RegExp) => [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find((b) => !b.disabled && re.test(b.innerText));
    const next = btn(/Next round/);
    if (next) return next.click(), 'next';
    const gold = document.querySelector<HTMLButtonElement>('dialog[open] button.reward:not([disabled])');
    if (gold) return gold.click(), 'pick';
    const nobody = btn(/^Nobody$/);
    if (nobody) return nobody.click(), 'steal';
    if (!/^Your turn/.test(document.querySelector('.status')?.textContent?.trim() ?? '')) return null;
    const spot = document.querySelector<HTMLButtonElement>('.boardwrap .spot');
    if (spot) return spot.click(), 'lay';
    if (!document.querySelector('.hand .card.on')) {
      document.querySelector<HTMLButtonElement>('.hand .card')?.click();
      return 'select';
    }
    const discard = [...document.querySelectorAll<HTMLButtonElement>('.acts button')].find((b) => !b.disabled && /^Discard it/.test(b.innerText));
    if (discard) return discard.click(), 'discard';
    return null;
  });
}

test('MS-E2E-1: a classic round with two bots plays to the results, with nothing secret on the wire', async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await newPlayer(browser, 'Ada', DESKTOP);
  await openTable(host);
  const page = host.page;
  await expect(page.getByRole('radio', { name: /Classic Mining/ })).toHaveAttribute('aria-checked', 'true');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Add a bot' }).click();
  await page.getByLabel('Rounds').selectOption('1');
  await expect(page.getByLabel('Rounds')).toHaveValue('1');
  await page.getByRole('button', { name: 'Start the game' }).click();
  await expect(page.getByText('Only you can see this')).toBeVisible();
  await expect(page.locator('.rname')).toHaveText(/^(Miner|Saboteur)$/);
  await shot(host, 'classic-start');

  const final = page.getByRole('heading', { name: 'Final gold' });
  const end = Date.now() + 150_000;
  while (Date.now() < end && !(await final.count())) {
    const did = await step(host);
    await page.waitForTimeout(did ? 120 : 300);
  }
  await expect(final).toBeVisible();
  await shot(host, 'classic-results');
  await expect(page.getByRole('button', { name: 'Rematch' })).toBeVisible();
  expect(leaks(host)).toEqual([]);
  expect(host.errors).toEqual([]);
});

test('MS-E2E-2: two players see Expanded and the Duel offered alike, play the Duel, and use the help', async ({ browser }) => {
  const a = await newPlayer(browser, 'Bea', DESKTOP);
  const b = await newPlayer(browser, 'Cy', PHONE);
  const code = await openTable(a);
  await b.page.goto(`/r/${code}`);
  await b.page.fill('#jname', b.name);
  await b.page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(b.page.getByText(`${b.name} (you)`)).toBeVisible({ timeout: 15_000 });

  for (const name of [/Expanded Mining/, /Prospector Duel/]) {
    const r = a.page.getByRole('radio', { name });
    await expect(r).toBeEnabled();
    await expect(r).not.toContainText('not for 2');
  }
  await expect(a.page.getByRole('radio', { name: /Classic Mining/ })).toContainText('not for 2');
  // Only the host sets the table.
  await expect(b.page.getByRole('radio', { name: /Prospector Duel/ })).toBeDisabled();
  await shot(a, 'lobby-two');
  await a.page.getByRole('radio', { name: /Prospector Duel/ }).click();
  await expect(b.page.getByRole('radio', { name: /Prospector Duel/ })).toHaveAttribute('aria-checked', 'true');
  await a.page.getByRole('button', { name: 'Start the game' }).click();

  for (const p of [a, b]) await expect(p.page.locator('.meta .mode')).toHaveText('Prospector Duel');
  await expect(a.page.getByText(/No role in the Prospector Duel/)).toBeVisible();
  await shot(b, 'duel-phone');

  // The board view switch and the tutorial are local; the tutorial sends nothing.
  await a.page.getByRole('radio', { name: 'Deep mine' }).click();
  await expect(a.page.getByRole('radio', { name: 'Deep mine' })).toHaveAttribute('aria-checked', 'true');
  await shot(a, 'duel-deep');
  await a.page.getByRole('button', { name: 'Tutorial' }).click();
  await expect(a.page.getByRole('heading', { name: /Tutorial: 1 of 10/ })).toBeVisible();
  await a.page.getByRole('button', { name: 'Next' }).click();
  await expect(a.page.getByRole('heading', { name: /Tutorial: 2 of 10/ })).toBeVisible();
  await a.page.locator('dialog[open] .spot').first().click();
  await expect(a.page.getByText(/^Laid\./)).toBeVisible();
  await shot(a, 'tutorial');
  await a.page.getByRole('button', { name: 'Skip tutorial' }).click();
  await a.page.getByRole('button', { name: 'Cards' }).click();
  await expect(a.page.getByRole('heading', { name: 'Card encyclopedia' })).toBeVisible();
  await shot(a, 'cards');
  await a.page.keyboard.press('Escape');

  for (const p of [a, b]) {
    expect(leaks(p)).toEqual([]);
    expect(p.errors).toEqual([]);
  }
});
