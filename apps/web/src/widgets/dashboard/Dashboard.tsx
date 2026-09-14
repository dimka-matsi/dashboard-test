import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { describeError } from '@/entities/org/model/describe-error';
import type { NodeId } from '@/entities/org/model/types';
import { useOrgModel } from '@/entities/org/model/use-org-model';
import { AnalyticsTablePanel } from '@/features/analytics-table/AnalyticsTablePanel';
import { OrgTreePanel } from '@/features/org-tree/OrgTreePanel';
import { useViewLayout } from '@/features/view-mode/use-view-mode';
import { ViewSwitcher } from '@/features/view-mode/ViewSwitcher';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/StatePanel';

import { Header } from './Header';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Main = styled.main<{ $split: boolean }>`
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  display: grid;
  gap: ${({ theme }) => theme.space.lg};
  grid-template-columns: ${({ $split }) => ($split ? 'minmax(380px, 5fr) minmax(0, 7fr)' : '1fr')};
  grid-auto-rows: minmax(0, 1fr);
  align-content: stretch;

  /* Панели заполняют высоту и прокручиваются внутри себя */
  > section {
    min-height: 0;
  }

  /* Уведомление занимает всю ширину над панелями */
  > [role='status'] {
    grid-column: 1 / -1;
  }
`;

const Notice = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.warningSoft};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export function Dashboard() {
  const state = useOrgModel();
  const { isSplit, mode, setMode } = useViewLayout();
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);

  const selectFromTree = useCallback((id: NodeId) => setSelectedId(id), []);
  // Клик по строке таблицы выделяет узел в дереве; в режиме переключателя дерево ещё и показывается.
  const selectFromTable = useCallback(
    (id: NodeId) => {
      setSelectedId(id);
      if (!isSplit) setMode('tree');
    },
    [isSplit, setMode],
  );

  const isFetching = state.status === 'ready' && state.isFetching;
  const onRefresh =
    state.status === 'ready' || state.status === 'empty' ? state.refetch : undefined;

  return (
    <Shell>
      <Header
        isFetching={isFetching}
        onRefresh={onRefresh}
        center={
          state.status === 'ready' && !isSplit ? (
            <ViewSwitcher mode={mode} onChange={setMode} />
          ) : null
        }
      />
      <Main $split={isSplit && state.status === 'ready'} aria-busy={state.status === 'loading'}>
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

        {state.status === 'ready' && (
          <>
            {state.refetchError !== null && (
              <Notice role="status">
                Не удалось обновить данные: {describeError(state.refetchError).title}. Показаны
                последние успешно загруженные.
              </Notice>
            )}
            <OrgTreePanel
              tree={state.model.tree}
              selectedId={selectedId}
              onSelect={selectFromTree}
              hidden={!isSplit && mode !== 'tree'}
            />
            <AnalyticsTablePanel
              model={state.model}
              selectedId={selectedId}
              onSelect={selectFromTable}
              hidden={!isSplit && mode !== 'table'}
            />
          </>
        )}
      </Main>
    </Shell>
  );
}
