import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/http';

/** Данные считаются свежими 5 секунд: повторный монтаж/фокус в этом окне не порождает запрос. */
export const STALE_TIME_MS = 5_000;
/** Сколько держать неиспользуемые данные в памяти. */
export const GC_TIME_MS = 5 * 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Если ответ структурно равен предыдущему, ссылка на данные не меняется —
        // ни один useMemo/memo ниже не пересчитывается.
        structuralSharing: true,
      },
    },
  });
}

/** Невалидный ответ и 4xx — детерминированные ошибки, повторять их бессмысленно. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return true;
    if (error.kind === 'http') return (error.status ?? 500) >= 500;
    return false;
  }
  return true;
}
