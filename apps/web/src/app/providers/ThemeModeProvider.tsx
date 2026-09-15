import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';

import { darkTheme, lightTheme, type ThemeMode } from '@/app/styles/theme';
import { useLocalStorageState } from '@/shared/lib/use-local-storage-state';
import { useMediaQuery } from '@/shared/lib/use-media-query';

interface ThemeModeContextValue {
  mode: ThemeMode;
  /** Выбор пользователя; null — следовать системной настройке. */
  preference: ThemeMode | null;
  setMode: (mode: ThemeMode | null) => void;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'staff-pulse:theme';

/** Светлая/тёмная тема: системная настройка по умолчанию, переключатель запоминается. */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [preference, setPreference] = useLocalStorageState<ThemeMode | null>(
    THEME_STORAGE_KEY,
    null,
  );
  const mode: ThemeMode = preference ?? (prefersDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      preference,
      setMode: setPreference,
      toggle: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, preference, setPreference],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

const FALLBACK: ThemeModeContextValue = {
  mode: 'light',
  preference: null,
  setMode: () => undefined,
  toggle: () => undefined,
};

/** Вне провайдера (например, в изолированных тестах) — светлая тема без переключения. */
export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext) ?? FALLBACK;
}
