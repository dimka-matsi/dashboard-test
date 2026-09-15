import { useMemo } from 'react';
import styled from 'styled-components';

import type { OrgModel } from '@/entities/org/model/org-model';
import type { NodeId } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { applySearch } from '@/features/search/apply-filter';
import { FilterChips } from '@/features/search/FilterChips';
import type { SearchState } from '@/features/search/use-search';
import { Button } from '@/shared/ui/Button';
import { Panel, PanelBody, PanelHeader, PanelMeta, PanelTitle } from '@/shared/ui/Panel';

import { AnalyticsTable } from './AnalyticsTable';
import { buildRows, sortRows } from './rows';
import { useSort } from './use-sort';

const Left = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  min-width: 0;
`;

export interface AnalyticsTablePanelProps {
  model: OrgModel;
  flashes: FlashMap;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  /** Состояние поиска из шапки: текст и разобранный фильтр. */
  search: SearchState;
  hidden?: boolean;
}

export function AnalyticsTablePanel({
  model,
  flashes,
  selectedId,
  onSelect,
  search,
  hidden,
}: AnalyticsTablePanelProps) {
  const { sort, sortBy, reverse, reset } = useSort();
  const filter = search.parse.filter;

  // Ручная сортировка пользователя важнее сортировки из AI-фильтра.
  const effectiveSort = sort ?? filter?.sort ?? null;

  // Конвейер производного состояния: каждый шаг пересчитывается только при смене своих входов.
  const rows = useMemo(() => buildRows(model), [model]);
  const filtered = useMemo(() => applySearch(rows, search, model.tree), [rows, search, model.tree]);
  const sorted = useMemo(() => sortRows(filtered, effectiveSort), [filtered, effectiveSort]);

  return (
    <Panel aria-label="Аналитическая таблица" hidden={hidden}>
      <PanelHeader>
        <Left>
          <div>
            <PanelTitle>Таблица</PanelTitle>
            <PanelMeta>
              показано {sorted.length} из {rows.length}
            </PanelMeta>
          </div>
          {filter && <FilterChips filter={filter} />}
        </Left>
        {sort && (
          <Button type="button" $size="sm" $variant="ghost" onClick={reset}>
            Сбросить сортировку
          </Button>
        )}
      </PanelHeader>
      <PanelBody $flush>
        <AnalyticsTable
          rows={sorted}
          sort={effectiveSort}
          onSortBy={sortBy}
          onReverse={reverse}
          selectedId={selectedId}
          onSelect={onSelect}
          flashes={flashes}
          query={filter ? '' : search.debouncedQuery}
        />
      </PanelBody>
    </Panel>
  );
}
