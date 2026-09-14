import { OrgTreeResponseSchema, type OrgNode } from '@staff-pulse/contracts';
import { useQuery } from '@tanstack/react-query';

import { fetchJson } from '@/shared/api/http';
import { getScenario, orgTreeUrl } from '@/shared/config/env';

export const orgTreeQueryKey = (scenario: string | null) => ['org-tree', { scenario }] as const;

export function fetchOrgTree(scenario: string | null, signal?: AbortSignal): Promise<OrgNode[]> {
  return fetchJson(orgTreeUrl(scenario), OrgTreeResponseSchema, { signal });
}

/**
 * Запрос орг-структуры через слой кэширования TanStack Query.
 * `signal` передаётся в fetch: если все подписчики размонтировались до ответа, запрос отменяется.
 */
export function useOrgTreeQuery() {
  const scenario = getScenario();
  return useQuery({
    queryKey: orgTreeQueryKey(scenario),
    queryFn: ({ signal }) => fetchOrgTree(scenario, signal),
  });
}
