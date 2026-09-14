import { useMemo } from 'react';

import { useOrgTreeQuery, type OrgTreeQueryOptions } from '../api/org-tree-query';
import { useOrgStore } from '../store/OrgStoreProvider';
import type { FlashMap } from '../store/org-store';
import type { OrgModel } from './org-model';

export type OrgModelState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'empty'; refetch: () => void }
  | {
      status: 'ready';
      model: OrgModel;
      /** Недавно изменённые ячейки (для fade-out анимации). */
      flashes: FlashMap;
      isFetching: boolean;
      /** Ошибка фонового обновления: данные на экране есть, но могут быть устаревшими. */
      refetchError: unknown;
      refetch: () => void;
    };

type BuildResult = { model: OrgModel } | { error: unknown };

/** Состояние экрана поверх запроса: загрузка, ошибка, пусто, готово. */
export function useOrgModel(options: OrgTreeQueryOptions = {}): OrgModelState {
  const query = useOrgTreeQuery(options);
  const store = useOrgStore();
  const data = query.data;

  // Модель строится один раз на ссылку снимка. Патчи live-канала обновляют её инкрементально
  // через store и записывают снимок в кэш, поэтому здесь ссылка совпадает и пересборки нет.
  const built = useMemo<BuildResult | null>(() => {
    if (!data) return null;
    try {
      return { model: store.modelFor(data) };
    } catch (error) {
      return { error };
    }
  }, [data, store]);

  const refetch = () => void query.refetch();

  if (!built) {
    if (query.isError) return { status: 'error', error: query.error, retry: refetch };
    return { status: 'loading' };
  }
  if ('error' in built) return { status: 'error', error: built.error, retry: refetch };
  if (built.model.tree.nodes.size === 0) return { status: 'empty', refetch };
  return {
    status: 'ready',
    model: built.model,
    flashes: store.flashes,
    isFetching: query.isFetching,
    refetchError: query.isError ? query.error : null,
    refetch,
  };
}
