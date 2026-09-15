import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/app/query-client';
import { GlobalStyle } from '@/app/styles/GlobalStyle';
import { OrgStoreProvider } from '@/entities/org/store/OrgStoreProvider';

import { ThemeModeProvider } from './ThemeModeProvider';

/** Devtools TanStack Query в dev-режиме включаются адресом `?devtools=on`, чтобы не перекрывать интерфейс. */
function devtoolsEnabled(): boolean {
  return (
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('devtools') === 'on'
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  // QueryClient живёт столько же, сколько приложение: создаём один раз на монтирование.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OrgStoreProvider>
        <ThemeModeProvider>
          <GlobalStyle />
          {children}
        </ThemeModeProvider>
      </OrgStoreProvider>
      {devtoolsEnabled() && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
