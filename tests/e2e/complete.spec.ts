import { expect, test, type Browser } from '@playwright/test';
import { PHONE, botStep, newPlayer, startTable, type Player } from './helpers';

const GAMES: { names: string[]; variants: RegExp[] }[] = [
  { names: ['Ana', 'Bo', 'Cy'], variants: [] },
  { names: ['Ana', 'Bo', 'Cy', 'Di'], variants: [/^Three New Bean Types/, /^Magpie Bean/] },
  { names: ['Ana', 'Bo', 'Cy', 'Di', 'Ed'], variants: [/^The Field Bean/] },
  { names: ['Ana', 'Bo', 'Cy', 'Di'], variants: [/^AMIGO Bean Coin/] },
];

async function seat(browser: Browser, names: string[]) {
  const out: Player[] = [];
  for (const [i, n] of names.entries()) out.push(await newPlayer(browser, n, i === 1 ? PHONE : undefined));
  return out;
}

for (const { names, variants } of GAMES) {
  const label = variants.length ? variants.map((v) => v.source.slice(1)).join(' + ') : 'base game';
  test(`a full ${names.length}-player game (${label}) plays to the summary, then a rematch returns to the lobby`, async ({ browser }) => {
    test.setTimeout(12 * 60_000);
    const players = await seat(browser, names);
    await startTable(players, async (host) => {
      for (const v of variants) await host.page.getByRole('switch', { name: v }).check();
      for (const v of variants) await expect(players.at(-1)!.page.getByRole('switch', { name: v })).toBeChecked();
    });

    const did: Record<string, number> = {};
    let idle = 0;
    let steps = 0;
    while (!(await players[0].page.locator('#sum-h').count())) {
      let acted = false;
      for (const p of players) {
        const what = await botStep(p);
        if (!what) continue;
        acted = true;
        const k = what.replace(/[0-9]+/g, 'N');
        did[k] = (did[k] ?? 0) + 1;
      }
      idle = acted ? 0 : idle + 1;
      if (idle > 60) {
        const where = await Promise.all(players.map(async (p) => `${p.name}: ${await p.page.locator('.step').innerText()}`));
        throw new Error(`Bot stalled — ${where.join(' | ')}`);
      }
      // Let the confirmed state arrive before deciding again.
      await players[0].page.waitForTimeout(acted ? 40 : 100);
      if (++steps > 6000) throw new Error('Game did not finish');
    }
    for (const p of players) {
      await expect(p.page.locator('#sum-h')).toBeVisible();
      await expect(p.page.locator('.sum li')).toHaveCount(names.length);
      expect(p.errors).toEqual([]);
    }
    test.info().annotations.push({ type: 'bot-actions', description: JSON.stringify(did) });

    await players[1].page.getByRole('button', { name: 'Play again' }).click();
    for (const p of players) await expect(p.page.getByRole('heading', { name: 'Variants' })).toBeVisible();
  });
}
