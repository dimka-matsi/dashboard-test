import { OrgTreeResponseSchema, type OrgNode } from '@staff-pulse/contracts';
import { useQuery } from '@tanstack/react-query';

import { fetchJsonDetailed } from '@/shared/api/http';
import { getScenario, orgTreeUrl } from '@/shared/config/env';

/** Снимок орг-структуры: плоский массив узлов и версия состояния сервера, с которой он снят. */
export interface OrgSnapshot {
  readonly nodes: OrgNode[];
  /** seq сервера (заголовок X-Org-Version); null, если сервер его не прислал. */
  readonly version: number | null;
  /** Идентификатор процесса сервера (X-Server-Id): после рестарта меняется. */
  readonly serverId: string | null;
}

export type OrgTreeQueryKey = readonly ['org-tree', { readonly scenario: string | null }];

export const orgTreeQueryKey = (scenario: string | null): OrgTreeQueryKey =>
  ['org-tree', { scenario }] as const;

export async function fetchOrgTree(
  scenario: string | null,
  signal?: AbortSignal,
): Promise<OrgSnapshot> {
  const { data, response } = await fetchJsonDetailed(orgTreeUrl(scenario), OrgTreeResponseSchema, {
    signal,
  });
  const versionHeader = response.headers.get('x-org-version');
  const version =
    versionHeader !== null && /^\d+$/.test(versionHeader) ? Number(versionHeader) : null;
  return { nodes: data, version, serverId: response.headers.get('x-server-id') };
}

export interface OrgTreeQueryOptions {
  /** Фоновый поллинг, когда live-канал недоступен (мс); false — выключен. */
  refetchInterval?: number | false;
}

/**
 * Запрос орг-структуры через слой кэширования TanStack Query.
 * `signal` передаётся в fetch: если все подписчики размонтировались до ответа, запрос отменяется.
 */
export function useOrgTreeQuery({ refetchInterval = false }: OrgTreeQueryOptions = {}) {
  const scenario = getScenario();
  return useQuery({
    queryKey: orgTreeQueryKey(scenario),
    queryFn: ({ signal }) => fetchOrgTree(scenario, signal),
    refetchInterval,
  });
}
