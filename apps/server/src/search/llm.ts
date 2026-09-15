import Anthropic from '@anthropic-ai/sdk';
import { SearchFilterSchema, type SearchFilter } from '@staff-pulse/contracts';
import * as z from 'zod/mini';

import type { Logger } from '../lib/logger';

/**
 * JSON Schema фильтра для structured output. Написана руками, а не выведена из zod:
 * без числовых ограничений, но с описаниями полей — так модель понимает семантику,
 * а границы всё равно проверяет zod-схема при валидации ответа.
 */
export const SEARCH_FILTER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: {
      type: 'string',
      description: 'Подстрока в названии подразделения (если ищут по имени)',
    },
    levels: {
      type: 'array',
      items: { type: 'integer', enum: [1, 2, 3] },
      description: 'Уровни: 1 — дивизион, 2 — отдел, 3 — команда',
    },
    headcount: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'number' }, max: { type: 'number' } },
      description: 'Суммарная численность (узел с потомками), человек',
    },
    budget: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'number' }, max: { type: 'number' } },
      description: 'Суммарный бюджет в рублях (1 млн = 1000000)',
    },
    performance: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'number' }, max: { type: 'number' } },
      description: 'Средняя эффективность, 0–100',
    },
    within: {
      type: 'string',
      description:
        'Подстрока названия родительского подразделения («в дивизионе Платформа» → «Платформа»)',
    },
    sort: {
      type: 'object',
      additionalProperties: false,
      properties: {
        column: {
          type: 'string',
          enum: ['name', 'level', 'totalHeadcount', 'totalBudget', 'avgPerformance'],
        },
        direction: { type: 'string', enum: ['asc', 'desc'] },
      },
      required: ['column', 'direction'],
    },
    limit: { type: 'integer', description: 'Оставить первые N строк («топ 5»)' },
  },
} as const;

const SYSTEM_PROMPT = `Ты переводишь запросы пользователя об орг-структуре компании в JSON-фильтр для таблицы подразделений.
Структура: дивизионы (уровень 1) → отделы (уровень 2) → команды (уровень 3).
У каждой строки таблицы есть суммарная численность, суммарный бюджет в рублях и средняя эффективность 0–100 (включая потомков).
Правила:
- Заполняй только те поля, которые явно следуют из запроса; ничего не выдумывай.
- «Больше/выше/от N» → min, «меньше/ниже/до N» → max; «от A до B» → min и max.
- «Топ N», «первые N», «лучшие N» → limit N и сортировка по убыванию нужной метрики; «худшие» → по возрастанию.
- Фраза вида «в дивизионе X», «внутри отдела X» → within: "X".
- Остаток, похожий на название, → text.
- Если запрос не содержит условий — верни пустой объект {}.`;

export interface LlmParserOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  log: Logger;
  /** Для тестов: подменяемый клиент. */
  client?: Pick<Anthropic, 'messages'>;
}

export type LlmParser = (query: string) => Promise<SearchFilter | null>;

/**
 * Разбор запроса языковой моделью через structured output (`output_config.format`):
 * ответ гарантированно соответствует JSON Schema, а затем ещё проверяется zod-схемой контракта.
 * Любая ошибка (сеть, лимиты, отказ модели, таймаут) → null, чтобы сервис перешёл к правилам.
 */
export function createLlmParser({
  apiKey,
  model,
  timeoutMs,
  log,
  client,
}: LlmParserOptions): LlmParser {
  const anthropic = client ?? new Anthropic({ apiKey, maxRetries: 1, timeout: timeoutMs });

  return async (query) => {
    try {
      const response = await anthropic.messages.create(
        {
          model,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
          output_config: {
            effort: 'low',
            format: { type: 'json_schema', schema: SEARCH_FILTER_JSON_SCHEMA },
          },
        },
        { timeout: timeoutMs },
      );

      if (response.stop_reason === 'refusal') {
        log.warn('AI-поиск: модель отказалась разбирать запрос', { query });
        return null;
      }
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return null;

      const parsed = z.safeParse(SearchFilterSchema, JSON.parse(textBlock.text));
      if (!parsed.success) {
        log.warn('AI-поиск: ответ модели не прошёл схему фильтра', {
          details: z.prettifyError(parsed.error),
        });
        return null;
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError)
        log.warn('AI-поиск: превышен лимит запросов к модели');
      else if (error instanceof Anthropic.APIConnectionError)
        log.warn('AI-поиск: нет соединения с API модели');
      else if (error instanceof Anthropic.APIError)
        log.warn(`AI-поиск: ошибка API ${error.status ?? ''}`, { message: error.message });
      else log.warn('AI-поиск: непредвиденная ошибка', { error: String(error) });
      return null;
    }
  };
}
