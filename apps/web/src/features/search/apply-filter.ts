import type { NumberRange, SearchFilter } from '@staff-pulse/contracts';

import { ancestorsOf } from '@/entities/org/model/build-org-tree';
import type { OrgTree } from '@/entities/org/model/types';
import {
  filterRows,
  normalizeQuery,
  sortRows,
  type TableRow,
} from '@/features/analytics-table/rows';

function inRange(value: number | null, range: NumberRange | undefined): boolean {
  if (!range) return true;
  if (value === null) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/**
 * Применяет структурированный фильтр к строкам таблицы: название, уровни, диапазоны метрик,
 * предок (`within`), затем сортировка и ограничение числа строк из фильтра.
 * Условия по метрикам сравниваются с суммарными показателями строки.
 */
export function applySearchFilter(
  rows: readonly TableRow[],
  filter: SearchFilter,
  tree: OrgTree,
): readonly TableRow[] {
  let result: readonly TableRow[] = filter.text ? filterRows(rows, filter.text) : rows;

  const levels = filter.levels && filter.levels.length > 0 ? new Set(filter.levels) : null;
  const within = filter.within ? normalizeQuery(filter.within) : null;

  result = result.filter((row) => {
    if (levels && !levels.has(row.level)) return false;
    if (!inRange(row.totalHeadcount, filter.headcount)) return false;
    if (!inRange(row.totalBudget, filter.budget)) return false;
    if (!inRange(row.avgPerformance, filter.performance)) return false;
    if (within) {
      const ancestorMatches = ancestorsOf(tree, row.id).some((id) =>
        normalizeQuery(tree.nodes.get(id)?.name ?? '').includes(within),
      );
      if (!ancestorMatches) return false;
    }
    return true;
  });

  if (filter.sort) result = sortRows(result, filter.sort);
  if (filter.limit !== undefined) result = result.slice(0, filter.limit);
  return result;
}

/** Похоже ли на запрос на естественном языке, а не на кусок названия: две и более слов или число. */
export function looksLikeNaturalLanguage(query: string): boolean {
  const normalized = normalizeQuery(query);
  if (normalized.length < 4) return false;
  return normalized.split(' ').length >= 2 || /\d/.test(normalized);
}

/** Строки, прошедшие текущий поиск: структурированный фильтр или подстрока названия. */
export function applySearch(
  rows: readonly TableRow[],
  search: { debouncedQuery: string; parse: { filter: SearchFilter | null } },
  tree: OrgTree,
): readonly TableRow[] {
  if (search.parse.filter) {
    return applySearchFilter(rows, { ...search.parse.filter, sort: undefined }, tree);
  }
  return filterRows(rows, search.debouncedQuery);
}
