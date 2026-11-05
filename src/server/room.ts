import { DurableObject } from 'cloudflare:workers';
import type { ServerMsg } from '../shared/protocol';
import {
  RoomCore,
  RoomError,
  type ActionRecord,
  type HistoryRow,
  type RoomMeta,
  type RoomStore,
  type SeatRow,
  type UndoRow,
} from './core';

export interface Env {
  ROOMS: DurableObjectNamespace<RoomDO>;
  ASSETS: Fetcher;
  /** "on" lets hosts pick trial rules. Set in `env.staging` only. */
  EXPERIMENTS?: string;
}

interface Attachment {
  th: string;
  /** When the socket opened. Absent on sockets accepted before this field existed. */
  at?: number;
}

const MAX_MESSAGE_BYTES = 16 * 1024;
/** Token bucket per socket: burst 20, refill 10/s. In-memory; resets on hibernation, which is fine. */
const BUCKET_MAX = 20;
const BUCKET_RATE = 10;
/** The client pings every 20 s, answered without waking the room. This long without one means the connection died silently. */
const SILENT_MS = 70_000;
/** How soon after the last change, and then how often, a stalled table checks for those silent connections. */
const STALL_MS = 45_000;
const STALL_REPEAT_MS = 30_000;

/** SQLite-backed implementation of the room store. All calls are synchronous. */
class SqlStore implements RoomStore {
  constructor(private ctx: DurableObjectState) {}
  private get sql() {
    return this.ctx.storage.sql;
  }

  initialized(): boolean {
    return this.sql.exec(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta'`).toArray().length > 0;
  }

  init() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS seats (seat INTEGER PRIMARY KEY, th TEXT NOT NULL, name TEXT NOT NULL, joined_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS blobs (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS actions (n INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT UNIQUE NOT NULL, ok INTEGER, code TEXT, error TEXT, v INTEGER);
      CREATE TABLE IF NOT EXISTS history (version INTEGER PRIMARY KEY, seat INTEGER, kind TEXT, data TEXT, at INTEGER);
    `);
  }

  private blob<T>(k: string): T | null {
    const row = this.sql.exec<{ v: string }>(`SELECT v FROM blobs WHERE k = ?`, k).toArray()[0];
    return row ? (JSON.parse(row.v) as T) : null;
  }
  private setBlob(k: string, v: unknown) {
    if (v === null || v === undefined) this.sql.exec(`DELETE FROM blobs WHERE k = ?`, k);
    else this.sql.exec(`INSERT OR REPLACE INTO blobs (k, v) VALUES (?, ?)`, k, JSON.stringify(v));
  }

  getMeta(): RoomMeta | null {
    if (!this.initialized()) return null;
    const row = this.sql.exec<{ v: string }>(`SELECT v FROM meta WHERE k = 'room'`).toArray()[0];
    return row ? JSON.parse(row.v) : null;
  }
  putMeta(m: RoomMeta) {
    this.sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('room', ?)`, JSON.stringify(m));
  }
  getSeats(): SeatRow[] {
    return this.sql
      .exec<{ th: string; name: string; joined_at: number }>(`SELECT th, name, joined_at FROM seats ORDER BY seat`)
      .toArray()
      .map((r) => ({ th: r.th, name: r.name, joinedAt: r.joined_at }));
  }
  putSeats(rows: SeatRow[]) {
    this.sql.exec(`DELETE FROM seats`);
    rows.forEach((r, i) => this.sql.exec(`INSERT INTO seats (seat, th, name, joined_at) VALUES (?, ?, ?, ?)`, i, r.th, r.name, r.joinedAt));
  }
  getState() {
    return this.blob<unknown>('state');
  }
  putState(s: unknown) {
    this.setBlob('state', s);
  }
  getUndo() {
    return this.blob<UndoRow>('undo');
  }
  putUndo(u: UndoRow | null) {
    this.setBlob('undo', u);
  }
  getAction(key: string): ActionRecord | null {
    const r = this.sql
      .exec<{ ok: number; code: string; error: string; v: number }>(`SELECT ok, code, error, v FROM actions WHERE k = ?`, key)
      .toArray()[0];
    return r ? { key, ok: !!r.ok, code: r.code, error: r.error, v: r.v } : null;
  }
  putAction(r: ActionRecord, keep: number) {
    this.sql.exec(`INSERT OR REPLACE INTO actions (k, ok, code, error, v) VALUES (?, ?, ?, ?, ?)`, r.key, r.ok ? 1 : 0, r.code, r.error, r.v);
    this.sql.exec(`DELETE FROM actions WHERE n <= (SELECT MAX(n) FROM actions) - ?`, keep);
  }
  appendHistory(h: HistoryRow) {
    this.sql.exec(`INSERT OR REPLACE INTO history (version, seat, kind, data, at) VALUES (?, ?, ?, ?, ?)`, h.version, h.seat, h.kind, h.data, h.at);
  }
  transaction<T>(fn: () => T): T {
    return this.ctx.storage.transactionSync(fn);
  }
}

function randomSeed(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * One instance per room code. Authoritative for everything in the room:
 * seats, configuration, game state, randomness and validation.
 */
export class RoomDO extends DurableObject<Env> {
  private store: SqlStore;
  private core: RoomCore | null = null;
  private buckets = new WeakMap<WebSocket, { tokens: number; at: number }>();
  /** Room version at which a bot found no legal move; bots wait for the next change. In-memory only. */
  private botStuckAt = -1;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new SqlStore(ctx);
    // Answer keep-alive pings without waking the object from hibernation.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  private opts = { now: () => Date.now(), seed: randomSeed, experiments: __DECK_BENCH__ || this.env.EXPERIMENTS === 'on' };

  private room(): RoomCore {
    if (!this.core) this.core = new RoomCore(this.store, this.opts);
    return this.core;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const th = req.headers.get('x-th');
    try {
      switch (url.pathname) {
        case '/create': {
          const body = (await req.json()) as { code: string; gameId: string; name: string; th: string; bots?: number };
          if (this.store.initialized() && this.store.getMeta()) throw new RoomError('exists', 'Room code in use.', 409);
          this.store.init();
          this.core = RoomCore.create(this.store, this.opts, body);
          await this.schedule();
          return json({ code: body.code, seat: 0 });
        }
        case '/join': {
          const body = (await req.json()) as { name: string; th: string };
          const seat = this.room().join(body.name, body.th);
          await this.schedule();
          this.broadcast();
          return json({ code: this.room().code, seat });
        }
        case '/summary':
          return json(this.room().summary(th));
        case '/ws': {
          if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected WebSocket', code: 'bad-request' }, 426);
          const room = this.room();
          const seat = room.seatOf(th);
          if (!th || seat < 0) return json({ error: 'You are not a member of this room.', code: 'unauthorized' }, 403);
          const pair = new WebSocketPair();
          const [client, server] = Object.values(pair);
          this.ctx.acceptWebSocket(server);
          server.serializeAttachment({ th, at: Date.now() } satisfies Attachment);
          // This view still shows a bot in the seat, so a returning player can be told it played for them.
          this.send(server, { t: 'room', room: room.view(seat, this.connected()) });
          room.presence(this.connected());
          this.broadcast();
          await this.schedule();
          return new Response(null, { status: 101, webSocket: client });
        }
      }
      return json({ error: 'Not found', code: 'not-found' }, 404);
    } catch (e) {
      if (e instanceof RoomError) return json({ error: e.message, code: e.code }, e.status);
      console.error('room error', (e as Error).message);
      return json({ error: 'Internal error', code: 'internal' }, 500);
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return ws.close(1009, 'Message too large');
    if (!this.allow(ws)) {
      this.send(ws, { t: 'ack', id: '', ok: false, code: 'rate', error: 'Slow down.', v: this.room().version });
      return;
    }
    let msg: unknown;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    const room = this.room();
    const att = ws.deserializeAttachment() as Attachment | null;
    const seat = room.seatOf(att?.th ?? null);
    if (seat < 0) return ws.close(4003, 'Not a member');
    const res = room.handle(seat, msg, this.connected());
    if (res.ack) this.send(ws, { t: 'ack', ...res.ack });
    if (res.end !== undefined) return this.close(att?.th ?? '', res.end);
    if (res.evict.length) {
      for (const s of this.ctx.getWebSockets()) {
        const a = s.deserializeAttachment() as Attachment | null;
        if (a && res.evict.includes(a.th)) {
          this.send(s, { t: 'bye', reason: a.th === att?.th ? 'left' : 'removed' });
          s.close(4001, 'Removed from room');
        }
      }
    }
    if (res.changed) {
      // A game that just started can already have someone offline.
      if (room.presence(this.connected()) === 'closed') return this.wipe();
      await this.schedule();
      this.broadcast();
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.lost(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.lost(ws);
  }

  private async lost(ws: WebSocket) {
    if (!this.store.getMeta()) return;
    if (this.room().presence(this.connected(ws)) === 'closed') return this.wipe();
    await this.schedule();
    this.broadcast(ws);
  }

  /**
   * One alarm serves every timed job: playing the next computer-player move once
   * its delay since the last change has passed, ending grace periods, noticing
   * connections that died silently, and deleting rooms that have been idle past
   * their retention window.
   */
  async alarm() {
    if (!this.store.initialized() || !this.store.getMeta()) return;
    const room = this.room();
    const now = Date.now();
    if (now >= room.expiresAt) {
      for (const s of this.ctx.getWebSockets()) s.close(4004, 'Room expired');
      return this.wipe();
    }
    this.closeSilent(now);
    const was = room.presence(this.connected());
    if (was === 'closed') return this.wipe();
    if (was === 'changed') this.broadcast();
    const bot = this.botDue();
    if (bot && now >= room.updatedAt + bot.delayMs) {
      if (room.playBot()) this.broadcast();
      else {
        this.botStuckAt = room.version;
        console.error('bot found no legal move', room.code, room.version);
      }
    }
    await this.schedule();
  }

  /** A player quit mid-game: tell everyone, close every socket and delete the room so nothing keeps running. */
  private async close(quitter: string, name: string) {
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment() as Attachment | null;
      this.send(s, a?.th === quitter ? { t: 'bye', reason: 'left' } : { t: 'bye', reason: 'ended', by: name });
      s.close(4001, 'Game ended');
    }
    await this.wipe();
  }

  private async wipe() {
    this.core = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  /**
   * Close sockets that stopped pinging. A dropped network sends no close event, so these seats still look connected.
   * shortcut: only a stalled table checks (see schedule), so a silent drop starts its grace up to 100 s after the last
   * ping and only once the table waits on someone; check on a fixed timer if free-tier wakes turn out not to matter.
   */
  private closeSilent(now: number) {
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment() as Attachment | null;
      const last = this.ctx.getWebSocketAutoResponseTimestamp(s)?.getTime() ?? a?.at ?? now;
      if (now - last > SILENT_MS) s.close(1011, 'No ping');
    }
  }

  private botDue() {
    const room = this.room();
    return room.version === this.botStuckAt ? null : room.nextBot();
  }

  /** Wake for whichever comes first: the next bot move, a grace period ending, a stalled table, the retention deadline. */
  private async schedule() {
    const room = this.room();
    const now = Date.now();
    const bot = this.botDue();
    const times = [room.expiresAt];
    if (bot) times.push(Math.max(now, room.updatedAt + bot.delayMs));
    if (room.graceEndsAt) times.push(room.graceEndsAt);
    if (room.status === 'playing' && this.ctx.getWebSockets().length) times.push(Math.max(now + STALL_REPEAT_MS, room.updatedAt + STALL_MS));
    await this.ctx.storage.setAlarm(Math.min(...times));
  }

  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const b = this.buckets.get(ws) ?? { tokens: BUCKET_MAX, at: now };
    b.tokens = Math.min(BUCKET_MAX, b.tokens + ((now - b.at) / 1000) * BUCKET_RATE);
    b.at = now;
    if (b.tokens < 1) {
      this.buckets.set(ws, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(ws, b);
    return true;
  }

  /** Seats with at least one open socket (optionally ignoring a closing one). */
  private connected(except?: WebSocket): Set<number> {
    const room = this.room();
    const out = new Set<number>();
    for (const s of this.ctx.getWebSockets()) {
      if (s === except || s.readyState !== WebSocket.OPEN) continue;
      const a = s.deserializeAttachment() as Attachment | null;
      const seat = room.seatOf(a?.th ?? null);
      if (seat >= 0) out.add(seat);
    }
    return out;
  }

  /** Send every member their own projection of the room. */
  private broadcast(except?: WebSocket) {
    if (!this.store.getMeta()) return;
    const room = this.room();
    const connected = this.connected(except);
    const cache = new Map<number, string>();
    for (const s of this.ctx.getWebSockets()) {
      if (s === except) continue;
      const a = s.deserializeAttachment() as Attachment | null;
      const seat = room.seatOf(a?.th ?? null);
      if (seat < 0) continue;
      let payload = cache.get(seat);
      if (!payload) {
        payload = JSON.stringify({ t: 'room', room: room.view(seat, connected) } satisfies ServerMsg);
        cache.set(seat, payload);
      }
      try {
        s.send(payload);
      } catch {
        /* socket already closing */
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* closing */
    }
  }
}
