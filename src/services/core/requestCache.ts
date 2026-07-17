const cache = new Map<string, Promise<unknown>>();

/**
 * Cachea la promesa de una petición por `key` durante la sesión (vive en
 * memoria, se limpia con un refresh). Pensado para catálogos casi-estáticos
 * (países, centros de operación, ejecutivos, etc.) que hoy se piden una vez
 * por cada componente/página que los necesita.
 */
export function cachedRequest<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = fetchFn().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
}
