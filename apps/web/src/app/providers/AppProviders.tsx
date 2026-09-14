import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';

import { createQueryClient } from '@/app/query-client';
import { GlobalStyle } from '@/app/styles/GlobalStyle';
import { theme } from '@/app/styles/theme';

export function AppProviders({ children }: { children: ReactNode }) {
  // QueryClient живёт столько же, сколько приложение: создаём один раз на монтирование.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
