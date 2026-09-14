import { useMemo } from 'react';

import { useOrgTreeQuery } from '../api/org-tree-query';
import { buildOrgTree } from './build-org-tree';
import type { OrgTree } from './types';

export type OrgTreeState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'empty'; refetch: () => void }
  | {
      status: 'ready';
      tree: OrgTree;
      isFetching: boolean;
      /** Ошибка фонового обновления: данные на экране есть, но они могут быть устаревшими. */
      refetchError: unknown;
      refetch: () => void;
    };

type BuildResult = { tree: OrgTree } | { error: unknown };

/** Состояние экрана поверх запроса: загрузка, ошибка, пусто, готово. */
export function useOrgTree(): OrgTreeState {
  const query = useOrgTreeQuery();
  const data = query.data;

  // Дерево строится один раз на ссылку данных: structural sharing в кэше гарантирует,
  // что одинаковый ответ сервера не меняет ссылку и не запускает пересборку.
  const built = useMemo<BuildResult | null>(() => {
    if (!data) return null;
    try {
      return { tree: buildOrgTree(data) };
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
  if (built.tree.nodes.size === 0) return { status: 'empty', refetch };
  return {
    status: 'ready',
    tree: built.tree,
    isFetching: query.isFetching,
    refetchError: query.isError ? query.error : null,
    refetch,
  };
}
