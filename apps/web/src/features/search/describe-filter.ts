import type { NumberRange, SearchFilter, SortColumn } from '@staff-pulse/contracts';

import { levelLabel } from '@/entities/org/model/levels';
import { formatBudget, formatInteger } from '@/shared/lib/format';

const COLUMN_LABELS: Record<SortColumn, string> = {
  name: 'название',
  level: 'уровень',
  totalHeadcount: 'численность',
  totalBudget: 'бюджет',
  avgPerformance: 'эффективность',
};

function describeRange(
  label: string,
  range: NumberRange,
  format: (value: number) => string,
): string | null {
  const { min, max } = range;
  if (min !== undefined && max !== undefined) return `${label} ${format(min)} – ${format(max)}`;
  if (min !== undefined) return `${label} ≥ ${format(min)}`;
  if (max !== undefined) return `${label} ≤ ${format(max)}`;
  return null;
}

/** Человекочитаемые «чипы» для активного структурированного фильтра. */
export function describeFilter(filter: SearchFilter): string[] {
  const chips: string[] = [];
  if (filter.levels && filter.levels.length > 0) {
    chips.push(
      `уровень: ${filter.levels.map((level) => levelLabel(level).toLowerCase()).join(', ')}`,
    );
  }
  if (filter.within) chips.push(`внутри «${filter.within}»`);
  if (filter.text) chips.push(`название содержит «${filter.text}»`);
  const headcount =
    filter.headcount && describeRange('сотрудников', filter.headcount, formatInteger);
  if (headcount) chips.push(headcount);
  const budget = filter.budget && describeRange('бюджет', filter.budget, formatBudget);
  if (budget) chips.push(budget);
  const performance =
    filter.performance && describeRange('эффективность', filter.performance, (v) => String(v));
  if (performance) chips.push(performance);
  if (filter.sort) {
    chips.push(
      `сортировка: ${COLUMN_LABELS[filter.sort.column]} ${filter.sort.direction === 'desc' ? '↓' : '↑'}`,
    );
  }
  if (filter.limit !== undefined) chips.push(`первые ${filter.limit}`);
  return chips;
}
