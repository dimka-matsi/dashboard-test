import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { describeError } from '@/entities/org/model/describe-error';
import { summarize } from '@/entities/org/model/summary';
import type { NodeId } from '@/entities/org/model/types';
import { useOrgModel } from '@/entities/org/model/use-org-model';
import { AnalyticsTablePanel } from '@/features/analytics-table/AnalyticsTablePanel';
import { buildRows } from '@/features/analytics-table/rows';
import { ConnectionIndicator } from '@/features/live-updates/ConnectionIndicator';
import { useLiveUpdates } from '@/features/live-updates/use-live-updates';
import { OrgTreePanel } from '@/features/org-tree/OrgTreePanel';
import { applySearch } from '@/features/search/apply-filter';
import { SearchBox } from '@/features/search/SearchBox';
import { useSearch } from '@/features/search/use-search';
import { useViewLayout } from '@/features/view-mode/use-view-mode';
import { isLiveEnabled } from '@/shared/config/env';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/StatePanel';

import { KpiStrip } from './KpiStrip';
import { Rail } from './Rail';
import { TopBar } from './TopBar';

const Shell = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  height: 100%;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: ${({ theme }) => theme.space.md};
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth}px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  overflow: auto;
`;

const Panels = styled.div<{ $split: boolean }>`
  display: grid;
  flex: 1;
  min-height: 420px;
  gap: ${({ theme }) => theme.space.md};
  grid-template-columns: ${({ $split }) => ($split ? 'minmax(380px, 5fr) minmax(0, 7fr)' : '1fr')};
  grid-auto-rows: minmax(0, 1fr);

  > section {
    min-height: 0;
  }
`;

const Notice = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.warningSoft};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

/** Период фонового поллинга, когда live-канал долго не восстанавливается. */
const POLLING_FALLBACK_MS = 15_000;

export function Dashboard() {
  const [liveEnabled, setLiveEnabled] = useState(() => isLiveEnabled());
  const live = useLiveUpdates({ enabled: liveEnabled });
  // Пока WebSocket не восстановился после нескольких попыток, данные обновляются редким поллингом.
  const liveDegraded =
    live.status.state === 'offline' ||
    (live.status.state === 'reconnecting' && live.status.attempt >= 2);
  const state = useOrgModel({ refetchInterval: liveDegraded ? POLLING_FALLBACK_MS : false });
  const { isWide, mode, effective, setMode } = useViewLayout();
  const search = useSearch();
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);

  const model = state.status === 'ready' ? state.model : null;
  const summary = useMemo(() => (model ? summarize(model) : null), [model]);
  // Узлы, найденные поиском, подсвечиваются в дереве той же функцией, что фильтрует таблицу.
  const matches = useMemo(() => {
    if (!model || !search.isActive) return null;
    return new Set(applySearch(buildRows(model), search, model.tree).map((row) => row.id));
  }, [model, search]);

  const selectFromTree = useCallback((id: NodeId) => setSelectedId(id), []);
  // Клик по строке таблицы выделяет узел в дереве; если дерево скрыто, показываем его.
  const selectFromTable = useCallback(
    (id: NodeId) => {
      setSelectedId(id);
      if (effective !== 'split') setMode('tree');
    },
    [effective, setMode],
  );

  const isFetching = state.status === 'ready' && state.isFetching;
  const onRefresh =
    state.status === 'ready' || state.status === 'empty' ? state.refetch : undefined;

  return (
    <Shell>
      <Rail
        mode={mode}
        isWide={isWide}
        onModeChange={setMode}
        liveEnabled={liveEnabled}
        onToggleLive={() => setLiveEnabled((value) => !value)}
      />
      <Content>
        <TopBar
          search={
            <SearchBox
              value={search.query}
              onChange={search.setQuery}
              source={search.source}
              isParsing={search.parse.isParsing}
            />
          }
          status={<ConnectionIndicator status={live.status} onReconnect={live.reconnect} />}
          isFetching={isFetching}
          onRefresh={onRefresh}
        />
        <Main aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && <LoadingState />}

          {state.status === 'error' && (
            <ErrorState {...describeError(state.error)} onRetry={state.retry} />
          )}

          {state.status === 'empty' && (
            <EmptyState
              action={
                <Button type="button" onClick={state.refetch}>
                  Обновить
                </Button>
              }
            />
          )}

          {state.status === 'ready' && summary && (
            <>
              {state.refetchError !== null && (
                <Notice role="status">
                  Не удалось обновить данные: {describeError(state.refetchError).title}. Показаны
                  последние успешно загруженные.
                </Notice>
              )}
              <KpiStrip summary={summary} flashes={state.flashes} />
              <Panels $split={effective === 'split'}>
                <OrgTreePanel
                  tree={state.model.tree}
                  flashes={state.flashes}
                  selectedId={selectedId}
                  matches={matches}
                  onSelect={selectFromTree}
                  hidden={effective === 'table'}
                />
                <AnalyticsTablePanel
                  model={state.model}
                  flashes={state.flashes}
                  selectedId={selectedId}
                  onSelect={selectFromTable}
                  search={search}
                  hidden={effective === 'tree'}
                />
              </Panels>
            </>
          )}
        </Main>
      </Content>
    </Shell>
  );
}
