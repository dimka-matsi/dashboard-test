import { useState } from 'react';
import styled from 'styled-components';

import { describeError } from '@/entities/org/model/describe-error';
import type { NodeId } from '@/entities/org/model/types';
import { useOrgTree } from '@/entities/org/model/use-org-tree';
import { OrgTreePanel } from '@/features/org-tree/OrgTreePanel';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/StatePanel';

import { Header } from './Header';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

const Main = styled.main`
  flex: 1;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  display: grid;
  gap: ${({ theme }) => theme.space.lg};
  align-content: start;
`;

const Notice = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.warningSoft};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export function Dashboard() {
  const state = useOrgTree();
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);

  const isFetching = state.status === 'ready' && state.isFetching;
  const onRefresh =
    state.status === 'ready' || state.status === 'empty' ? state.refetch : undefined;

  return (
    <Shell>
      <Header isFetching={isFetching} onRefresh={onRefresh} />
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

        {state.status === 'ready' && (
          <>
            {state.refetchError !== null && (
              <Notice role="status">
                Не удалось обновить данные: {describeError(state.refetchError).title}. Показаны
                последние успешно загруженные.
              </Notice>
            )}
            <OrgTreePanel tree={state.tree} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        )}
      </Main>
    </Shell>
  );
}
