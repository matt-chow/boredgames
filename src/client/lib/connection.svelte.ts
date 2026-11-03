import type { ClientMsg, RoomView, ServerMsg } from '../../shared/protocol';
import { api } from './api';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface Ack {
  ok: boolean;
  code?: string;
  error?: string;
}

type Outgoing = ClientMsg extends infer M ? (M extends { id: string; v: number } ? Omit<M, 'id' | 'v'> : never) : never;

const PING_MS = 20_000;
const PONG_TIMEOUT_MS = 8_000;
const ACK_TIMEOUT_MS = 10_000;
const BACKOFF = [250, 500, 1000, 1500, 2000];

const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * One live WebSocket to a room. Holds the latest authoritative view; never
 * applies anything optimistically. Reconnects with short backoff.
 */
export class RoomConnection {
  room = $state<RoomView | null>(null);
  status = $state<ConnStatus>('connecting');
  /** Why the connection ended for good (removed, left, not a member, expired). */
  ended = $state<string | null>(null);
  /** Who quit, when the game ended because someone did. */
  endedBy = $state('');
  /** An action is awaiting its acknowledgement. */
  busy = $state(false);

  #ws: WebSocket | null = null;
  #attempt = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #ping: ReturnType<typeof setInterval> | null = null;
  #pongDue: ReturnType<typeof setTimeout> | null = null;
  #inflight = new Map<string, { resolve: (a: Ack) => void; timer: ReturnType<typeof setTimeout> }>();
  #disposed = false;
  #listeners: Array<(room: RoomView, prev: RoomView | null) => void> = [];

  constructor(public code: string) {
    this.#open();
    addEventListener('online', this.#wake);
    addEventListener('offline', this.#drop);
    document.addEventListener('visibilitychange', this.#wake);
  }

  /** Called with every new authoritative view, before `room` is updated. */
  onRoom(fn: (room: RoomView, prev: RoomView | null) => void) {
    this.#listeners.push(fn);
    return () => {
      this.#listeners = this.#listeners.filter((f) => f !== fn);
    };
  }

  #wake = () => {
    if (this.#disposed || this.ended || document.visibilityState === 'hidden') return;
    if (this.status !== 'open') {
      this.#attempt = 0;
      this.#reconnectSoon(0);
    }
  };

  /**
   * Give up on the current socket now. A dead network never completes the
   * close handshake, so waiting for `onclose` could take minutes.
   */
  #drop = () => {
    const ws = this.#ws;
    if (!ws || this.#disposed || this.status !== 'open') return;
    ws.onclose = null;
    ws.onmessage = null;
    try {
      ws.close();
    } catch {
      /* already closing */
    }
    this.#closed(ws, 1006, 'timeout');
  };

  #open() {
    if (this.#disposed) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/${this.code}`);
    this.#ws = ws;
    ws.onopen = () => {
      this.#attempt = 0;
      this.status = 'open';
      this.#startPing();
    };
    ws.onmessage = (ev) => this.#receive(ev.data);
    ws.onclose = (ev) => this.#closed(ws, ev.code, ev.reason);
  }

  #receive(data: unknown) {
    if (typeof data !== 'string') return;
    let msg: ServerMsg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (this.#pongDue) {
      clearTimeout(this.#pongDue);
      this.#pongDue = null;
    }
    switch (msg.t) {
      case 'room': {
        const prev = this.room;
        // Listeners measure the DOM before the new view renders (FLIP "first").
        for (const fn of this.#listeners) fn(msg.room, prev);
        this.room = msg.room;
        break;
      }
      case 'ack': {
        const p = this.#inflight.get(msg.id);
        if (p) {
          clearTimeout(p.timer);
          this.#inflight.delete(msg.id);
          this.busy = this.#inflight.size > 0;
          p.resolve(msg.ok ? { ok: true } : { ok: false, code: msg.code, error: msg.error });
        }
        break;
      }
      case 'bye':
        this.ended = msg.reason;
        this.endedBy = msg.by ?? '';
        break;
    }
  }

  #closed(ws: WebSocket, code: number, reason: string) {
    if (ws !== this.#ws) return;
    this.#stopPing();
    this.#failInflight('Connection lost before the server confirmed. Check the table and retry if needed.');
    if (this.#disposed) return;
    if (code === 4001 || code === 4003 || code === 4004) {
      this.ended ??= code === 4004 ? 'expired' : code === 4003 ? 'unauthorized' : reason || 'removed';
      this.status = 'closed';
      return;
    }
    this.status = 'reconnecting';
    this.#attempt++;
    // A refused upgrade looks like a plain close; after a couple of failures, ask why.
    if (this.#attempt === 2 || this.#attempt % 6 === 0) {
      api.summary(this.code).then(
        (s) => {
          if (!s.member) {
            this.ended = 'unauthorized';
            this.status = 'closed';
          }
        },
        (e) => {
          if (e.status === 404) {
            this.ended = 'expired';
            this.status = 'closed';
          }
        },
      );
    }
    this.#reconnectSoon(BACKOFF[Math.min(this.#attempt - 1, BACKOFF.length - 1)]);
  }

  #reconnectSoon(ms: number) {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (this.ended || this.#disposed) return;
      const old = this.#ws;
      if (old && old.readyState <= WebSocket.OPEN) {
        old.onclose = null;
        old.close();
      }
      this.#open();
    }, ms);
  }

  #startPing() {
    this.#stopPing();
    this.#ping = setInterval(() => {
      if (this.#ws?.readyState !== WebSocket.OPEN) return;
      this.#ws.send('{"t":"ping"}');
      this.#pongDue ??= setTimeout(() => {
        // Silent socket: treat as dead and reconnect.
        this.#pongDue = null;
        this.#drop();
      }, PONG_TIMEOUT_MS);
    }, PING_MS);
  }

  #stopPing() {
    if (this.#ping) clearInterval(this.#ping);
    if (this.#pongDue) clearTimeout(this.#pongDue);
    this.#ping = null;
    this.#pongDue = null;
  }

  #failInflight(error: string) {
    for (const [, p] of this.#inflight) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, code: 'disconnected', error });
    }
    this.#inflight.clear();
    this.busy = false;
  }

  /** Send a versioned, uniquely identified message; resolves with the server's verdict. */
  send(msg: Outgoing): Promise<Ack> {
    const ws = this.#ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || !this.room)
      return Promise.resolve({ ok: false, code: 'offline', error: 'Not connected. Reconnecting…' });
    const id = newId();
    return new Promise<Ack>((resolve) => {
      const timer = setTimeout(() => {
        this.#inflight.delete(id);
        this.busy = this.#inflight.size > 0;
        resolve({ ok: false, code: 'timeout', error: 'The server did not answer in time.' });
      }, ACK_TIMEOUT_MS);
      this.#inflight.set(id, { resolve, timer });
      this.busy = true;
      ws.send(JSON.stringify({ ...msg, id, v: this.room!.version }));
    });
  }

  act(action: unknown) {
    return this.send({ t: 'act', a: action });
  }

  dispose() {
    this.#disposed = true;
    removeEventListener('online', this.#wake);
    removeEventListener('offline', this.#drop);
    document.removeEventListener('visibilitychange', this.#wake);
    if (this.#timer) clearTimeout(this.#timer);
    this.#stopPing();
    this.#failInflight('Left the room.');
    if (this.#ws) {
      this.#ws.onclose = null;
      this.#ws.close(1000);
    }
  }
}
