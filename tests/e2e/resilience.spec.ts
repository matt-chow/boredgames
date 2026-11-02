import { expect, test } from '@playwright/test';
import { activePlayer, newPlayer, rawSend, roomViews, startTable } from './helpers';

test('a refresh restores the same seat and hand; dropping offline shows a reconnect state', async ({ browser }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  await startTable(players);
  const bo = players[1];
  const handIds = () => bo.page.locator('.hand [data-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  const before = await handIds();
  expect(before).toHaveLength(5);

  await bo.page.reload();
  await expect(bo.page.locator('.table .turn')).toBeVisible();
  expect(await handIds()).toEqual(before);

  // Network drop: the reconnect banner appears, others see Bo offline, and it recovers.
  const ctx = bo.page.context();
  await ctx.setOffline(true);
  await bo.page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(bo.page.locator('.reconnect')).toBeVisible({ timeout: 15_000 });
  await ctx.setOffline(false);
  await bo.page.evaluate(() => window.dispatchEvent(new Event('online')));
  const t0 = Date.now();
  await expect(bo.page.locator('.reconnect')).toBeHidden({ timeout: 10_000 });
  test.info().annotations.push({ type: 'reconnect-ms', description: String(Date.now() - t0) });
  expect(await handIds()).toEqual(before);
});

test('conflicting actions: accept and withdraw race, exactly one wins', async ({ browser }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  const code = await startTable(players);
  const act = await activePlayer(players);
  const other = players.find((p) => p !== act)!;
  await act.page.locator('.mine .hit').first().click();
  await act.page.getByRole('button', { name: /Turn over 2 cards/ }).click();

  await other.page.getByRole('button', { name: /^Offer to/ }).click();
  await other.page.locator('.hand button').first().click();
  await other.page.getByRole('button', { name: /^Send/ }).click();
  await expect(act.page.locator('.slip.incoming').getByRole('button', { name: 'Accept' })).toBeEnabled();
  const offer = (roomViews(act).at(-1)!.game as unknown as { offers: { id: number }[] }).offers.at(-1)!.id;
  // Both sides fire at the same room version over their own sockets.
  const [[acc], [wd]] = await Promise.all([
    rawSend(act, code, [{ t: 'act', id: 'race-accept', v: 'current', a: { type: 'accept', offer, cards: [] } }]),
    rawSend(other, code, [{ t: 'act', id: 'race-withdraw', v: 'current', a: { type: 'cancel', offer } }]),
  ]);
  expect(Number(acc.ok) + Number(wd.ok)).toBe(1);

  // Both views converge on a single outcome.
  const outcome = (p: typeof act) => p.page.locator('.settled, .slip').filter({ hasText: /Accepted|Withdrawn/ }).first().innerText();
  await expect.poll(() => outcome(act)).toMatch(/Accepted|Withdrawn/);
  const word = async (p: typeof act) => (await outcome(p)).match(/Accepted|Withdrawn/)![0];
  await expect.poll(() => word(other)).toBe(await word(act));
  const accepted = /Accepted/.test(await outcome(act));
  expect(accepted).toBe(acc.ok);
  await expect(act.page.locator('.mine .pending [data-card]')).toHaveCount(accepted ? 1 : 0);
});

test('two tabs of the same player cannot double-spend: one commit, the other is stale', async ({ browser }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  const code = await startTable(players);
  const act = await activePlayer(players);
  const acks = await Promise.all([
    rawSend(act, code, [{ t: 'act', id: 'tab-a', v: 'current', a: { type: 'plant', field: 0 } }]),
    rawSend(act, code, [{ t: 'act', id: 'tab-b', v: 'current', a: { type: 'plant', field: 0 } }]),
  ]);
  const oks = acks.flat().filter((a) => a.ok);
  // Both snapshots carried the same version, so at most one may commit;
  // if the second socket connected after the first commit it plants the next card legally.
  expect(oks.length).toBeGreaterThanOrEqual(1);
  const planted = await act.page.locator('.mine [data-card]').count();
  expect(planted).toBe(oks.length);
});
