import { GAMES, LISTED_GAMES } from '../games/registry';
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode, sessionCookie, type ApiError } from '../shared/protocol';
import type { Env } from './room';

export { RoomDO } from './room';

const SESSION_MAX_AGE = 30 * 24 * 3600;
const MAX_BODY = 2048;

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...SECURITY_HEADERS, ...extra },
  });
}

const fail = (status: number, code: string, error: string) => json({ code, error } satisfies ApiError, status);

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH * 2);
  crypto.getRandomValues(bytes);
  let out = '';
  // Rejection sampling keeps the distribution uniform over the alphabet.
  for (const b of bytes) {
    if (b >= 256 - (256 % CODE_ALPHABET.length)) continue;
    out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (out.length === CODE_LENGTH) return out;
  }
  return randomCode();
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=') || null;
  }
  return null;
}

function setCookie(name: string, value: string, maxAge: number, secure: boolean) {
  // HttpOnly: unreadable by page scripts. SameSite=Strict: never sent cross-site.
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/** Reject cross-site requests (CSRF / cross-site WebSocket hijacking). */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.method === 'GET' && req.headers.get('Upgrade') !== 'websocket';
  return origin === new URL(req.url).origin;
}

/** Computer players requested at creation; the room clamps this to the game's seat limit. */
const bots = (n: unknown) => (Number.isInteger(n) ? Math.max(0, Math.min(Number(n), 8)) : 0);

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const v = JSON.parse(text || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

async function sessionHash(req: Request, code: string): Promise<string | null> {
  const token = getCookie(req, sessionCookie(code));
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? sha256(token) : null;
}

function roomStub(env: Env, code: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(code));
}

async function api(req: Request, env: Env, url: URL): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, 'origin', 'Cross-site request refused.');
  const secure = url.protocol === 'https:';
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'rooms', code?, verb?]

  if (parts[1] === 'games' && req.method === 'GET') {
    return json(LISTED_GAMES.map((id) => ({ id, name: GAMES[id].meta.name, minPlayers: GAMES[id].meta.minPlayers, maxPlayers: GAMES[id].meta.maxPlayers })));
  }
  if (parts[1] !== 'rooms') return fail(404, 'not-found', 'Not found.');

  // POST /api/rooms — create a room and take seat 0.
  if (parts.length === 2 && req.method === 'POST') {
    const body = await readBody(req);
    if (!body) return fail(400, 'bad-request', 'Invalid request.');
    const gameId = typeof body.gameId === 'string' ? body.gameId : 'bohnanza';
    if (!LISTED_GAMES.includes(gameId))
      return fail(400, 'bad-game', 'Unknown game.');
    const token = randomToken();
    const th = await sha256(token);
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = randomCode();
      const res = await roomStub(env, code).fetch('https://room/create', {
        method: 'POST',
        body: JSON.stringify({ code, gameId, name: body.name, th, bots: bots(body.bots) }),
      });
      if (res.status === 409) continue;
      const out = await res.text();
      const headers: Record<string, string> = res.ok ? { 'set-cookie': setCookie(sessionCookie(code), token, SESSION_MAX_AGE, secure) } : {};
      return new Response(out, { status: res.status, headers: { 'content-type': 'application/json', ...SECURITY_HEADERS, ...headers } });
    }
    return fail(503, 'busy', 'Could not allocate a room code. Try again.');
  }

  const code = normalizeCode(parts[2] ?? '');
  if (!code) return fail(404, 'no-room', 'Room codes are 6 letters and digits.');
  const stub = roomStub(env, code);

  // GET /api/rooms/:code — public summary (+ whether the caller holds a seat).
  if (parts.length === 3 && req.method === 'GET') {
    const th = await sessionHash(req, code);
    const res = await stub.fetch('https://room/summary', { headers: th ? { 'x-th': th } : {} });
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json', ...SECURITY_HEADERS } });
  }

  // POST /api/rooms/:code/join — take a seat (or confirm an existing one).
  if (parts[3] === 'join' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body) return fail(400, 'bad-request', 'Invalid request.');
    const existing = getCookie(req, sessionCookie(code));
    const token = existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomToken();
    const th = await sha256(token);
    const res = await stub.fetch('https://room/join', { method: 'POST', body: JSON.stringify({ name: body.name, th }) });
    const headers: Record<string, string> = res.ok ? { 'set-cookie': setCookie(sessionCookie(code), token, SESSION_MAX_AGE, secure) } : {};
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json', ...SECURITY_HEADERS, ...headers } });
  }

  // POST /api/rooms/:code/forget — drop this browser's session cookie for the room.
  if (parts[3] === 'forget' && req.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': setCookie(sessionCookie(code), '', 0, secure) });
  }

  return fail(404, 'not-found', 'Not found.');
}

async function socket(req: Request, env: Env, url: URL): Promise<Response> {
  if (req.headers.get('Upgrade') !== 'websocket') return fail(426, 'upgrade', 'Expected a WebSocket.');
  if (!sameOrigin(req)) return fail(403, 'origin', 'Cross-site request refused.');
  const code = normalizeCode(url.pathname.split('/')[2] ?? '');
  if (!code) return fail(404, 'no-room', 'Unknown room.');
  const th = await sessionHash(req, code);
  if (!th) return fail(403, 'unauthorized', 'Join the room first.');
  const headers = new Headers(req.headers);
  headers.set('x-th', th);
  headers.delete('cookie');
  return roomStub(env, code).fetch(new Request('https://room/ws', { headers }));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      if (url.pathname.startsWith('/ws/')) return await socket(req, env, url);
    } catch (e) {
      console.error('worker error', (e as Error).message);
      return fail(500, 'internal', 'Something went wrong.');
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
