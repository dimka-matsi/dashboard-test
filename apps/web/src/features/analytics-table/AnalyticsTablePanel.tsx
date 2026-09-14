import { useMemo, useState } from 'react';
import styled from 'styled-components';

import type { OrgModel } from '@/entities/org/model/org-model';
import type { NodeId } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui/Button';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/shared/ui/Panel';
import { SearchInput } from '@/shared/ui/TextInput';

import { AnalyticsTable } from './AnalyticsTable';
import { buildRows, FILTER_DEBOUNCE_MS, filterRows, sortRows } from './rows';
import { useSort } from './use-sort';

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  margin-left: ${({ theme }) => theme.space.sm};
`;

export interface AnalyticsTablePanelProps {
  model: OrgModel;
  flashes: FlashMap;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  hidden?: boolean;
}

export function AnalyticsTablePanel({
  model,
  flashes,
  selectedId,
  onSelect,
  hidden,
}: AnalyticsTablePanelProps) {
  const [query, setQuery] = useState('');
  // Поле ввода обновляется мгновенно, а фильтрация — с задержкой 250 мс после последнего символа.
  const debouncedQuery = useDebouncedValue(query, FILTER_DEBOUNCE_MS);
  const { sort, sortBy, reverse, reset } = useSort();

  // Конвейер производного состояния: каждый шаг пересчитывается только при смене своих входов.
  const rows = useMemo(() => buildRows(model), [model]);
  const filtered = useMemo(() => filterRows(rows, debouncedQuery), [rows, debouncedQuery]);
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort]);

  return (
    <Panel aria-label="Аналитическая таблица" hidden={hidden}>
      <PanelHeader>
        <div>
          <PanelTitle>Таблица</PanelTitle>
          <Meta>
            показано {sorted.length} из {rows.length}
          </Meta>
        </div>
        <Controls>
          {sort && (
            <Button type="button" $size="sm" $variant="ghost" onClick={reset}>
              Сбросить сортировку
            </Button>
          )}
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Фильтр по названию подразделения"
            placeholder="Фильтр по названию"
          />
        </Controls>
      </PanelHeader>
      <PanelBody $flush>
        <AnalyticsTable
          rows={sorted}
          sort={sort}
          onSortBy={sortBy}
          onReverse={reverse}
          selectedId={selectedId}
          onSelect={onSelect}
          flashes={flashes}
          query={debouncedQuery}
        />
      </PanelBody>
    </Panel>
  );
}
