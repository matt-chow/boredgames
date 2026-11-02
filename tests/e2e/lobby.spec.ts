import { expect, test } from '@playwright/test';
import { PHONE, createRoom, joinRoom, newPlayer, startTable } from './helpers';

test('host creates a room, others join by code and link, variants sync, game starts', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  const bo = await newPlayer(browser, 'Bo', PHONE);
  const cy = await newPlayer(browser, 'Cy');
  const code = await createRoom(ana);
  await expect(ana.page.getByRole('button', { name: 'Start the game' })).toBeDisabled();

  // Join by typing the code on the hub.
  await bo.page.goto('/');
  await bo.page.fill('#code', code.toLowerCase());
  await bo.page.getByRole('button', { name: 'Join', exact: true }).click();
  await bo.page.fill('#jname', 'Bo');
  await bo.page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(bo.page.getByText('Bo (you)')).toBeVisible();
  // Join by invite link.
  await joinRoom(cy, code);

  // Only the host may change variants; everyone sees the change.
  const magpie = (p: typeof ana) => p.page.getByRole('switch', { name: /Magpie Bean/ });
  await expect(magpie(bo)).toBeDisabled();
  await magpie(ana).check();
  await expect(magpie(cy)).toBeChecked();
  // The Duel can never be enabled at 3–5 players.
  await expect(ana.page.getByRole('switch', { name: /Duel/ })).toBeDisabled();
  // Turning on Bean Coin switches the incompatible Magpie off.
  await ana.page.getByRole('switch', { name: /Bean Coin/ }).check();
  await expect(magpie(bo)).not.toBeChecked();

  await ana.page.getByRole('button', { name: 'Start the game' }).click();
  for (const p of [ana, bo, cy]) await expect(p.page.locator('.table .turn')).toBeVisible();
  for (const p of [ana, bo, cy]) expect(p.errors).toEqual([]);
});

test('outsiders cannot take a seat or read a started game', async ({ browser, request, baseURL }) => {
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n)));
  const code = await startTable(players);

  // Same display name, new browser: refused, not merged into Ana's seat.
  const imp = await newPlayer(browser, 'Ana');
  await imp.page.goto(`/r/${code}`);
  await expect(imp.page.getByRole('heading', { name: 'This game has already started.' })).toBeVisible();
  const join = await imp.page.request.post(`/api/rooms/${code}/join`, { data: { name: 'Ana' }, headers: { origin: baseURL! } });
  expect(join.status()).toBeGreaterThanOrEqual(400);

  // The public summary carries no game state.
  const summary = await request.get(`/api/rooms/${code}`);
  const body = await summary.json();
  expect(JSON.stringify(body)).not.toMatch(/hand|deck|"t":"(blue|chili|stink|green|soy|red|garden|blackeyed)"/);

  // Cross-site requests are refused (CSRF).
  const csrf = await request.post(`/api/rooms/${code}/join`, { data: { name: 'Eve' }, headers: { origin: 'https://evil.example' } });
  expect(csrf.status()).toBe(403);

  // A WebSocket without a seat cookie is refused.
  const refused = await imp.page.evaluate(
    (c) =>
      new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/${c}`);
        ws.onopen = () => resolve(false);
        ws.onerror = () => resolve(true);
        ws.onclose = () => resolve(true);
      }),
    code,
  );
  expect(refused).toBe(true);
});
