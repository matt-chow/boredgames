import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, newPlayer, PHONE, type Player } from './helpers';

const LOC = { embassy: 'Embassy', station: 'Rail Station', hotel: 'Grand Hotel', harbour: 'Harbour' } as const;
const NAMES = Object.values(LOC);

/** Where the screenshots go. Set DD_SHOTS to keep them. */
const shot = async (p: Player, name: string) => {
  if (process.env.DD_SHOTS) await p.page.screenshot({ path: `${process.env.DD_SHOTS}/${name}.png` });
};

async function openTable(a: Player, b: Player) {
  await a.page.goto('/');
  await a.page.getByRole('button', { name: /^Open Table: Dead Drop/ }).click();
  await shot(a, 'panel');
  await a.page.fill('#name', a.name);
  await a.page.getByRole('button', { name: 'Create room' }).click();
  await a.page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = a.page.url().split('/').pop()!;
  await b.page.goto(`/r/${code}`);
  await b.page.fill('#jname', b.name);
  await b.page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(b.page.getByText(`${b.name} (you)`)).toBeVisible({ timeout: 15_000 });
  const start = a.page.getByRole('button', { name: 'Start the game' });
  await expect(start).toBeDisabled();
  await shot(a, 'lobby');
  // Double presses settle to one ready state each.
  for (const p of [a, b]) await p.page.getByRole('button', { name: 'I’m ready' }).click();
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of [a, b]) await expect(p.page.getByRole('heading', { name: 'Briefing' })).toBeVisible();
  return code;
}

const missions = async (p: Page) => (await p.locator('.mission .n').allTextContents()) as string[];

async function file(p: Player, kind: RegExp, where?: string) {
  await p.page.getByRole('radio', { name: kind }).click();
  if (where) await p.page.locator('.compose').getByRole('radio', { name: where, exact: true }).click();
  await p.page.getByRole('button', { name: 'File statement' }).click();
}

/** Both file and acknowledge, so the match reaches orders. */
async function brief(a: Player, b: Player, round: number) {
  for (const p of [a, b]) await expect(p.page.getByText(new RegExp(`^Round ${round}`)).first()).toBeVisible();
  const nothing = round === 1 ? /Nothing to report/ : /did not deliver/;
  await file(a, nothing);
  await file(b, nothing);
  for (const p of [a, b]) await p.page.getByRole('button', { name: /^Acknowledge/ }).click();
  for (const p of [a, b]) await expect(p.page.getByRole('heading', { name: 'Secret orders' })).toBeVisible();
}

async function order(p: Player, action: string, where: string, broadcast?: string) {
  await p.page.getByRole('radio', { name: new RegExp(`^${action}`) }).click();
  // A phone also offers the choice inside the panel; the board is a scroll away there.
  const near = p.page.getByRole('radiogroup', { name: 'Choose a location' });
  if (await near.isVisible()) await near.getByRole('radio', { name: where, exact: true }).click();
  else await p.page.locator('.board').getByRole('button', { name: new RegExp(where) }).click();
  if (broadcast) {
    await p.page.getByRole('checkbox', { name: /Spend Cover/ }).check();
    await p.page.getByRole('radiogroup', { name: 'False location to broadcast' }).getByRole('radio', { name: broadcast }).click();
  }
  await p.page.getByRole('button', { name: 'Review orders' }).click();
  await p.page.getByRole('button', { name: 'Lock orders' }).click();
  // The second to lock moves straight on to the report, so "the dialog closed" is what holds for both.
  await expect(p.page.getByRole('button', { name: 'Lock orders' })).toHaveCount(0);
}

async function next(a: Player, b: Player) {
  for (const p of [a, b]) await p.page.getByRole('button', { name: /next briefing|Close the report/ }).click();
}

/** Nothing that isn't this seat's may have arrived. Checked over every frame, not just what the screen shows. */
function assertNoLeaks(p: Player, seat: number) {
  for (const f of p.frames as { t?: string; room?: { game?: Record<string, never> } }[]) {
    const g = f.room?.game as unknown as Record<string, unknown> | undefined;
    if (f.t !== 'room' || !g || g.phase === 'over') continue;
    for (const k of ['seats', 'seed', 'rng', 'result']) expect(g[k], `${k} must not be sent`).toBeUndefined();
    expect(g.final).toBeNull();
    expect(g.you).toBe(seat);
    const text = JSON.stringify({ ...f.room, game: { ...g, mine: null } });
    // Anything naming a rival's orders would need one of these keys outside a player's own `mine`.
    for (const key of ['missions', 'orders', 'order', 'delivered', 'deliveries', 'found', 'blocked']) expect(text.includes(`"${key}":`), key).toBe(false);
  }
}

function assertSane(p: Player) {
  expect(p.errors).toEqual([]);
}

async function noSideScroll(p: Player) {
  const over = await p.page.evaluate(() =>
    [...document.querySelectorAll('html, body, .table, .play, .log, .intel, .res')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
  );
  expect(over).toEqual([]);
}

test('a whole match on two desktops: chat, statements, a sealed challenge, a mission win, a rematch', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await newPlayer(browser, 'Anna', DESKTOP);
  const b = await newPlayer(browser, 'Boris', DESKTOP);
  await openTable(a, b);

  const aim = await missions(a.page);
  const bim = await missions(b.page);
  expect(aim).toHaveLength(2);
  expect(NAMES).toEqual(expect.arrayContaining(aim));
  await noSideScroll(a);

  // The rules are a click away, mid-match.
  await a.page.getByRole('button', { name: /how to play|help/i }).first().click();
  await expect(a.page.getByRole('dialog').getByText(/How to win/).first()).toBeVisible();
  await shot(a, 'desktop-guide');
  await a.page.keyboard.press('Escape');
  await expect(a.page.getByRole('dialog')).toHaveCount(0);

  // Chat and statements read differently, and chat does not count as a statement.
  await a.page.fill('#dd-chat', 'Lovely evening for a walk.');
  await a.page.keyboard.press('Enter');
  await expect(b.page.locator('.line .text', { hasText: 'Lovely evening' })).toBeVisible();
  await expect(b.page.locator('.check li.ok')).toHaveCount(0);
  await shot(a, 'desktop-briefing');

  await brief(a, b, 1);
  await shot(a, 'desktop-orders');

  // Deliver can only go to a mission; the other tiles are shut.
  await a.page.getByRole('radio', { name: /^Deliver/ }).click();
  const shut = NAMES.filter((n) => !aim.includes(n));
  await expect(a.page.locator('.board').getByRole('button', { name: new RegExp(shut[0]) })).toBeDisabled();

  await order(a, 'Deliver', aim[0]);
  await expect(a.page.getByText('Locked', { exact: true })).toBeVisible();
  await expect(b.page.getByText('Anna: orders locked')).toBeVisible();
  await expect(a.page.getByText('Boris: still deciding')).toBeVisible();

  // A refresh keeps the locked order; the waiting screen comes back.
  await a.page.reload();
  await expect(a.page.getByText('Locked', { exact: true })).toBeVisible({ timeout: 15_000 });
  await shot(a, 'desktop-locked');

  await order(b, 'Investigate', aim[0]);
  await expect(b.page.locator('.phase').getByText(/^Confirmed: .* is one of your rival/)).toBeVisible();
  await expect(a.page.locator('.phase').getByText(`Your package reached ${aim[0]}.`)).toBeVisible();
  await shot(b, 'desktop-report');
  await shot(a, 'desktop-report-a');
  await b.page.getByRole('button', { name: 'Intelligence' }).click();
  await shot(b, 'desktop-intel');
  await expect(b.page.locator('.journal .mission')).toContainText(aim[0]);
  await b.page.getByRole('button', { name: 'Talk' }).click();
  await next(a, b);

  // Round 2: a true statement, challenged, stays sealed until the end.
  await expect(a.page.getByRole('heading', { name: 'Briefing' })).toBeVisible();
  await file(a, /I delivered at/, aim[0]);
  await b.page.locator('.phase').getByRole('button', { name: 'Challenge' }).click();
  await shot(b, 'desktop-challenge');
  await b.page.getByRole('dialog').getByRole('button', { name: 'Challenge' }).click();
  await expect(a.page.locator('.phase').getByText(/Sealed: the finding opens/)).toBeVisible();
  await shot(b, 'desktop-sealed');
  await file(b, /did not deliver/);
  for (const p of [a, b]) await p.page.getByRole('button', { name: /^Acknowledge/ }).click();

  await expect(a.page.getByRole('heading', { name: 'Secret orders' })).toBeVisible();
  await order(a, 'Deliver', aim[1]);
  await order(b, 'Decoy', bim[0]);
  await next(a, b);

  await brief(a, b, 3);
  await order(b, 'Decoy', bim[0]);
  await order(a, 'Deliver', aim[0]);

  await expect(a.page.getByRole('heading', { name: 'You win' })).toBeVisible();
  await expect(b.page.getByRole('heading', { name: 'Anna wins' })).toBeVisible();
  await expect(b.page.getByText(/completed the mission/)).toBeVisible();
  // Both missions open, along with the sealed finding: the statement was true, so the claimant scored.
  await expect(b.page.locator('.missions .n').filter({ hasText: aim[0] }).first()).toBeVisible();
  await expect(b.page.locator('.missions .n')).toHaveCount(4);
  await expect(b.page.getByText(/the statement was true\. Anna earns/)).toBeVisible();
  await shot(a, 'desktop-results');
  await noSideScroll(a);

  assertNoLeaks(a, 0);
  assertNoLeaks(b, 1);

  // Refresh after the end: the result is still there.
  await b.page.reload();
  await expect(b.page.getByRole('heading', { name: 'Anna wins' })).toBeVisible({ timeout: 15_000 });

  await a.page.getByRole('button', { name: 'Rematch' }).click();
  for (const p of [a, b]) await expect(p.page.getByRole('heading', { name: 'Case closed' })).toHaveCount(0);
  for (const p of [a, b]) await expect(p.page.getByRole('button', { name: /I’m ready|Not ready/ })).toBeVisible();

  assertSane(a);
  assertSane(b);
});

test('two phones: a decoy earns Cover, a false broadcast, two interceptions win', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await newPlayer(browser, 'Anna', PHONE);
  const b = await newPlayer(browser, 'Boris', PHONE);
  await openTable(a, b);
  await noSideScroll(a);
  await shot(a, 'phone-briefing');

  const aim = await missions(a.page);

  // The talk tab is its own screen here, and a half-written message survives leaving it.
  await a.page.getByRole('button', { name: 'Talk' }).click();
  await a.page.fill('#dd-chat', 'half a thought');
  await a.page.getByRole('button', { name: 'Mission' }).click();
  await a.page.getByRole('button', { name: 'Talk' }).click();
  await expect(a.page.locator('#dd-chat')).toHaveValue('half a thought');
  await a.page.getByRole('button', { name: 'Send' }).click();
  await shot(a, 'phone-talk');
  await expect(b.page.locator('.tabs .new')).toBeVisible();
  await a.page.getByRole('button', { name: 'Mission' }).click();

  // Round 1: Anna's decoy draws Boris, so Anna gains Cover and Boris scores nothing.
  await brief(a, b, 1);
  await shot(a, 'phone-orders');
  await order(a, 'Decoy', LOC.hotel);
  await order(b, 'Intercept', LOC.hotel);
  await expect(a.page.locator('.phase').getByText(/You gain Cover/)).toBeVisible();
  await expect(b.page.locator('.phase').getByText(`You caught no delivery at ${LOC.hotel}.`)).toBeVisible();
  await expect(b.page.locator('.agent').nth(0).locator('.num').first()).toHaveText('0/2');
  await shot(a, 'phone-report');
  await next(a, b);

  // Round 2: delivery under Cover. Boris reads the false signal, and catches the true place anyway.
  await brief(a, b, 2);
  const lie = NAMES.find((n) => n !== aim[0])!;
  await order(b, 'Intercept', aim[0]);
  await order(a, 'Deliver', aim[0], lie);
  await expect(b.page.locator('.phase').getByText(new RegExp(`${lie} \\(Cover spent: this signal is false\\)`))).toBeVisible();
  await expect(b.page.locator('.phase').getByText(`You intercepted a delivery at ${aim[0]}.`)).toBeVisible();
  await expect(a.page.locator('.phase').getByText(/was intercepted\. Nothing was delivered/)).toBeVisible();
  await next(a, b);

  // Round 3: the second catch ends it.
  await brief(a, b, 3);
  await order(a, 'Deliver', aim[1]);
  await order(b, 'Intercept', aim[1]);
  await expect(b.page.getByRole('heading', { name: 'You win' })).toBeVisible();
  await expect(a.page.getByText(/Boris made 2 interceptions/)).toBeVisible();
  await shot(a, 'phone-results');
  await noSideScroll(a);
  await noSideScroll(b);

  assertNoLeaks(a, 0);
  assertNoLeaks(b, 1);
  assertSane(a);
  assertSane(b);
});
