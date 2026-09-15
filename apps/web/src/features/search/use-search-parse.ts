import {
  SearchParseResponseSchema,
  type SearchFilter,
  type SearchSource,
} from '@staff-pulse/contracts';
import { useQuery } from '@tanstack/react-query';

import { normalizeQuery } from '@/features/analytics-table/rows';
import { fetchJson } from '@/shared/api/http';
import { API_BASE } from '@/shared/config/env';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

import { looksLikeNaturalLanguage } from './apply-filter';

/** Пауза перед обращением к серверу за разбором: длиннее, чем у текстового фильтра. */
export const PARSE_DEBOUNCE_MS = 500;

export interface SearchParseState {
  /** Структурированный фильтр для текущего запроса; null — применяется текстовый поиск. */
  filter: SearchFilter | null;
  source: SearchSource | null;
  isParsing: boolean;
  /** Запрос отправлялся на разбор (иначе он слишком короткий/простой для этого). */
  attempted: boolean;
}

export function parseSearchQuery(query: string, signal?: AbortSignal) {
  return fetchJson(`${API_BASE}/search/parse`, SearchParseResponseSchema, {
    method: 'POST',
    body: { query },
    signal,
  });
}

/**
 * Разбор запроса на естественном языке через сервер. Результат кэшируется по нормализованному
 * тексту навсегда (в рамках сессии): повторный ввод той же фразы не порождает запрос.
 * Любая ошибка означает fallback на текстовый поиск.
 */
export function useSearchParse(query: string): SearchParseState {
  const debounced = useDebouncedValue(query, PARSE_DEBOUNCE_MS);
  const normalized = normalizeQuery(debounced);
  const enabled = looksLikeNaturalLanguage(normalized);

  const result = useQuery({
    queryKey: ['search-parse', normalized],
    queryFn: ({ signal }) => parseSearchQuery(normalized, signal),
    enabled,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });

  if (!enabled || normalizeQuery(query) !== normalized) {
    // запрос ещё меняется или слишком прост: фильтр не применяем
    return {
      filter: null,
      source: null,
      isParsing: enabled && normalizeQuery(query) !== normalized,
      attempted: false,
    };
  }
  return {
    filter: result.data?.filter ?? null,
    source: result.data?.source ?? (result.isError ? 'none' : null),
    isParsing: result.isPending,
    attempted: true,
  };
}
