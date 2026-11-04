import { expect, test, type Page } from '@playwright/test';
import { PHONE, joinRoom, newPlayer, rawSend, roomViews, type Player } from './helpers';

// The deck table runs on the bench ruleset, which only a `--mode bench` dev server can host (see src/shared/bench.d.ts).
// Every click goes through real buttons on the real server. No card content here is meant for players.

// The browser outlives each test in a worker, so close this test's players; a low-memory machine can't hold them all.
test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});

const SHOTS = process.env.DECK_SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** A table on the bench ruleset; the host sits at it and is in the lobby when this returns. */
async function benchTable(p: Player, bots = 0): Promise<string> {
  await p.page.goto('/');
  const code = await p.page.evaluate(
    async ({ name, bots }) => {
      const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, gameId: 'fixture', bots }) });
      if (!r.ok) throw new Error(`create failed: ${r.status} ${await r.text()}`);
      return ((await r.json()) as { code: string }).code;
    },
    { name: p.name, bots },
  );
  await p.page.goto(`/r/${code}`);
  await expect(p.page.getByText(`${p.name} (you)`)).toBeVisible({ timeout: 15_000 });
  return code;
}

async function chooseMarket(p: Player, keys: string[]) {
  await p.page.getByRole('radio', { name: 'Choose piles' }).check({ force: true });
  for (const k of keys) {
    const pile = p.page.locator(`[data-pile="${k}"]`);
    await expect(pile).toBeEnabled();
    await pile.click();
    await expect(pile).toHaveAttribute('aria-pressed', 'true');
  }
}

const start = async (p: Player) => {
  const b = p.page.getByRole('button', { name: 'Start the game' });
  await expect(b).toBeEnabled();
  await b.click();
  // The first table in a run also waits for the dev server to compile it.
  await expect(p.page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });
};

/**
 * One step of a plain UI-driven player, in the page on the buttons a person would press: answer the prompt, else play
 * what's legal, else buy the dearest pile, else move on. Returns what it did, or null when it has nothing to do.
 */
function deckStep(p: Player): Promise<string | null> {
  return p.page.evaluate(() => {
    const all = (s: string) => [...document.querySelectorAll<HTMLButtonElement>(s)].filter((b) => !b.disabled);
    const dearest = () => all('button.tile').sort((a, b) => Number(b.querySelector('.cost')!.textContent) - Number(a.querySelector('.cost')!.textContent))[0];
    if (document.querySelector('.scrim')) return null;
    const prompt = document.querySelector('.prompt');
    if (prompt) {
      const confirm = all('.prompt .answers button.primary')[0];
      if (confirm && /Confirm|Reveal|Choose none|Don/.test(confirm.innerText)) return confirm.click(), 'confirm';
      const pick = all('.hud button.dc.legal, .prompt button.dc.legal')[0];
      if (pick) return pick.click(), 'pick';
      const pile = dearest();
      if (pile) return pile.click(), `pile ${pile.dataset.key}`;
      const answer = all('.prompt .answers button')[0];
      if (answer) return answer.click(), `answer ${answer.innerText}`;
      return null;
    }
    if (!document.querySelector('.turn.you')) return null;
    const treasures = all('.actions .go').find((b) => /treasures/.test(b.innerText));
    if (treasures) return treasures.click(), 'treasures';
    const card = all('.hud button.dc.legal')[0];
    if (card) return card.click(), `play ${card.dataset.key}`;
    const pile = dearest();
    if (pile) return pile.click(), `buy ${pile.dataset.key}`;
    const go = all('.actions .go')[0];
    if (go) return go.click(), go.innerText.trim();
    return null;
  });
}

const MIXED = ['hit-discard', 'hit-penalty', 'shield', 'look2', 'upgrade', 'option', 'later', 'trash-up-to-2', 'resources', 'stash'];
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('DB-UI-1 the lobby offers a random market with bans, a chosen one, and all of it is confirmed by the server', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  const bo = await newPlayer(browser, 'Bo');
  const code = await benchTable(ana);
  await joinRoom(bo, code);
  const { page } = ana;

  // Random by default; a ban reaches the other player from the server.
  await expect(page.getByRole('radio', { name: 'Random' })).toBeChecked();
  await page.locator('[data-pile="custom"]').click();
  await expect(page.locator('[data-pile="custom"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(bo.page.locator('[data-pile="custom"]')).toHaveAttribute('aria-pressed', 'true');
  // A guest can read the choices and can't change them.
  await expect(bo.page.locator('[data-pile="custom"]')).toBeDisabled();
  await expect(bo.page.getByText('Ana chooses the market.')).toBeVisible();

  // Fewer than ten chosen piles block the start, and say why.
  await page.getByRole('radio', { name: 'Choose piles' }).check({ force: true });
  await expect(page.getByText('Nothing chosen yet. Starting now uses a random market.')).toBeVisible();
  await page.locator('[data-pile="draw2"]').click();
  await expect(page.getByText('1/10')).toBeVisible();
  await expect(page.getByText('Choose exactly 10 piles.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the game' })).toBeDisabled();

  // The eleventh pile is refused.
  await page.locator('[data-pile="draw2"]').click();
  await expect(page.locator('[data-pile="draw2"]')).toHaveAttribute('aria-pressed', 'false');
  await chooseMarket(ana, MIXED);
  await expect(page.getByText('10/10')).toBeVisible();
  await page.locator('[data-pile="draw2"]').click();
  await expect(page.locator('[data-pile="draw2"]')).toHaveAttribute('aria-pressed', 'false');
  await shot(page, 'lobby');

  await start(ana);
  await expect(bo.page.locator('.table .turn')).toBeVisible();
  for (const k of MIXED) await expect(page.locator(`.tile[data-key="${k}"]`)).toBeVisible();
  await expect(page.locator('.tile')).toHaveCount(MIXED.length + 5);
  expect(ana.errors).toEqual([]);
  expect(bo.errors).toEqual([]);
});

test('DB-UI-2 a random market is drawn by the server and leaves out banned piles', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  await benchTable(ana, 1);
  await ana.page.locator('[data-pile="draw2"]').click();
  await expect(ana.page.locator('[data-pile="draw2"]')).toHaveAttribute('aria-pressed', 'true');
  await start(ana);
  await expect(ana.page.locator('.tile')).toHaveCount(15);
  await expect(ana.page.locator('.tile[data-key="draw2"]')).toHaveCount(0);
  await shot(ana.page, 'table-start');
  expect(ana.errors).toEqual([]);
});

test('DB-UI-3 a whole game through the UI against a bot reaches the results, and a rematch starts', async ({ browser }) => {
  test.setTimeout(8 * 60_000);
  const ana = await newPlayer(browser, 'Ana');
  const { page } = ana;
  await benchTable(ana, 1);
  await chooseMarket(ana, MIXED);
  await start(ana);

  const seen = new Set<string>();
  const deadline = Date.now() + 7 * 60_000;
  let shotPrompt = false;
  let shotLate = false;
  let buys = 0;
  while (!(await page.locator('.scrim .sum').count())) {
    if (Date.now() > deadline) throw new Error(`Stalled: ${await page.locator('.step').innerText()}; did ${[...seen].join(', ')}`);
    if (!shotPrompt && (await page.locator('.prompt').count())) {
      shotPrompt = true;
      await shot(page, 'prompt');
    }
    const did = await deckStep(ana);
    if (did) seen.add(did.split(' ')[0]);
    if (did?.startsWith('buy')) buys++;
    if (!shotLate && buys === 8) {
      shotLate = true;
      await page.waitForTimeout(150);
      await shot(page, 'table-midgame');
    }
    await page.waitForTimeout(did ? 40 : 150);
  }
  await shot(page, 'summary');
  expect(seen).toContain('treasures');
  expect(seen).toContain('buy');
  await expect(page.locator('.sum li')).toHaveCount(2);
  expect(ana.errors).toEqual([]);

  // View the table, come back, rematch.
  await page.getByRole('button', { name: 'View table' }).click();
  await expect(page.locator('.scrim .sum')).toHaveCount(0);
  await shot(page, 'table-over');
  await page.getByRole('button', { name: 'Results' }).click();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.locator('.scrim .sum')).toHaveCount(0);
  expect(ana.errors).toEqual([]);
});

test('DB-UI-4 two players: a decision waits on the right player, survives their reload, and nothing private crosses the wire', async ({ browser }) => {
  test.setTimeout(6 * 60_000);
  const ana = await newPlayer(browser, 'Ana');
  const bo = await newPlayer(browser, 'Bo');
  const code = await benchTable(ana);
  await joinRoom(bo, code);
  await chooseMarket(ana, ['hit-discard', 'hit-penalty', 'shield', 'draw2', 'look2', 'upgrade', 'option', 'later', 'resources', 'stash']);
  await start(ana);
  const players = [ana, bo];

  // Play until someone must decide on the other player's turn: an attack's discard, or a reaction offer.
  let target: Player | null = null;
  const deadline = Date.now() + 5 * 60_000;
  while (!target) {
    if (Date.now() > deadline) throw new Error('No attack was played');
    for (const p of players) {
      if (!(await p.page.locator('.prompt').count())) continue;
      const other = players.find((x) => x !== p)!;
      const whose = await other.page.locator('.turn').innerText();
      if (whose === 'Your turn') target = p;
    }
    if (target) break;
    for (const p of players) await deckStep(p);
    await ana.page.waitForTimeout(30);
  }

  // The other player sees who is deciding, and has no prompt or buttons of their own.
  const other = players.find((x) => x !== target)!;
  await expect(other.page.locator('.step')).toContainText(`${target.name} is deciding`);
  await expect(other.page.locator('.prompt')).toHaveCount(0);
  await expect(other.page.locator('.actions .go')).toHaveCount(0);
  await shot(target.page, 'decision');
  await shot(other.page, 'decision-other');

  // Reconnect: the cookie session seats them again, with the same question in front of them.
  const asked = await target.page.locator('.prompt .ask').innerText();
  await target.page.reload();
  await expect(target.page.locator('.prompt .ask')).toHaveText(asked, { timeout: 15_000 });

  // Answer it after the reload, and the table moves on.
  for (let i = 0; i < 40 && (await target.page.locator('.prompt').count()); i++) {
    await deckStep(target);
    await target.page.waitForTimeout(80);
  }
  await expect(other.page.locator('.step')).not.toContainText(`${target.name} is deciding`);

  // An action from the wrong player, and one out of date, are refused.
  const waiting = (await ana.page.locator('.turn.you').count()) ? bo : ana;
  const wrong = await rawSend(waiting, code, [{ t: 'act', id: 'wrong-turn', v: 'current', a: { type: 'end-phase' } }]);
  expect(wrong[0].ok).toBe(false);
  expect(wrong[0].code).toMatch(/^(not-your-turn|decision-first)$/);
  const stale = await rawSend(waiting, code, [{ t: 'act', id: 'stale', v: 1, a: { type: 'end-phase' } }]);
  expect(stale[0]).toMatchObject({ ok: false, code: 'stale' });

  // Across every frame either player received: only their own hand, never a deck's contents or any other secret.
  type Seen = { version: number; game: (Record<string, unknown> & { hand: { id: number }[]; players: Record<string, unknown>[] }) | null };
  const seen = (p: Player) => roomViews(p) as unknown as Seen[];
  for (const p of players) {
    const views = seen(p).filter((v) => v.game);
    expect(views.length).toBeGreaterThan(3);
    for (const v of views) {
      for (const k of ['seed', 'rng', 'piles', 'frames']) expect(v.game![k], `${k} must not be sent`).toBeUndefined();
      for (const pl of v.game!.players) {
        for (const k of ['hand', 'deck', 'discard']) expect(pl[k], `players[].${k} must not be sent`).toBeUndefined();
        expect(typeof pl.deckCount).toBe('number');
      }
    }
  }
  // At each version both saw, one player's hand ids appear nowhere in the other's hand.
  let compared = 0;
  for (const a of seen(ana)) {
    const b = seen(bo).find((x) => x.version === a.version);
    if (!a.game || !b?.game) continue;
    const mine = new Set(a.game.hand.map((c) => c.id));
    for (const c of b.game.hand) expect(mine.has(c.id)).toBe(false);
    compared++;
  }
  expect(compared).toBeGreaterThan(0);
  expect(ana.errors).toEqual([]);
  expect(bo.errors).toEqual([]);
});

test('DB-UI-5 cards can be inspected, and piles looked through, without playing anything', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  const { page } = ana;
  await benchTable(ana, 1);
  await chooseMarket(ana, MIXED);
  await start(ana);
  await page.locator('.tile[data-key="upgrade"]').click({ button: 'right' });
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'Upgrade' })).toBeVisible();
  await expect(dlg.getByText('Trash a card from your hand.').first()).toBeVisible();
  await shot(page, 'inspect');
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  const handBefore = await page.locator('.hud [data-card]').count();
  await page.locator('.hud [data-card]').first().click({ button: 'right' });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.hud [data-card]')).toHaveCount(handBefore);
  await page.getByRole('button', { name: /Trash: 0 cards/ }).click({ force: true });
  await expect(page.getByRole('dialog').getByText('Nothing here yet.')).toBeVisible();
  await page.keyboard.press('Escape');

  // After a turn the discard pile has cards: opening one from the list inspects it, and closing returns to the list.
  await expect
    .poll(async () => {
      await deckStep(ana);
      return page.getByRole('button', { name: /^Your discard pile/ }).getAttribute('aria-label');
    }, { timeout: 30_000 })
    .not.toContain(': 0 cards');
  await page.getByRole('button', { name: /^Your discard pile/ }).click({ force: true });
  const list = page.getByRole('dialog', { name: 'Your discard pile' });
  await expect(list).toBeVisible();
  // Copies in the list must not carry motion ids: only the table's own card may.
  await expect(list.locator('[data-card]')).toHaveCount(0);
  await list.locator('button.dc').first().click();
  await expect(page.getByRole('dialog').filter({ hasText: 'in the supply' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);
  expect(ana.errors).toEqual([]);
});

test('DB-UI-7 with animations on, cards fly between zones and motion never touches the rules', async ({ browser }) => {
  test.setTimeout(3 * 60_000);
  const ana = await newPlayer(browser, 'Ana', { viewport: { width: 1366, height: 860 }, reducedMotion: 'no-preference' });
  const { page } = ana;
  await benchTable(ana, 1);
  await chooseMarket(ana, MIXED);
  await start(ana);
  // Record the cards seen flying, from inside the page, so a short flight can't be missed between steps. A flying card
  // is a clone without `data-card` (client/lib/motion.ts), and a real one mustn't be in the DOM twice under one id.
  await page.evaluate(() => {
    const w = window as unknown as { __flew: number; __twins: number };
    w.__flew = 0;
    w.__twins = 0;
    const tick = () => {
      const running = document.getAnimations().filter((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target;
        return a.playState === 'running' && t instanceof Element && t.classList.contains('in-flight');
      });
      w.__flew += running.length;
      const ids = [...document.querySelectorAll<HTMLElement>('[data-card]')].map((e) => e.dataset.card);
      if (new Set(ids).size !== ids.length) w.__twins++;
      requestAnimationFrame(tick);
    };
    tick();
  });
  let acted = 0;
  for (let i = 0; i < 40; i++) {
    if (await deckStep(ana)) acted++;
    await page.waitForTimeout(200);
  }
  expect(acted).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __flew: number }).__flew)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __twins: number }).__twins)).toBe(0);
  // Once flights land, no clone is left behind.
  await expect(page.locator('.in-flight')).toHaveCount(0);
  expect(ana.errors).toEqual([]);
});

test('DB-UI-6 the phone layout fits and plays by touch', async ({ browser }) => {
  test.setTimeout(3 * 60_000);
  const ana = await newPlayer(browser, 'Ana', PHONE);
  const { page } = ana;
  await benchTable(ana, 1);
  await chooseMarket(ana, MIXED);
  await shot(page, 'phone-lobby');
  await start(ana);
  await shot(page, 'phone-table');
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  await expect(page.locator('.hud .hand [data-card]').first()).toBeVisible();

  // A long-press opens the card and doesn't play it.
  const before = await page.locator('.hud .hand [data-card]').count();
  await page.evaluate(() => {
    const el = document.querySelector('.hud .hand [data-card]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 50, clientY: 700 }));
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'phone-inspect');
  await page.keyboard.press('Escape');
  await expect(page.locator('.hud .hand [data-card]')).toHaveCount(before);

  // Step through many moves, so hands, prompts and buttons are exercised at this size.
  let shotPrompt = false;
  for (let i = 0; i < 80; i++) {
    if (!shotPrompt && (await page.locator('.prompt').count())) {
      shotPrompt = true;
      await shot(page, 'phone-prompt');
      await expect(page.locator('.prompt .answers button').first()).toBeInViewport();
    }
    await deckStep(ana);
    await page.waitForTimeout(100);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  }
  await shot(page, 'phone-later');
  expect(ana.errors).toEqual([]);
});
