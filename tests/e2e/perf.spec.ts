import { expect, test } from '@playwright/test';
import { DESKTOP, activePlayer, newPlayer, rawSend, startTable } from './helpers';

/**
 * Measurements, not benchmarks: numbers land in the report as annotations
 * (see docs/TESTING.md). Assertions are loose ceilings that catch regressions
 * without flaking on a busy machine.
 */
test('performance: action round-trip, idle CPU, frame pacing during motion, transfer size', async ({ browser }) => {
  const note = (type: string, v: number | string) => test.info().annotations.push({ type, description: String(v) });
  // Motion on: this test measures the animations, not the reduced-motion path.
  const players = await Promise.all(['Ana', 'Bo', 'Cy'].map((n) => newPlayer(browser, n, { ...DESKTOP, reducedMotion: 'no-preference' })));
  const code = await startTable(players);
  const act = await activePlayer(players);

  // 1. Round-trip: send → ack, over a fresh socket, for a cheap rejected action (no state change) ×20.
  const idle = players.find((p) => p !== act)!;
  const rtts = await idle.page.evaluate(
    (c) =>
      new Promise<number[]>((resolve) => {
        const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws/${c}`);
        const out: number[] = [];
        let t0 = 0;
        let v = 0;
        const send = () => {
          t0 = performance.now();
          ws.send(JSON.stringify({ t: 'act', id: `rtt-${out.length}`, v, a: { type: 'endTurn' } }));
        };
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (m.t === 'room' && !t0) return (v = m.room.version), send();
          if (m.t !== 'ack') return;
          out.push(performance.now() - t0);
          if (out.length === 20) return ws.close(), resolve(out);
          send();
        };
      }),
    code,
  );
  rtts.sort((a, b) => a - b);
  note('ack-p50-ms', rtts[10].toFixed(1));
  note('ack-p95-ms', rtts[18].toFixed(1));
  // p95 on the local dev server is noisy (unminified, Windows timers); the deployed number is in docs/TESTING.md.
  expect(rtts[10]).toBeLessThan(250);

  const [ack] = await rawSend(act, code, [{ t: 'act', id: 'perf-plant', v: 'current', a: { type: 'plant', field: 0 } }]);
  expect(ack.ok).toBe(true);

  // 2. Idle CPU on the table: main-thread task time over 5 s with nothing happening.
  const cdp = await act.page.context().newCDPSession(act.page);
  await cdp.send('Performance.enable');
  const busy = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration')!.value;
  await act.page.waitForTimeout(1000);
  const b0 = await busy();
  await act.page.waitForTimeout(5000);
  const idlePct = ((await busy()) - b0) / 5 * 100;
  note('idle-main-thread-%', idlePct.toFixed(2));
  expect(idlePct).toBeLessThan(5);

  // 3. Frame pacing while a turn's flip animation plays on every other screen.
  const frames = () => idle.page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const gaps: number[] = [];
        let last = performance.now();
        const end = last + 1500;
        const tick = (t: number) => {
          gaps.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(tick);
          else resolve(gaps);
        };
        requestAnimationFrame(tick);
      }),
  );
  const still = await frames();
  note('fps-idle-baseline', (still.length / (still.reduce((a, b) => a + b, 0) / 1000)).toFixed(1));
  const watch = frames();
  await act.page.getByRole('button', { name: /Turn over 2 cards/ }).click();
  const gaps = await watch;
  const fps = gaps.length / (gaps.reduce((a, b) => a + b, 0) / 1000);
  note('fps-during-flip', fps.toFixed(1));
  note('frames-over-33ms', gaps.filter((g) => g > 33.4).length);
  note('worst-frames-ms', [...gaps].sort((a, b) => b - a).slice(0, 6).map((g) => g.toFixed(0)).join(' '));

  // 4. What a first visit downloads (dev server numbers are uncompressed; see docs for the build).
  const sizes = await act.page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((e) => e as PerformanceResourceTiming)
      .reduce((n, e) => n + (e.transferSize || e.encodedBodySize), 0),
  );
  note('resources-bytes', sizes);
  for (const p of players) expect(p.errors).toEqual([]);
});
