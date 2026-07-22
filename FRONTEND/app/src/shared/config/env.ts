/**
 * Çalışma zamanı yapılandırması.
 *
 * DESIGN.MD "Production topolojisi": frontend ve API aynı origin'de yayınlanır,
 * tarayıcı yalnızca Gateway ile konuşur. Bu yüzden base URL varsayılan olarak
 * BOŞTUR — istekler `/api/v1/...` şeklinde göreli gider. Development'ta Vite
 * proxy'si, production'da Gateway'in kendisi karşılar.
 */

/** `mock`: MSW devrede, backend gerekmez. `live`: istekler Gateway'e gider. */
export type ApiMode = 'mock' | 'live';

function readMode(): ApiMode {
  const raw = import.meta.env.VITE_API_MODE;
  return raw === 'live' ? 'live' : 'mock';
}

export const env = {
  /**
   * Varsayılan `mock`. Backend'de yalnızca Identity ve Transaction servisleri
   * yazıldığı için `live` modda gamification/bildirim/AI ekranları veri
   * bulamaz; bu servisler yazılana kadar demo `mock` ile çalışır.
   */
  apiMode: readMode(),

  /** Göreli kalması kasıtlı — origin ayrımı yok, CORS yok. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',

  /** SSE bağlantı yolu (Gateway `/events/**`). */
  eventsPath: '/events/stream',

  get isMock(): boolean {
    return this.apiMode === 'mock';
  },
} as const;

/** API sürüm öneki — tüm yollar bunun altında. */
export const API_PREFIX = '/api/v1';
