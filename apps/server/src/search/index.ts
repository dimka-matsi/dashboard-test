import { isEmptyFilter, type SearchParseResponse } from '@staff-pulse/contracts';

import type { ServerConfig } from '../config';
import type { Logger } from '../lib/logger';
import { createLlmParser, type LlmParser } from './llm';
import { normalizeSearchQuery, parseWithRules } from './rules';

export interface SearchService {
  parse(query: string): Promise<SearchParseResponse>;
  /** Включён ли разбор языковой моделью (есть ключ API). */
  readonly llmEnabled: boolean;
}

export interface SearchServiceOptions {
  config: Pick<ServerConfig, 'anthropicApiKey' | 'anthropicModel' | 'aiTimeoutMs'>;
  log: Logger;
  /** Для тестов: подменяемый LLM-парсер. */
  llm?: LlmParser | null;
  cacheSize?: number;
}

/**
 * Разбор поискового запроса: сначала языковая модель (если настроен ключ), затем правила.
 * Результаты кэшируются по нормализованному запросу, чтобы повторный ввод не ходил к модели.
 */
export function createSearchService({
  config,
  log,
  llm,
  cacheSize = 200,
}: SearchServiceOptions): SearchService {
  const llmParser =
    llm !== undefined
      ? llm
      : config.anthropicApiKey
        ? createLlmParser({
            apiKey: config.anthropicApiKey,
            model: config.anthropicModel,
            timeoutMs: config.aiTimeoutMs,
            log,
          })
        : null;

  const cache = new Map<string, SearchParseResponse>();
  const remember = (key: string, value: SearchParseResponse): SearchParseResponse => {
    cache.set(key, value);
    if (cache.size > cacheSize) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return value;
  };

  return {
    llmEnabled: llmParser !== null,
    async parse(query) {
      const key = normalizeSearchQuery(query);
      const cached = cache.get(key);
      if (cached) return cached;

      if (llmParser) {
        const filter = await llmParser(query);
        if (filter && !isEmptyFilter(filter)) {
          return remember(key, {
            filter,
            source: 'llm',
            explanation: `Разобрано моделью ${config.anthropicModel}`,
          });
        }
      }

      const byRules = parseWithRules(query);
      if (byRules && !isEmptyFilter(byRules)) {
        return remember(key, {
          filter: byRules,
          source: 'rules',
          explanation: 'Разобрано правилами',
        });
      }
      return remember(key, {
        filter: null,
        source: 'none',
        explanation: 'Условия не распознаны — текстовый поиск',
      });
    },
  };
}
