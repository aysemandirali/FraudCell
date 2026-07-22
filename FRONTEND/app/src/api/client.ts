import type { ApiEnvelope } from '@/domain/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Backend'in standart hata zarfını taşıyan hata tipi (doküman §19). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Vaka durumu değişmiş — kullanıcıya yenilemesini söylememiz gerekir. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** Domain kuralı ihlali (geçersiz state transition vb.). */
  get isDomainViolation(): boolean {
    return this.status === 422;
  }

  /** Bağımlı servis geçici olarak kapalı — yeniden denenebilir. */
  get isDependencyDown(): boolean {
    return this.status === 503;
  }
}

/* --------------------------------------------------------- Token deposu -- */

/**
 * Access token yalnızca bellekte tutulur. Refresh token HttpOnly cookie'de
 * durduğu için JS'ten erişilmez (doküman §6) — XSS ile çalınamaz.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Refresh de başarısız olduğunda oturumu düşürmek için auth store bunu bağlar. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/* ------------------------------------------------------ Token yenileme -- */

/**
 * Eşzamanlı 401'lerde tek bir refresh çağrısı yapılır; diğerleri aynı sözü
 * bekler. Aksi hâlde token rotation reuse-detection'ı tetiklerdi (doküman §6).
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return false;

      const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
      if (!body.success) return false;

      accessToken = body.data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* -------------------------------------------------------------- request -- */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Sorgu parametreleri; undefined/null olanlar atlanır. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Yeniden deneme döngüsünü kırmak için iç kullanım. */
  _isRetry?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, query, _isRetry = false } = options;

  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    // Her istek uçtan uca izlenebilsin diye correlation ID taşınır (doküman §18).
    'X-Correlation-Id': crypto.randomUUID(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuya ulaşılamadı. Bağlantını kontrol et.');
  }

  // 401'de bir kez token yenileyip isteği tekrarla.
  if (response.status === 401 && !_isRetry && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, { ...options, _isRetry: true });

    accessToken = null;
    onUnauthorized?.();
    throw new ApiError(401, 'UNAUTHENTICATED', 'Oturumun sona erdi. Lütfen tekrar giriş yap.');
  }

  if (response.status === 204) return undefined as T;

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'Sunucudan beklenmeyen bir yanıt geldi.',
    );
  }

  if (!response.ok || !envelope.success) {
    const error = envelope.success ? null : envelope.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Beklenmeyen bir hata oluştu.',
      error?.details,
      envelope.meta?.traceId,
    );
  }

  return envelope.data;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
