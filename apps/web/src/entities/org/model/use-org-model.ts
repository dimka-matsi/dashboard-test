import { useMemo } from 'react';

import { useOrgTreeQuery } from '../api/org-tree-query';
import { buildOrgModel, type OrgModel } from './org-model';

export type OrgModelState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'empty'; refetch: () => void }
  | {
      status: 'ready';
      model: OrgModel;
      isFetching: boolean;
      /** Ошибка фонового обновления: данные на экране есть, но могут быть устаревшими. */
      refetchError: unknown;
      refetch: () => void;
    };

type BuildResult = { model: OrgModel } | { error: unknown };

/** Состояние экрана поверх запроса: загрузка, ошибка, пусто, готово. */
export function useOrgModel(): OrgModelState {
  const query = useOrgTreeQuery();
  const data = query.data;

  // Модель (дерево + агрегаты) строится один раз на ссылку данных: structural sharing в кэше
  // гарантирует, что одинаковый ответ сервера не меняет ссылку и не запускает пересборку.
  const built = useMemo<BuildResult | null>(() => {
    if (!data) return null;
    try {
      return { model: buildOrgModel(data) };
    } catch (error) {
      return { error };
    }
  }, [data]);

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
    isFetching: query.isFetching,
    refetchError: query.isError ? query.error : null,
    refetch,
  };
}
