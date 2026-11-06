import { seedRng, shuffle } from '../../../engine/rng';
import type { ApplyResult, PlayerResult } from '../../../engine/types';
import { normalizeText } from '../../../shared/protocol';
import { LOCATIONS, type Claim, type DAction, type DState, type DView, type EndMethod, type Loc, type Order, type Phase, type RoundRecord, type Seat, type Statement } from './types';

export const MAX_ROUNDS = 7;
export const MAX_COVER = 1;
export const DELIVERIES_TO_WIN = 3;
export const INTERCEPTIONS_TO_WIN = 2;
export const STATEMENTS_PER_BRIEFING = 3;
export const CHAT_MAX = 400;
export const CHAT_KEEP = 200;
/** How long a phase runs before a player who has done their part may call time. */
export const PHASE_MS: Partial<Record<Phase, number>> = { briefing: 120_000, orders: 60_000, report: 30_000 };
/** The same, on a seat time was called on before, which has not acted since. */
export const AWAY_MS = 15_000;

const refuse = (code: string, error: string): ApplyResult<DState> => ({ ok: false, code, error });
const isLoc = (x: unknown): x is Loc => LOCATIONS.includes(x as Loc);

export function setup(seed: string, now = 0): DState {
  const rng = seedRng(seed);
  const seat = (): Seat => ({
    missions: shuffle(rng, [...LOCATIONS]).slice(0, 2),
    orders: null,
    deliveries: {},
    interceptions: 0,
    cover: 0,
    challengeToken: true,
    challengePoints: 0,
    acked: 0,
    continued: false,
    away: false,
  });
  return { round: 1, phase: 'briefing', since: now, seats: [seat(), seat()], rounds: [], statements: [], chat: [], nextId: 1, result: null };
}

const filedThisRound = (s: DState, seat: number) => s.statements.filter((x) => x.seat === seat && x.round === s.round).length;

/** The seat has done what this phase asks of it. */
function dutyDone(s: DState, seat: number): boolean {
  if (s.phase === 'briefing') return filedThisRound(s, seat) >= 1 && s.seats[seat].acked === filedThisRound(s, 1 - seat);
  if (s.phase === 'orders') return !!s.seats[seat].orders;
  if (s.phase === 'report') return s.seats[seat].continued;
  return true;
}

const totalDeliveries = (x: Seat) => Object.values(x.deliveries).reduce((a, b) => a + b, 0);
/** DD-WIN1: three deliveries with at least one at each mission location. */
const missionComplete = (x: Seat) => totalDeliveries(x) >= DELIVERIES_TO_WIN && x.missions.every((m) => (x.deliveries[m] ?? 0) >= 1);

/** Resolve both orders at once. Pure, and neither order depends on the other's seat number (DD-RES1). */
export function resolve(s: DState, now: number): DState {
  const orders = s.seats.map((x) => x.orders);
  const rec: RoundRecord = {
    round: s.round,
    orders,
    signals: orders.map((o) => (o ? (o.cover ?? o.target) : null)),
    delivered: [false, false],
    captured: [null, null],
    drew: [false, false],
    coverGained: [false, false],
    coverSpent: orders.map((o) => !!o?.cover),
    found: [null, null],
  };
  const seats = s.seats.map((x) => ({ ...x, deliveries: { ...x.deliveries }, orders: null, acked: 0, continued: false }));
  for (const me of [0, 1]) {
    const mine = orders[me];
    const theirs = orders[1 - me];
    if (mine?.cover) seats[me].cover--;
    if (!mine) continue;
    if (mine.action === 'investigate') rec.found[me] = seats[1 - me].missions.includes(mine.target);
    // Always the actual target: a false broadcast never saves a delivery (DD-COV4).
    const blocked = theirs?.action === 'intercept' && theirs.target === mine.target;
    if (mine.action === 'deliver' && !blocked) {
      rec.delivered[me] = true;
      seats[me].deliveries[mine.target] = (seats[me].deliveries[mine.target] ?? 0) + 1;
    }
    if (mine.action === 'deliver' && blocked) {
      rec.captured[1 - me] = mine.target;
      seats[1 - me].interceptions++;
    }
    if (mine.action === 'decoy' && blocked) rec.drew[me] = true;
  }
  // After spending, so a seat's capacity is judged on what it holds as the round ends. Only a decoy can gain and only a delivery can spend, so a seat never does both.
  for (const me of [0, 1]) {
    if (rec.drew[me] && seats[me].cover < MAX_COVER) {
      seats[me].cover++;
      rec.coverGained[me] = true;
    }
  }
  const next: DState = { ...s, seats, rounds: [...s.rounds, rec], phase: 'report', since: now };
  const end = endOf(next);
  if (!end) return next;
  return { ...next, phase: 'over', result: end };
}

/** The match's result, if this resolution ended it (DD-WIN*). */
function endOf(s: DState): DState['result'] {
  const won = s.seats.map((x) => missionComplete(x) || x.interceptions >= INTERCEPTIONS_TO_WIN);
  if (won[0] && won[1]) return { winner: null, method: 'simultaneous' };
  if (won[0] || won[1]) {
    const winner = won[0] ? 0 : 1;
    return { winner, method: missionComplete(s.seats[winner]) ? 'mission' : 'counterintelligence' };
  }
  if (s.round < MAX_ROUNDS) return null;
  const ladder: [EndMethod, (x: Seat) => number][] = [
    ['deliveries', totalDeliveries],
    ['interceptions', (x) => x.interceptions],
    ['challenges', (x) => x.challengePoints],
  ];
  for (const [method, score] of ladder) {
    const [a, b] = s.seats.map(score);
    if (a !== b) return { winner: a > b ? 0 : 1, method };
  }
  return { winner: null, method: 'level' };
}

/** Whether the claim matches what the claimant actually ordered in the round it speaks of. */
export function claimTrue(s: DState, st: Statement): boolean | null {
  const claim = st.claim;
  if (claim.kind === 'none') return null;
  const order = s.rounds.find((r) => r.round === st.round - 1)?.orders[st.seat] ?? null;
  if (claim.kind === 'notDelivered') return order?.action !== 'deliver';
  const action = claim.kind === 'delivered' ? 'deliver' : claim.kind === 'investigated' ? 'investigate' : 'decoy';
  return order?.action === action && order.target === claim.loc;
}

/** DD-CH5: decided by the kind of claim alone, so the delay itself says nothing about the answer. */
const sealedKind = (c: Claim) => c.kind === 'delivered' || c.kind === 'notDelivered';

function validClaim(raw: unknown): Claim | null {
  const c = raw as Claim | null;
  if (!c || typeof c !== 'object') return null;
  if (c.kind === 'none' || c.kind === 'notDelivered') return { kind: c.kind };
  if ((c.kind === 'delivered' || c.kind === 'investigated' || c.kind === 'decoy') && isLoc(c.loc)) return { kind: c.kind, loc: c.loc };
  return null;
}

function validOrder(s: DState, seat: number, raw: unknown): Order | ApplyResult<DState> {
  const o = raw as Order | null;
  if (!o || typeof o !== 'object' || !['deliver', 'investigate', 'intercept', 'decoy'].includes(o.action)) return refuse('bad-order', 'Choose an action.');
  if (!isLoc(o.target)) return refuse('bad-target', 'Choose one of the four locations.');
  const me = s.seats[seat];
  if (o.action === 'deliver' && !me.missions.includes(o.target)) return refuse('not-mission', 'You can only deliver at your own mission locations.');
  if (o.cover === undefined) return { action: o.action, target: o.target };
  if (o.action !== 'deliver') return refuse('cover-deliver-only', 'Cover can only be spent on a delivery.');
  if (me.cover < 1) return refuse('no-cover', 'You have no Cover to spend.');
  if (!isLoc(o.cover)) return refuse('bad-target', 'Choose a false location to broadcast.');
  if (o.cover === o.target) return refuse('cover-same', 'The false broadcast must name a different location.');
  return { action: o.action, target: o.target, cover: o.cover };
}

/** Both seats' duties done: move to the next phase. */
function advance(s: DState, now: number): DState {
  if (s.phase === 'briefing') return { ...s, phase: 'orders', since: now };
  if (s.phase === 'orders') return resolve(s, now);
  if (s.phase === 'report')
    return { ...s, phase: 'briefing', round: s.round + 1, since: now, seats: s.seats.map((x) => ({ ...x, acked: 0, continued: false })) };
  return s;
}

const settle = (s: DState, now: number): DState => (dutyDone(s, 0) && dutyDone(s, 1) ? advance(s, now) : s);

/** When `seat` may call time on the opponent. Null while the seat has its own part to do or the opponent has done theirs. */
function callAt(s: DState, seat: number): number | null {
  const limit = PHASE_MS[s.phase];
  if (limit === undefined || !dutyDone(s, seat) || dutyDone(s, 1 - seat)) return null;
  return s.since + (s.seats[1 - seat].away ? AWAY_MS : limit);
}

export function apply(state: DState, seat: number, action: DAction, now = 0): ApplyResult<DState> {
  if (state.phase === 'over') return refuse('game-over', 'The match is over.');
  if (seat !== 0 && seat !== 1) return refuse('not-seated', 'You are not at this table.');
  if (!action || typeof action !== 'object') return refuse('bad-request', 'Unknown action.');
  const s: DState = structuredClone(state);
  const me = s.seats[seat];
  const them = s.seats[1 - seat];
  // Any action shows the seat is at the table. Calling time is decided on the clock it already had.
  const present = () => (me.away = false);

  if (action.type === 'chat') {
    const text = normalizeText(action.text, CHAT_MAX);
    if (!text) return refuse('bad-chat', `Messages are 1 to ${CHAT_MAX} characters.`);
    present();
    s.chat = [...s.chat, { id: s.nextId++, seat, round: s.round, at: now, text }].slice(-CHAT_KEEP);
    return { ok: true, undoable: false, state: s };
  }

  // Every other action names its round, so one sent for an earlier phase can never land on a later one.
  if (action.round !== s.round) return refuse('wrong-round', 'That was for an earlier round.');

  switch (action.type) {
    case 'claim': {
      if (s.phase !== 'briefing') return refuse('wrong-phase', 'Statements are filed during the briefing.');
      const claim = validClaim(action.claim);
      if (!claim) return refuse('bad-claim', 'Choose a statement and a location.');
      if (claim.kind !== 'none' && s.round === 1) return refuse('no-history', 'No round has been completed yet.');
      if (filedThisRound(s, seat) >= STATEMENTS_PER_BRIEFING) return refuse('too-many', `You can file ${STATEMENTS_PER_BRIEFING} statements each briefing.`);
      present();
      s.statements.push({ id: s.nextId++, seat, round: s.round, at: now, claim, challenge: null });
      return { ok: true, undoable: false, state: settle(s, now) };
    }
    case 'ack': {
      if (s.phase !== 'briefing') return refuse('wrong-phase', 'Statements are acknowledged during the briefing.');
      const count = filedThisRound(s, 1 - seat);
      if (count === 0) return refuse('nothing-to-ack', 'Your opponent has filed nothing yet.');
      // The count is what the player has seen: a statement filed since then still needs reading.
      if (action.count !== count) return refuse('unseen-statement', 'A new statement has just been filed. Read it first.');
      present();
      me.acked = count;
      return { ok: true, undoable: false, state: settle(s, now) };
    }
    case 'challenge': {
      if (s.phase !== 'briefing') return refuse('wrong-phase', 'Challenges are made during the briefing.');
      if (!me.challengeToken) return refuse('no-token', 'You have already used your Challenge token.');
      const st = s.statements.find((x) => x.id === action.statement);
      if (!st) return refuse('no-statement', 'There is no such statement.');
      if (st.seat === seat) return refuse('own-claim', 'You cannot challenge your own statement.');
      if (st.challenge) return refuse('already-challenged', 'That statement has already been challenged.');
      const truth = claimTrue(s, st);
      if (truth === null) return refuse('not-challengeable', 'There is nothing in that statement to challenge.');
      present();
      me.challengeToken = false;
      st.challenge = { by: seat, round: s.round, at: now, correct: !truth, sealed: sealedKind(st.claim) };
      (truth ? them : me).challengePoints++;
      return { ok: true, undoable: false, state: s };
    }
    case 'order': {
      if (s.phase !== 'orders') return refuse('wrong-phase', 'Orders are given after the briefing.');
      if (me.orders) return refuse('locked', 'Your orders are locked.');
      const order = validOrder(s, seat, action.order);
      if ('ok' in order) return order;
      present();
      me.orders = order;
      return { ok: true, undoable: false, state: settle(s, now) };
    }
    case 'continue': {
      if (s.phase !== 'report') return refuse('wrong-phase', 'There is no report to close.');
      if (me.continued) return refuse('locked', 'You have already closed this report.');
      present();
      me.continued = true;
      return { ok: true, undoable: false, state: settle(s, now) };
    }
    case 'callTime': {
      if (action.phase !== s.phase) return refuse('wrong-phase', 'That phase has already ended.');
      const at = callAt(s, seat);
      if (at === null) return refuse('cannot-call', dutyDone(s, seat) ? 'Your opponent has done their part.' : 'Finish your own part first.');
      if (now < at) return refuse('too-early', 'Your opponent still has time.');
      present();
      them.away = true;
      return { ok: true, undoable: false, state: advance(s, now) };
    }
    default:
      return refuse('bad-request', 'Unknown action.');
  }
}

export function actors(s: DState): number[] {
  return s.phase === 'over' ? [] : [0, 1].filter((seat) => !dutyDone(s, seat));
}

export function project(s: DState, viewer: number | null): DView {
  const over = s.phase === 'over';
  const seat = viewer === 0 || viewer === 1 ? viewer : null;
  const me = seat === null ? null : s.seats[seat];
  // Sealed points stay out of the public count until the match is over (DD-CH6).
  const sealedPoints = [0, 1].map((x) =>
    s.statements.filter((st) => st.challenge?.sealed && (st.challenge.correct ? st.challenge.by : st.seat) === x).length,
  );
  return {
    round: s.round,
    maxRounds: MAX_ROUNDS,
    phase: s.phase,
    you: seat,
    interceptions: s.seats.map((x) => x.interceptions),
    cover: s.seats.map((x) => x.cover),
    challengeToken: s.seats.map((x) => x.challengeToken),
    challengePoints: s.seats.map((x, i) => (over ? x.challengePoints : x.challengePoints - sealedPoints[i])),
    statements: s.statements.map((st) => {
      const c = st.challenge;
      const shown = c && (over || !c.sealed);
      return {
        id: st.id,
        seat: st.seat,
        round: st.round,
        at: st.at,
        claim: st.claim,
        challenge: c && { by: c.by, round: c.round, at: c.at, sealed: c.sealed, ...(shown ? { correct: c.correct } : {}) },
        challengeable: !over && !c && st.claim.kind !== 'none',
      };
    }),
    chat: s.chat,
    rounds: s.rounds.map((r) => ({
      round: r.round,
      signals: r.signals,
      captures: [0, 1].flatMap((x) => (r.captured[x] ? [{ seat: x, loc: r.captured[x]! }] : [])),
      coverGained: r.coverGained,
      coverSpent: r.coverSpent,
    })),
    done: [0, 1].map((x) => (over ? true : dutyDone(s, x))),
    filed: [0, 1].map((x) => filedThisRound(s, x)),
    acked: [0, 1].map((x) => filedThisRound(s, 1 - x) > 0 && s.seats[x].acked === filedThisRound(s, 1 - x)),
    callAt: seat === null || over ? null : callAt(s, seat),
    mine:
      seat === null || !me
        ? null
        : {
            missions: me.missions,
            deliveries: me.deliveries,
            order: me.orders,
            rounds: s.rounds.map((r) => ({
              round: r.round,
              order: r.orders[seat],
              delivered: r.delivered[seat],
              blocked: r.captured[1 - seat] !== null,
              captured: r.captured[seat] !== null,
              drew: r.drew[seat],
              coverGained: r.coverGained[seat],
              found: r.found[seat],
            })),
          },
    final:
      over && s.result
        ? {
            ...s.result,
            missions: s.seats.map((x) => x.missions),
            deliveries: s.seats.map(totalDeliveries),
            rounds: s.rounds,
          }
        : null,
  };
}

export function results(s: DState): PlayerResult[] | null {
  if (s.phase !== 'over' || !s.result) return null;
  const { winner, method } = s.result;
  return s.seats.map((x, seat) => ({
    seat,
    score: totalDeliveries(x),
    rank: winner === null || winner === seat ? 1 : 2,
    winner: winner === seat,
    detail: method,
  }));
}
