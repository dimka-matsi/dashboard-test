import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { getScenario } from '@/shared/config/env';

import { orgTreeQueryKey } from '../api/org-tree-query';
import { OrgModelStore } from './org-store';

const OrgStoreContext = createContext<OrgModelStore | null>(null);

export function OrgStoreProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Для тестов: готовый экземпляр. */
  store?: OrgModelStore;
}) {
  const queryClient = useQueryClient();
  const [created] = useState(
    () => store ?? new OrgModelStore(queryClient, orgTreeQueryKey(getScenario())),
  );
  return <OrgStoreContext.Provider value={created}>{children}</OrgStoreContext.Provider>;
}

export function useOrgStore(): OrgModelStore {
  const store = useContext(OrgStoreContext);
  if (!store) throw new Error('useOrgStore: нет OrgStoreProvider выше по дереву');
  return store;
}
