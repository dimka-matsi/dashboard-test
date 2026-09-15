import { memo, useEffect, useRef } from 'react';
import styled from 'styled-components';

import type { ChangedField } from '@/entities/org/model/apply-changes';
import { performanceBucket } from '@/entities/org/model/performance';
import type { NodeId } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { formatBudget, formatInteger, formatPerformance } from '@/shared/lib/format';
import { Flash } from '@/shared/ui/Flash';

import type { SortColumn, SortState, TableRow } from './rows';
import { useGridNavigation } from './use-grid-navigation';

interface ColumnDef {
  key: SortColumn;
  label: string;
  align: 'left' | 'right';
  /** Доля ширины таблицы (table-layout: fixed). */
  width: string;
  /** Какое изменение подсвечивает ячейку. */
  flashField?: ChangedField;
}

export const COLUMNS: readonly ColumnDef[] = [
  { key: 'name', label: 'Подразделение', align: 'left', width: '28%' },
  { key: 'level', label: 'Уровень', align: 'left', width: '16%' },
  {
    key: 'totalHeadcount',
    label: 'Всего сотрудников',
    align: 'right',
    width: '13%',
    flashField: 'totalHeadcount',
  },
  {
    key: 'totalBudget',
    label: 'Бюджет суммарный',
    align: 'right',
    width: '21%',
    flashField: 'totalBudget',
  },
  {
    key: 'avgPerformance',
    label: 'Средняя эффективность',
    align: 'right',
    width: '22%',
    flashField: 'avgPerformance',
  },
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
    background: ${({ theme }) => theme.colors.surface};
    text-align: left;
    font-weight: 600;
    font-size: ${({ theme }) => theme.font.size.xs};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: normal;
    line-height: 1.25;
    vertical-align: bottom;
  }

  td {
    height: 44px;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover td {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  tbody tr[aria-selected='true'] td {
    background: ${({ theme }) => theme.colors.accentSoft};
  }

  tbody tr[aria-selected='true'] td:first-child {
    box-shadow: inset 3px 0 0 ${({ theme }) => theme.colors.accent};
  }

  td:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: -2px;
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

/* Метр: заливка несёт статус, дорожка — светлый шаг того же цвета; число рядом в цвете текста. */
const MeterCell = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
`;

const MeterTrack = styled.span`
  display: inline-block;
  flex: none;
  width: 56px;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border};

  &[data-bucket='low'] {
    background: ${({ theme }) => theme.colors.performanceSoft.low};
  }

  &[data-bucket='medium'] {
    background: ${({ theme }) => theme.colors.performanceSoft.medium};
  }

  &[data-bucket='high'] {
    background: ${({ theme }) => theme.colors.performanceSoft.high};
  }
`;

const MeterFill = styled.span<{ $pct: number }>`
  display: block;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  height: 100%;
  border-radius: 3px;
  transition: width ${({ theme }) => theme.motion.base} ease;

  &[data-bucket='low'] {
    background: ${({ theme }) => theme.colors.performance.low};
  }

  &[data-bucket='medium'] {
    background: ${({ theme }) => theme.colors.performance.medium};
  }

  &[data-bucket='high'] {
    background: ${({ theme }) => theme.colors.performance.high};
  }
`;

const MeterValue = styled.span`
  min-width: 36px;
  text-align: right;
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
  /** Недавно изменённые ячейки: подсветка с затуханием. */
  flashes: FlashMap;
  /** Текущий (уже применённый) фильтр — для текста пустого результата. */
  query: string;
}

interface RowProps {
  row: TableRow;
  rowIndex: number;
  selected: boolean;
  flash: ReadonlyMap<ChangedField, number> | undefined;
  /** Индекс активной ячейки в этой строке (roving tabindex) или -1. */
  activeCol: number;
  onSelect: (id: NodeId) => void;
  onCellFocus: (rowId: NodeId, col: number) => void;
}

const TableRowItem = memo(
  function TableRowItem({
    row,
    rowIndex,
    selected,
    flash,
    activeCol,
    onSelect,
    onCellFocus,
  }: RowProps) {
    const ref = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
      if (selected) ref.current?.scrollIntoView?.({ block: 'nearest' });
    }, [selected]);

    const cell = (col: number) => ({
      role: 'gridcell' as const,
      tabIndex: col === activeCol ? 0 : -1,
      'data-row': rowIndex,
      'data-col': col,
      'aria-colindex': col + 1,
      onFocus: () => onCellFocus(row.id, col),
    });

    return (
      <tr
        ref={ref}
        role="row"
        aria-selected={selected}
        aria-rowindex={rowIndex + 2}
        data-node-id={row.id}
        onClick={() => onSelect(row.id)}
      >
        <NameCell {...cell(0)} title={row.path}>
          {row.name}
        </NameCell>
        <td {...cell(1)}>
          <LevelBadge>
            <b>{row.level}</b>
            {row.levelLabel}
          </LevelBadge>
        </td>
        <td {...cell(2)} data-align="right">
          <Flash at={flash?.get('totalHeadcount')}>{formatInteger(row.totalHeadcount)}</Flash>
        </td>
        <td {...cell(3)} data-align="right">
          <Flash at={flash?.get('totalBudget')}>{formatBudget(row.totalBudget)}</Flash>
        </td>
        <td {...cell(4)} data-align="right">
          <Flash at={flash?.get('avgPerformance')}>
            <MeterCell>
              {row.avgPerformance !== null && (
                <MeterTrack data-bucket={performanceBucket(row.avgPerformance)} aria-hidden="true">
                  <MeterFill
                    $pct={Math.round(row.avgPerformance)}
                    data-bucket={performanceBucket(row.avgPerformance)}
                  />
                </MeterTrack>
              )}
              <MeterValue>{formatPerformance(row.avgPerformance)}</MeterValue>
            </MeterCell>
          </Flash>
        </td>
      </tr>
    );
  },
  // Строка перерисовывается, только если изменились её данные, выделение, подсветка или фокус.
  (prev, next) =>
    prev.row.id === next.row.id &&
    prev.row.node === next.row.node &&
    prev.row.aggregate === next.row.aggregate &&
    prev.rowIndex === next.rowIndex &&
    prev.selected === next.selected &&
    prev.flash === next.flash &&
    prev.activeCol === next.activeCol &&
    prev.onSelect === next.onSelect &&
    prev.onCellFocus === next.onCellFocus,
);

export function AnalyticsTable({
  rows,
  sort,
  onSortBy,
  onReverse,
  selectedId,
  onSelect,
  flashes,
  query,
}: AnalyticsTableProps) {
  const { bodyRef, onKeyDown, onCellFocus, activeRow, activeCol } = useGridNavigation({
    rows,
    columnCount: COLUMNS.length,
    onActivate: onSelect,
  });

  return (
    <Table
      role="grid"
      aria-label="Аналитика подразделений"
      aria-rowcount={rows.length + 1}
      aria-colcount={COLUMNS.length}
    >
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} width={column.width} />
        ))}
      </colgroup>
      <thead>
        <tr role="row" aria-rowindex={1}>
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
      <tbody ref={bodyRef} onKeyDown={onKeyDown}>
        {rows.length === 0 ? (
          <tr role="row">
            <EmptyRow role="gridcell" colSpan={COLUMNS.length}>
              {query.trim() !== ''
                ? `Ничего не найдено по запросу «${query.trim()}»`
                : 'Нет данных для отображения'}
            </EmptyRow>
          </tr>
        ) : (
          rows.map((row, index) => (
            <TableRowItem
              key={row.id}
              row={row}
              rowIndex={index}
              selected={row.id === selectedId}
              flash={flashes.get(row.id)}
              activeCol={index === activeRow ? activeCol : -1}
              onSelect={onSelect}
              onCellFocus={onCellFocus}
            />
          ))
        )}
      </tbody>
    </Table>
  );
}
