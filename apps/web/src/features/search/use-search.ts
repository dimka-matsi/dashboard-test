import type { SearchSource } from '@staff-pulse/contracts';
import { useState } from 'react';

import { FILTER_DEBOUNCE_MS } from '@/features/analytics-table/rows';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

import { useSearchParse, type SearchParseState } from './use-search-parse';

export interface SearchState {
  /** Текст в поле ввода (обновляется мгновенно). */
  query: string;
  setQuery: (value: string) => void;
  /** Текст для фильтра по названию — с задержкой 250 мс. */
  debouncedQuery: string;
  /** Разбор естественного языка на сервере. */
  parse: SearchParseState;
  /** Источник интерпретации для бейджа; null, пока разбор не запрашивался. */
  source: SearchSource | null;
  /** Есть ли активный поиск (текстовый или структурированный). */
  isActive: boolean;
}

/** Единое состояние поиска для шапки, таблицы и подсветки в дереве. */
export function useSearch(): SearchState {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, FILTER_DEBOUNCE_MS);
  const parse = useSearchParse(query);
  return {
    query,
    setQuery,
    debouncedQuery,
    parse,
    source: parse.attempted ? parse.source : null,
    isActive: debouncedQuery.trim() !== '' || parse.filter !== null,
  };
}
