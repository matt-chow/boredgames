import { expect, test, type Page } from '@playwright/test';
import { PHONE, joinRoom, newPlayer, roomViews, type Player } from './helpers';

// Kingdom & Commerce through its real buttons on a real server. Also runs against staging with E2E_BASE_URL.

test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});

const SHOTS = process.env.DECK_SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** A Clockwork table made by the same request the hub sends; the host is in the lobby when this returns. */
async function table(p: Player, bots = 0): Promise<string> {
  await p.page.goto('/');
  const code = await p.page.evaluate(
    async ({ name, bots }) => {
      const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, gameId: 'clockwork', bots }) });
      if (!r.ok) throw new Error(`create failed: ${r.status} ${await r.text()}`);
      return ((await r.json()) as { code: string }).code;
    },
    { name: p.name, bots },
  );
  await p.page.goto(`/r/${code}`);
  await expect(p.page.getByText(`${p.name} (you)`)).toBeVisible({ timeout: 15_000 });
  return code;
}

const start = async (p: Player) => {
  const b = p.page.getByRole('button', { name: 'Start the game' });
  await expect(b).toBeEnabled();
  await b.click();
  await expect(p.page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });
};

/**
 * One step of a plain player, pressing what a person would press: answer the prompt, claim a Crown Project, play what's
 * legal, buy the dearest pile, or move on. It never reads anything but the page.
 */
function step(p: Player): Promise<string | null> {
  return p.page.evaluate(() => {
    const all = (s: string) => [...document.querySelectorAll<HTMLButtonElement>(s)].filter((b) => !b.disabled);
    const dearest = () => all('button.tile').sort((a, b) => Number(b.querySelector('.cost')!.textContent) - Number(a.querySelector('.cost')!.textContent))[0];
    if (document.querySelector('.scrim')) return null;
    const prompt = document.querySelector('.prompt');
    if (prompt) {
      const confirm = all('.prompt .answers button.primary')[0];
      const pick = all('.hud button.dc.legal, .prompt button.dc.legal')[0];
      if (confirm && /Confirm|Reveal|Choose none|Don/.test(confirm.innerText)) {
        if (pick && /Choose none|Don|Confirm/.test(confirm.innerText) && confirm.disabled) return pick.click(), 'pick';
        return confirm.click(), 'confirm';
      }
      if (pick) return pick.click(), 'pick';
      const pile = dearest();
      if (pile) return pile.click(), 'pile';
      const answer = all('.prompt .answers button')[0];
      if (answer) return answer.click(), `answer ${answer.innerText}`;
      return null;
    }
    const work = all('button.work.on')[0];
    if (work) return work.click(), `claim ${work.dataset.project}`;
    const card = all('.hud button.dc.legal')[0];
    if (card) return card.click(), 'play';
    const every = all('.actions button').find((b) => /^Play all/.test(b.innerText));
    if (every) return every.click(), 'play all';
    const convert = all('.actions button').find((b) => /^Convert/.test(b.innerText));
    if (convert) return convert.click(), 'convert';
    const pile = dearest();
    if (pile) return pile.click(), `buy ${pile.dataset.key}`;
    const next = all('.actions button.go').find((b) => /^Move on|^End turn/.test(b.innerText));
    if (next) return next.click(), 'next';
    return null;
  });
}

/** Plays until the game ends. Prompts for confirm with nothing picked yet are answered by picking first. */
async function playOut(players: Player[], limit: number) {
  const claims: string[] = [];
  for (let i = 0; i < limit; i++) {
    if (await players[0].page.locator('.scrim').isVisible()) return claims;
    let moved = false;
    for (const p of players) {
      const did = await p.page.evaluate(() => {
        // A required card choice: pick before confirming.
        const need = document.querySelector<HTMLButtonElement>('.prompt .answers button.primary:disabled');
        const pick = document.querySelector<HTMLButtonElement>('.hud button.dc.legal, .prompt button.dc.legal');
        if (need && pick) return pick.click(), 'pick';
        return null;
      });
      const m = did ?? (await step(p));
      if (m) {
        moved = true;
        if (m.startsWith('claim')) claims.push(m);
        await p.page.waitForTimeout(40);
        break;
      }
    }
    if (!moved) await players[0].page.waitForTimeout(150);
  }
  throw new Error('the game did not finish');
}

test.describe('Kingdom & Commerce', () => {
  test.setTimeout(420_000);

  test('CC-E2E-1: it is on offer in the hub, and the lobby shows sets, market and Crown Projects', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada');
    await host.page.goto('/');
    await expect(host.page.getByText('Kingdom & Commerce').first()).toBeVisible({ timeout: 15_000 });
    await table(host, 1);
    await expect(host.page.locator('[data-set="core"]')).toBeChecked();
    await expect(host.page.locator('[data-set="foundry"]')).not.toBeChecked();
    await expect(host.page.locator('[data-pile="redline_boiler"]')).toHaveCount(0);
    await expect(host.page.locator('[data-work]')).toHaveCount(10);
    await host.page.locator('[data-set="night"]').check({ force: true });
    await expect(host.page.locator('[data-pile="redline_boiler"]')).toBeVisible();
    await host.page.locator('[data-set="town"]').check({ force: true });
    await expect(host.page.locator('[data-work]')).toHaveCount(15);
    await host.page.locator('[data-work="waterwheel"]').click();
    await expect(host.page.locator('[data-work="waterwheel"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(host.page.getByRole('button', { name: 'Start the game' })).toBeDisabled();
    await host.page.locator('[data-work="waterwheel"]').click();
    await expect(host.page.getByRole('button', { name: 'Start the game' })).toBeEnabled();
    await shot(host.page, 'cc-lobby');
  });

  test('CC-E2E-2: a game shows art, Influence and Crown Projects, and inspection reads a card', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada');
    await table(host, 1);
    await start(host);
    await expect(host.page.locator('.tile .art svg').first()).toBeVisible();
    await expect(host.page.locator('.hud .dc .art svg').first()).toBeVisible();
    await expect(host.page.locator('.res .token dt')).toHaveText('Influence');
    await expect(host.page.locator('.work')).toHaveCount(5);
    await expect(host.page.getByRole('button', { name: /^Move on to Market/ })).toBeVisible();
    await expect(host.page.locator('.opp').first()).not.toContainText('spark');
    await shot(host.page, 'cc-table');
    await host.page.locator('.tile').first().click({ button: 'right' });
    await expect(host.page.getByRole('dialog')).toContainText('Costs');
    await shot(host.page, 'cc-inspect');
  });

  test('CC-E2E-3: a full 2-player game with a person and a bot finishes, and a rematch starts', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada');
    await table(host, 1);
    await start(host);
    await playOut([host], 2500);
    await expect(host.page.locator('.sum h2')).toBeVisible();
    await shot(host.page, 'cc-summary');
    await host.page.getByRole('button', { name: 'Play again' }).click();
    await expect(host.page.locator('.sum h2')).toBeHidden({ timeout: 15_000 });
  });

  test('CC-E2E-4: two people play in sync, a reconnect recovers the seat, and hands and Renown stay private (KC3-RENOWN-7)', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada');
    const guest = await newPlayer(browser, 'Bea');
    const code = await table(host);
    await joinRoom(guest, code);
    await start(host);
    await expect(guest.page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });

    const [a, b] = await Promise.all([host, guest].map((p) => p.page.locator('.hud .dc').count()));
    expect(a).toBe(5);
    expect(b).toBe(5);

    await playOutFor(host, guest, 40);

    await guest.page.reload();
    await expect(guest.page.locator('.table .turn')).toBeVisible({ timeout: 15_000 });
    expect(await guest.page.locator('.hud .dc').count()).toBeGreaterThan(0);

    await playOut([host, guest], 3500);
    await expect(guest.page.locator('.sum h2')).toBeVisible({ timeout: 15_000 });

    // Every view each browser was sent during play: only its own hand and Renown, never another seat's cards, a deck
    // order or any final score.
    for (const p of [host, guest]) {
      const views = roomViews(p).filter((v) => v.game && !(v.game as { over?: unknown }).over);
      expect(views.length).toBeGreaterThan(0);
      for (const v of views) {
        const game = v.game as unknown as { players: Record<string, unknown>[]; final: unknown };
        expect(game.final, 'scores before the end').toBeNull();
        game.players.forEach((seat, i) => {
          if (i !== v.you) {
            expect(seat.hand, `seat ${i} seen by ${v.you}`).toBeUndefined();
            expect(seat.vp, `Renown of seat ${i} seen by ${v.you}`).toBeUndefined();
          }
          expect(seat.deck).not.toBeInstanceOf(Array);
        });
      }
    }
    expect(host.errors).toEqual([]);
    expect(guest.errors).toEqual([]);
  });

  test('CC-E2E-5: all seats filled by bots at 6 players still finishes for the person', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada');
    await table(host, 5);
    await start(host);
    await playOut([host], 2500);
    await expect(host.page.locator('.sum li')).toHaveCount(6);
  });

  test('CC-E2E-6: the phone layout fits and can be played', async ({ browser }) => {
    const host = await newPlayer(browser, 'Ada', PHONE);
    await table(host, 1);
    await start(host);
    const overflow = await host.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(host.page.locator('.work')).toHaveCount(5);
    await shot(host.page, 'cc-phone');
    for (let i = 0; i < 6; i++) await step(host);
  });
});

async function playOutFor(a: Player, b: Player, moves: number) {
  for (let i = 0; i < moves; i++) {
    for (const p of [a, b]) {
      const need = await p.page.evaluate(() => {
        const n = document.querySelector<HTMLButtonElement>('.prompt .answers button.primary:disabled');
        const pick = document.querySelector<HTMLButtonElement>('.hud button.dc.legal, .prompt button.dc.legal');
        if (n && pick) return pick.click(), true;
        return false;
      });
      if (need || (await step(p))) break;
    }
    await a.page.waitForTimeout(40);
  }
}
