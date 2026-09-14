import { useState } from 'react';

import { theme } from '@/app/styles/theme';
import { useMediaQuery } from '@/shared/lib/use-media-query';

export type ViewMode = 'tree' | 'table';

export const SPLIT_VIEW_QUERY = `(min-width: ${theme.layout.splitMinWidth}px)`;

export interface ViewLayout {
  /** Широкий экран: дерево и таблица рядом, переключатель не нужен. */
  isSplit: boolean;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export function useViewLayout(): ViewLayout {
  const isSplit = useMediaQuery(SPLIT_VIEW_QUERY);
  const [mode, setMode] = useState<ViewMode>('tree');
  return { isSplit, mode, setMode };
}
