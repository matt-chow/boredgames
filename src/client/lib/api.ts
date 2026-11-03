import type { ApiError, CreateRoomResponse, RoomSummary } from '../../shared/protocol';

export class ApiFailure extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    });
  } catch {
    throw new ApiFailure('network', 'Can’t reach the server. Check your connection and try again.', 0);
  }
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const e = body as ApiError | null;
    throw new ApiFailure(e?.code ?? 'error', e?.error ?? 'Something went wrong.', res.status);
  }
  return body as T;
}

export const api = {
  create: (name: string, gameId = 'bohnanza', bots = 0) =>
    call<CreateRoomResponse>('/api/rooms', { method: 'POST', body: JSON.stringify({ name, gameId, bots }) }),
  summary: (code: string) => call<RoomSummary>(`/api/rooms/${code}`),
  join: (code: string, name: string) =>
    call<CreateRoomResponse>(`/api/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  forget: (code: string) => call<{ ok: true }>(`/api/rooms/${code}/forget`, { method: 'POST', body: '{}' }),
};
