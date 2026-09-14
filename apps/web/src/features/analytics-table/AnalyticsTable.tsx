import { memo, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { performanceBucket } from '@/entities/org/model/performance';
import type { NodeId } from '@/entities/org/model/types';
import { PerformanceDot } from '@/entities/org/ui/PerformanceDot';
import { formatBudget, formatInteger, formatPerformance } from '@/shared/lib/format';

import type { SortColumn, SortState, TableRow } from './rows';

interface ColumnDef {
  key: SortColumn;
  label: string;
  align: 'left' | 'right';
  /** Доля ширины таблицы (table-layout: fixed). */
  width: string;
}

export const COLUMNS: readonly ColumnDef[] = [
  { key: 'name', label: 'Подразделение', align: 'left', width: '34%' },
  { key: 'level', label: 'Уровень', align: 'left', width: '15%' },
  { key: 'totalHeadcount', label: 'Всего сотрудников', align: 'right', width: '15%' },
  { key: 'totalBudget', label: 'Бюджет суммарный', align: 'right', width: '20%' },
  { key: 'avgPerformance', label: 'Средняя эффективность', align: 'right', width: '16%' },
];

const Table = styled.table`
  width: 100%;
  min-width: 720px;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th[data-align='right'],
  td[data-align='right'] {
    text-align: right;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 0;
    background: ${({ theme }) => theme.colors.surfaceMuted};
    text-align: left;
    font-weight: 600;
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: normal;
    line-height: 1.2;
    vertical-align: bottom;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover td {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }

  tbody tr[aria-selected='true'] td {
    background: ${({ theme }) => theme.colors.accentSoft};
  }

  tbody tr[aria-selected='true'] td:first-child {
    box-shadow: inset 3px 0 0 ${({ theme }) => theme.colors.accent};
  }
`;

const HeaderButton = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: inherit;
  user-select: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  th[data-align='right'] & {
    justify-content: flex-end;
  }
`;

const SortMark = styled.span`
  display: inline-block;
  width: 10px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const NameCell = styled.td`
  font-weight: 500;
`;

const LevelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};

  b {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border: 1px solid ${({ theme }) => theme.colors.border};
    font-weight: 600;
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const PerformanceCell = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const EmptyRow = styled.td`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 32px 12px !important;
`;

export interface AnalyticsTableProps {
  rows: readonly TableRow[];
  sort: SortState | null;
  onSortBy: (column: SortColumn) => void;
  onReverse: () => void;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  /** Текущий (уже применённый) фильтр — для текста пустого результата. */
  query: string;
}

interface RowProps {
  row: TableRow;
  selected: boolean;
  onSelect: (id: NodeId) => void;
}

const TableRowItem = memo(function TableRowItem({ row, selected, onSelect }: RowProps) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);

  return (
    <tr
      ref={ref}
      role="row"
      aria-selected={selected}
      data-node-id={row.id}
      onClick={() => onSelect(row.id)}
    >
      <NameCell role="gridcell" title={row.path}>
        {row.name}
      </NameCell>
      <td role="gridcell">
        <LevelBadge>
          <b>{row.level}</b>
          {row.levelLabel}
        </LevelBadge>
      </td>
      <td role="gridcell" data-align="right">
        {formatInteger(row.totalHeadcount)}
      </td>
      <td role="gridcell" data-align="right">
        {formatBudget(row.totalBudget)}
      </td>
      <td role="gridcell" data-align="right">
        <PerformanceCell>
          {row.avgPerformance !== null && (
            <PerformanceDot
              data-bucket={performanceBucket(row.avgPerformance)}
              aria-hidden="true"
            />
          )}
          {formatPerformance(row.avgPerformance)}
        </PerformanceCell>
      </td>
    </tr>
  );
});

export function AnalyticsTable({
  rows,
  sort,
  onSortBy,
  onReverse,
  selectedId,
  onSelect,
  query,
}: AnalyticsTableProps) {
  return (
    <Table role="grid" aria-label="Аналитика подразделений" aria-rowcount={rows.length + 1}>
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} width={column.width} />
        ))}
      </colgroup>
      <thead>
        <tr role="row">
          {COLUMNS.map((column) => {
            const active = sort?.column === column.key;
            const ariaSort = active
              ? sort.direction === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none';
            return (
              <th
                key={column.key}
                role="columnheader"
                scope="col"
                aria-sort={ariaSort}
                data-align={column.align}
              >
                <HeaderButton
                  type="button"
                  title="Клик — сортировать, двойной клик — обратный порядок"
                  onClick={() => onSortBy(column.key)}
                  onDoubleClick={onReverse}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.shiftKey) {
                      event.preventDefault();
                      onReverse();
                    }
                  }}
                >
                  {column.label}
                  <SortMark aria-hidden="true">
                    {active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                  </SortMark>
                </HeaderButton>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr role="row">
            <EmptyRow role="gridcell" colSpan={COLUMNS.length}>
              {query.trim() !== ''
                ? `Ничего не найдено по запросу «${query.trim()}»`
                : 'Нет данных для отображения'}
            </EmptyRow>
          </tr>
        ) : (
          rows.map((row) => (
            <TableRowItem
              key={row.id}
              row={row}
              selected={row.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </tbody>
    </Table>
  );
}
