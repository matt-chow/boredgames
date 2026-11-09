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

/** The feed's rows as text, oldest first. */
const feed = (p: Player) => p.page.locator('.activity .feed li:not(.empty)').allInnerTexts();

test('MS-E2E-3: the tabletop in Expanded: fans, deck, turn, activity and chat, drag to discard, and a reload without repeats', async ({ browser }) => {
  test.setTimeout(150_000);
  const a = await newPlayer(browser, 'Dot', DESKTOP);
  const b = await newPlayer(browser, 'Eli', PHONE);
  const code = await openTable(a);
  await b.page.goto(`/r/${code}`);
  await b.page.fill('#jname', b.name);
  await b.page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(b.page.getByText(`${b.name} (you)`)).toBeVisible({ timeout: 15_000 });
  await a.page.getByRole('button', { name: 'Add a bot' }).click();
  await a.page.getByRole('radio', { name: /Expanded Mining/ }).click();
  await a.page.getByRole('button', { name: 'Start the game' }).click();
  for (const p of [a, b]) await expect(p.page.locator('.meta .mode')).toHaveText('Expanded Mining');

  // Opponents' hands are face-down fans with the true count; the deck says how many cards are left.
  const hand = await a.page.locator('.hand .card').count();
  await expect(b.page.getByRole('img', { name: `${hand} cards in hand` }).first()).toBeVisible();
  await expect(a.page.locator('.seats .fan')).toHaveCount(2);
  const deck = Number((await a.page.locator('.meta').innerText()).match(/Deck (\d+)/)![1]);
  await expect(a.page.locator('.piles .count').first()).toHaveText(`${deck} cards remaining`);

  // Whose turn it is, in words; the next player is named too.
  await expect(a.page.locator('.seat.up .state')).toContainText('Playing');
  await expect(a.page.locator('.seats .state', { hasText: /^(Next|You're next)$/ })).toHaveCount(1);

  // Chat lands in Mine Activity for everyone, the filters split it from the log, and a hidden feed counts it unread.
  await expect(b.page.getByRole('button', { name: /Role & activity/ })).toBeVisible();
  await a.page.getByLabel('Chat message').fill('lanterns up');
  await a.page.getByRole('button', { name: 'Send' }).click();
  await expect(b.page.locator('.tabs .badge')).toHaveText('1');
  await b.page.getByRole('button', { name: /Role & activity/ }).click();
  await expect(b.page.locator('.tabs .badge')).toHaveCount(0);
  await expect(b.page.locator('.activity .chat', { hasText: 'lanterns up' })).toBeVisible();
  await a.page.getByRole('radio', { name: 'Log' }).click();
  await expect(a.page.locator('.activity .chat')).toHaveCount(0);
  await a.page.getByRole('radio', { name: 'Chat' }).click();
  await expect(a.page.locator('.activity .line')).toHaveCount(0);
  await expect(a.page.locator('.activity .chat')).toHaveCount(1);
  await a.page.getByRole('radio', { name: 'All' }).click();
  await b.page.getByRole('button', { name: /^Mine$/ }).click();

  // Play until Dot has dragged a card onto the discard pile, then a few more moves.
  let dragged = false;
  const end = Date.now() + 60_000;
  let moves = 0;
  while (Date.now() < end && (!dragged || moves < 6)) {
    const mine = /^Your turn/.test((await a.page.locator('.status').innerText()).trim());
    if (mine && !dragged && !(await a.page.locator('dialog[open]').count())) {
      const before = Number((await a.page.locator('.piles .count').nth(1).innerText()).match(/\d+/)![0]);
      const card = a.page.locator('.hand .cards li').first();
      const pile = a.page.locator('.piles .discard');
      const from = (await card.boundingBox())!;
      const to = (await pile.boundingBox())!;
      await a.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await a.page.mouse.down();
      await a.page.mouse.move(from.x + from.width / 2, from.y - 40, { steps: 4 });
      await a.page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
      await a.page.mouse.up();
      await expect(a.page.locator('.piles .count').nth(1)).toHaveText(`Discards ${before + 1}`);
      dragged = true;
      continue;
    }
    const did = (await step(a)) ?? (await step(b));
    if (did) moves++;
    await a.page.waitForTimeout(did ? 150 : 300);
  }
  expect(dragged).toBe(true);

  // The other player sees the same feed; a reload shows it again with every earlier line once, in the same order.
  await expect(a.page.locator('.activity .line', { hasText: /discarded/ }).first()).toBeVisible();
  await a.page.waitForTimeout(500);
  const rows = await feed(a);
  await a.page.reload();
  await expect(a.page.getByText('Only you can see this')).toBeVisible();
  await expect.poll(async () => (await feed(a)).length).toBeGreaterThanOrEqual(rows.length);
  const after = await feed(a);
  expect(after.slice(0, rows.length)).toEqual(rows);
  await shot(a, 'expanded-tabletop');
  await shot(b, 'expanded-phone');

  for (const p of [a, b]) {
    expect(leaks(p)).toEqual([]);
    expect(p.errors).toEqual([]);
  }
});
