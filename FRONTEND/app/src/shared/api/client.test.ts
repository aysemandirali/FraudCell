import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAuth, resetAuthBridge } from './auth-bridge';
import { api } from './client';

function ok<T>(data: T, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      error: null,
      meta: { traceId: 'trace-ok' },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...headers } },
  );
}

function fail(status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      data: null,
      error: { code, message: 'request failed', details: null },
      meta: { traceId: 'trace-error' },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetAuthBridge();
});

describe('api client', () => {
  it('unwraps the envelope and preserves concurrency metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok(
        { id: 'case-1' },
        { ETag: 'W/"12"', 'Idempotency-Replayed': 'true' },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.patch<{ id: string }>('/cases/case-1', {
      body: { status: 'INCELENIYOR' },
      ifMatch: 12,
      idempotencyKey: 'idem-1',
    });

    expect(result).toEqual({
      data: { id: 'case-1' },
      etag: 12,
      traceId: 'trace-ok',
      replayed: true,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({
      'If-Match': '"12"',
      'Idempotency-Key': 'idem-1',
      'Content-Type': 'application/json',
    });
  });

  it('turns an error envelope into ApiRequestError with trace information', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(409, 'CONFLICT')));

    const request = api.post('/transactions', { body: {} });

    await expect(request).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      traceId: 'trace-error',
    });
  });

  it('uses one refresh request when concurrent calls receive 401', async () => {
    let token = 'expired-token';
    const refresh = vi.fn(async () => {
      token = 'renewed-token';
      return token;
    });
    configureAuth({ getAccessToken: () => token, refreshAccessToken: refresh });

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      return authorization === 'Bearer renewed-token'
        ? ok({ renewed: true })
        : fail(401, 'ACCESS_TOKEN_EXPIRED');
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([api.get('/first'), api.get('/second')]);

    expect(first.data).toEqual({ renewed: true });
    expect(second.data).toEqual({ renewed: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
