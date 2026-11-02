import { expect, test } from '@playwright/test';
import { PHONE, activePlayer, newPlayer, rawSend, roomViews, startTable } from './helpers';

test('a turn with planting, trading (offer, counter, accept), and resolving on desktop and phone', async ({ browser }) => {
  const players = [await newPlayer(browser, 'Ana'), await newPlayer(browser, 'Bo', PHONE), await newPlayer(browser, 'Cy')];
  await startTable(players);
  const act = await activePlayer(players);
  const others = players.filter((p) => p !== act);
  const P = act.page;

  // Plant the front bean by tapping a highlighted field.
  await expect(P.locator('.step')).toHaveText('Plant your front bean.');
  await P.locator('.mine .hit').first().click();
  await expect(P.locator('.mine .crate').first().locator('[data-card]')).toHaveCount(1);

  await P.getByRole('button', { name: /Turn over 2 cards/ }).click();
  await expect(P.locator('.faceup [data-card]')).toHaveCount(2);

  // Another player offers a card; the active player counters; they accept the counter.
  const [o1] = others;
  const O = o1.page;
  await O.getByRole('button', { name: /^Offer to/ }).click();
  const donated = await O.locator('.hand [data-bean]').first().getAttribute('data-bean');
  await O.locator('.hand button').first().click();
  await O.getByRole('button', { name: /^Send/ }).click();
  const slip = P.locator('.slip', { hasText: `${o1.name} donates to you` });
  await expect(slip).toBeVisible();
  await slip.getByRole('button', { name: 'Counter' }).click();
  // Counter: ask for the same card back and give one turned-over card.
  await P.locator('.faceup button').first().click();
  await P.getByRole('button', { name: /^Send/ }).click();
  const incoming = O.locator('.slip.incoming');
  await expect(incoming).toBeVisible();
  const handBefore = await O.locator('.hand [data-card]').count();
  await incoming.getByRole('button', { name: 'Accept' }).click();
  // Holding more than one copy of the asked-for bean, O picks which copy to give.
  const confirm = O.getByRole('button', { name: 'Make the trade' });
  if (await confirm.isVisible().catch(() => false)) {
    await O.locator(`.hand button[data-bean="${donated}"]`).first().click();
    await confirm.click();
  }
  // The accepted cards leave the hand and wait in the "To plant" tray.
  await expect(O.locator('.hand [data-card]')).toHaveCount(handBefore - 1);
  await expect(O.locator('.mine .pending [data-card]')).toHaveCount(1);

  await P.getByRole('button', { name: /End trading/ }).click();
  // Everyone plants what they kept and received before the turn can end.
  for (const p of players) {
    for (let i = 0; i < 6 && (await p.page.locator('.mine .pending').count()); i++) {
      const hit = p.page.locator('.mine .hit');
      const harvest = p.page.locator('.mine .crate button:has-text("Harvest")');
      // Wait until this player's view has reached the planting step.
      await expect(hit.or(harvest).first()).toBeVisible();
      if (await hit.count()) {
        // Wait for the confirmed plant before looking again, or we might click a target that has just gone.
        const left = await p.page.locator('.mine .pending [data-card]').count();
        await hit.first().click();
        await expect(p.page.locator('.mine .pending [data-card]')).not.toHaveCount(left);
      } else {
        await harvest.first().click();
        await p.page.waitForTimeout(300);
      }
    }
    await expect(p.page.locator('.mine .pending')).toHaveCount(0);
  }
  await P.getByRole('button', { name: /end turn/i }).click();
  await expect(P.locator('.turn')).not.toHaveText('Your turn');
  for (const p of players) expect(p.errors).toEqual([]);

  // Privacy: no player ever received another player's hand.
  for (const p of players) {
    const views = roomViews(p).filter((v) => v.game);
    expect(views.length).toBeGreaterThan(3);
    for (const v of views)
      v.game!.players.forEach((pl, i) => {
        if (i !== v.game!.you) expect(pl.hand).toBeUndefined();
      });
  }
});

test('the server rejects out-of-turn, stale, duplicate and malformed actions', async ({ browser }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  const code = await startTable(players);
  const act = await activePlayer(players);
  const idle = players.find((p) => p !== act)!;

  const [outOfTurn, malformed] = await rawSend(idle, code, [
    { t: 'act', id: 'e2e-1', v: 'current', a: { type: 'plant', field: 0 } },
    { t: 'act', id: 'e2e-2', v: 'current', a: { type: 'teleport' } },
  ]);
  expect(outOfTurn.ok).toBe(false);
  expect(malformed.ok).toBe(false);

  const [stale] = await rawSend(act, code, [{ t: 'act', id: 'e2e-3', v: 0, a: { type: 'plant', field: 0 } }]);
  expect(stale).toMatchObject({ ok: false, code: 'stale' });

  // The same action id twice commits once.
  const [first, again] = await rawSend(act, code, [
    { t: 'act', id: 'e2e-4', v: 'current', a: { type: 'plant', field: 0 } },
    { t: 'act', id: 'e2e-4', v: 'current', a: { type: 'plant', field: 0 } },
  ]);
  expect(first.ok).toBe(true);
  expect(again.v).toBe(first.v);
  await expect(act.page.locator('.mine .crate').first().locator('[data-card]')).toHaveCount(1);
  for (const p of players) await expect(p.page.locator('.table')).toBeVisible();
});

test('dragging a bean onto a field it does not fit is explained and changes nothing', async ({ browser }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  await startTable(players);
  const act = await activePlayer(players);
  const N = act.page;
  await N.locator('.mine .hit').first().click();
  await expect(N.locator('.mine .crate').first().locator('[data-card]')).toHaveCount(1);
  const fieldBean = await N.locator('.mine .crate').first().locator('[data-bean]').first().getAttribute('data-bean');
  const nextBean = await N.locator('.hand [data-bean]').first().getAttribute('data-bean');
  test.skip(fieldBean === nextBean, 'Random deal: the second card matches the first.');
  const card = N.locator('.hand .slot').first();
  const target = N.locator('.mine .crate').first();
  const cb = (await card.boundingBox())!;
  const tb = (await target.boundingBox())!;
  await N.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await N.mouse.down();
  await N.mouse.move(cb.x + cb.width / 2, cb.y - 20, { steps: 4 });
  await N.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await N.mouse.up();
  await expect(N.locator('.toast', { hasText: 'different bean' })).toBeVisible();
  await expect(N.locator('.mine .crate').first().locator('[data-card]')).toHaveCount(1);

  // Dragging it onto an empty field plants it.
  const empty = N.locator('.mine .crate.empty').first();
  const eb = (await empty.boundingBox())!;
  const cb2 = (await card.boundingBox())!;
  await N.mouse.move(cb2.x + cb2.width / 2, cb2.y + cb2.height / 2);
  await N.mouse.down();
  await N.mouse.move(cb2.x + cb2.width / 2, cb2.y - 20, { steps: 4 });
  await N.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2, { steps: 8 });
  await N.mouse.up();
  await expect(N.locator('.mine .crate').nth(1).locator('[data-card]')).toHaveCount(1);
});
