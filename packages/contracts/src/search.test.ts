import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { isEmptyFilter, SearchFilterSchema, SearchParseResponseSchema } from './search';

describe('SearchFilterSchema', () => {
  it('принимает пустой фильтр и полный набор условий', () => {
    expect(z.safeParse(SearchFilterSchema, {}).success).toBe(true);
    const full = z.safeParse(SearchFilterSchema, {
      text: 'продаж',
      levels: [2, 3],
      headcount: { min: 10 },
      budget: { max: 50_000_000 },
      performance: { min: 50, max: 80 },
      within: 'Платформа',
      sort: { column: 'avgPerformance', direction: 'desc' },
      limit: 5,
    });
    expect(full.success).toBe(true);
  });

  it('отклоняет неизвестный столбец сортировки и нецелый уровень', () => {
    expect(
      z.safeParse(SearchFilterSchema, { sort: { column: 'budget', direction: 'desc' } }).success,
    ).toBe(false);
    expect(z.safeParse(SearchFilterSchema, { levels: [1.5] }).success).toBe(false);
    expect(z.safeParse(SearchFilterSchema, { limit: 0 }).success).toBe(false);
  });

  it('isEmptyFilter различает пустой и непустой фильтры', () => {
    expect(isEmptyFilter({})).toBe(true);
    expect(isEmptyFilter({ levels: [1] })).toBe(false);
  });
});

describe('SearchParseResponseSchema', () => {
  it('принимает null-фильтр с источником none', () => {
    expect(z.safeParse(SearchParseResponseSchema, { filter: null, source: 'none' }).success).toBe(
      true,
    );
  });

  it('отклоняет неизвестный источник', () => {
    expect(z.safeParse(SearchParseResponseSchema, { filter: null, source: 'magic' }).success).toBe(
      false,
    );
  });
});
