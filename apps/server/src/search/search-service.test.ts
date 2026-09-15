import type { SearchFilter } from '@staff-pulse/contracts';
import { describe, expect, it, vi } from 'vitest';

import { silentLogger } from '../lib/logger';
import { createSearchService } from './index';

const config = { anthropicApiKey: null, anthropicModel: 'test-model', aiTimeoutMs: 1000 };

describe('createSearchService', () => {
  it('без ключа работает только по правилам и кэширует результат', async () => {
    const service = createSearchService({ config, log: silentLogger });
    expect(service.llmEnabled).toBe(false);

    const first = await service.parse('отделы с эффективностью ниже 50');
    expect(first).toMatchObject({
      source: 'rules',
      filter: { levels: [2], performance: { max: 50 } },
    });
    const second = await service.parse('  Отделы  с эффективностью ниже 50 ');
    expect(second).toBe(first);
  });

  it('нераспознанный запрос → source none и filter null', async () => {
    const service = createSearchService({ config, log: silentLogger });
    expect(await service.parse('платформа')).toMatchObject({ filter: null, source: 'none' });
  });

  it('LLM в приоритете; при её отказе — правила', async () => {
    const llm = vi
      .fn<(query: string) => Promise<SearchFilter | null>>()
      .mockResolvedValueOnce({ levels: [3], performance: { min: 90 } })
      .mockResolvedValueOnce(null);
    const service = createSearchService({
      config: { ...config, anthropicApiKey: 'key' },
      log: silentLogger,
      llm,
    });
    expect(service.llmEnabled).toBe(true);

    expect(await service.parse('лучшие команды')).toMatchObject({
      source: 'llm',
      filter: { levels: [3], performance: { min: 90 } },
    });
    expect(await service.parse('команды с эффективностью выше 80')).toMatchObject({
      source: 'rules',
      filter: { levels: [3], performance: { min: 80 } },
    });
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('пустой фильтр от LLM не считается результатом', async () => {
    const service = createSearchService({
      config: { ...config, anthropicApiKey: 'key' },
      log: silentLogger,
      llm: async () => ({}),
    });
    expect(await service.parse('что-то непонятное')).toMatchObject({ source: 'none' });
  });
});
