import { levelLabel } from '@/entities/org/model/levels';
import type { OrgModel } from '@/entities/org/model/org-model';
import type { NodeId } from '@/entities/org/model/types';

/** Строка аналитической таблицы: узел + его агрегаты в плоском виде. */
export interface TableRow {
  readonly id: NodeId;
  readonly name: string;
  readonly level: number;
  readonly levelLabel: string;
  /** Путь от корня: «Дивизион › Отдел › Команда» (для подсказки). */
  readonly path: string;
  readonly totalHeadcount: number;
  readonly totalBudget: number;
  readonly avgPerformance: number | null;
  /** Позиция в обходе дерева: порядок по умолчанию и стабилизатор сортировки. */
  readonly treeIndex: number;
}

export const SORT_COLUMNS = [
  'name',
  'level',
  'totalHeadcount',
  'totalBudget',
  'avgPerformance',
] as const;

export type SortColumn = (typeof SORT_COLUMNS)[number];
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}

export const FILTER_DEBOUNCE_MS = 250;

/** Строки в порядке обхода дерева. Считается один раз на модель. */
export function buildRows(model: OrgModel): readonly TableRow[] {
  const { tree, aggregates } = model;
  const pathCache = new Map<NodeId, string>();

  const pathOf = (id: NodeId): string => {
    const cached = pathCache.get(id);
    if (cached !== undefined) return cached;
    const node = tree.nodes.get(id);
    if (!node) return '';
    const path = node.parentId === null ? node.name : `${pathOf(node.parentId)} › ${node.name}`;
    pathCache.set(id, path);
    return path;
  };

  const rows: TableRow[] = [];
  tree.order.forEach((id, treeIndex) => {
    const node = tree.nodes.get(id);
    const aggregate = aggregates.get(id);
    if (!node || !aggregate) return;
    const level = tree.depth.get(id) ?? 1;
    rows.push({
      id,
      name: node.name,
      level,
      levelLabel: levelLabel(level),
      path: pathOf(id),
      totalHeadcount: aggregate.totalHeadcount,
      totalBudget: aggregate.totalBudget,
      avgPerformance: aggregate.avgPerformance,
      treeIndex,
    });
  });
  return rows;
}

/** Нормализация для поиска: регистр, лишние пробелы, ё → е. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru').replace(/ё/g, 'е');
}

/** Фильтр по названию (подстрока). Пустой запрос возвращает исходный массив той же ссылкой. */
export function filterRows(rows: readonly TableRow[], query: string): readonly TableRow[] {
  const needle = normalizeQuery(query);
  if (needle === '') return rows;
  return rows.filter((row) => normalizeQuery(row.name).includes(needle));
}

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

function compareBy(column: SortColumn, a: TableRow, b: TableRow): number {
  switch (column) {
    case 'name':
      return collator.compare(a.name, b.name);
    case 'level':
      return a.level - b.level;
    case 'totalHeadcount':
      return a.totalHeadcount - b.totalHeadcount;
    case 'totalBudget':
      return a.totalBudget - b.totalBudget;
    case 'avgPerformance':
      return (a.avgPerformance ?? 0) - (b.avgPerformance ?? 0);
  }
}

/**
 * Стабильная сортировка: при равенстве — порядок дерева. Значения null (эффективность без
 * сотрудников) всегда в конце, независимо от направления.
 */
export function sortRows(rows: readonly TableRow[], sort: SortState | null): readonly TableRow[] {
  if (!sort) return rows;
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.column === 'avgPerformance') {
      if (a.avgPerformance === null && b.avgPerformance !== null) return 1;
      if (b.avgPerformance === null && a.avgPerformance !== null) return -1;
    }
    return compareBy(sort.column, a, b) * sign || a.treeIndex - b.treeIndex;
  });
}
