import * as z from 'zod/mini';

/** Столбцы аналитической таблицы, по которым возможна сортировка. */
export const SORT_COLUMNS = [
  'name',
  'level',
  'totalHeadcount',
  'totalBudget',
  'avgPerformance',
] as const;

export type SortColumn = (typeof SORT_COLUMNS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const NumberRangeSchema = z.object({
  min: z.optional(z.number()),
  max: z.optional(z.number()),
});

export type NumberRange = z.infer<typeof NumberRangeSchema>;

/**
 * Структурированный фильтр таблицы — результат разбора запроса на естественном языке.
 * Все поля необязательны; пустой объект означает «без условий».
 * Метрики сравниваются с СУММАРНЫМИ показателями узла (узел + потомки).
 */
export const SearchFilterSchema = z.object({
  /** Подстрока в названии подразделения. */
  text: z.optional(z.string().check(z.maxLength(200))),
  /** Уровни: 1 — дивизион, 2 — отдел, 3 — команда. */
  levels: z.optional(z.array(z.int().check(z.gte(1), z.lte(10)))),
  /** Суммарная численность. */
  headcount: z.optional(NumberRangeSchema),
  /** Суммарный бюджет, рубли. */
  budget: z.optional(NumberRangeSchema),
  /** Средняя эффективность 0–100. */
  performance: z.optional(NumberRangeSchema),
  /** Подстрока названия любого предка: «в дивизионе Платформа». */
  within: z.optional(z.string().check(z.maxLength(200))),
  sort: z.optional(
    z.object({
      column: z.enum(SORT_COLUMNS),
      direction: z.enum(SORT_DIRECTIONS),
    }),
  ),
  /** Оставить первые N строк после сортировки. */
  limit: z.optional(z.int().check(z.gte(1), z.lte(1000))),
});

export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export const SearchParseRequestSchema = z.object({
  query: z.string().check(z.minLength(1), z.maxLength(300)),
});

export type SearchParseRequest = z.infer<typeof SearchParseRequestSchema>;

export const SEARCH_SOURCES = ['llm', 'rules', 'none'] as const;

/** Ответ POST /api/search/parse: фильтр или null, если запрос не удалось интерпретировать. */
export const SearchParseResponseSchema = z.object({
  filter: z.nullable(SearchFilterSchema),
  /** Кто разобрал запрос: языковая модель, правила или никто. */
  source: z.enum(SEARCH_SOURCES),
  explanation: z.optional(z.string()),
});

export type SearchParseResponse = z.infer<typeof SearchParseResponseSchema>;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

/** Есть ли в фильтре хотя бы одно условие. */
export function isEmptyFilter(filter: SearchFilter): boolean {
  return Object.values(filter).every((value) => value === undefined);
}
