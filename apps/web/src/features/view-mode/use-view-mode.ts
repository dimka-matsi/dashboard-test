import { useState } from 'react';

import { LAYOUT } from '@/app/styles/theme';
import { useMediaQuery } from '@/shared/lib/use-media-query';

/** Режим просмотра: дерево, таблица или обе панели рядом (только на широком экране). */
export type ViewMode = 'tree' | 'table' | 'split';

export const SPLIT_VIEW_QUERY = `(min-width: ${LAYOUT.splitMinWidth}px)`;

export interface ViewLayout {
  /** Широкий экран: split-view доступен. */
  isWide: boolean;
  /** Выбор пользователя. */
  mode: ViewMode;
  /** Что реально показано: split на узком экране сводится к дереву. */
  effective: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export function useViewLayout(): ViewLayout {
  const isWide = useMediaQuery(SPLIT_VIEW_QUERY);
  const [mode, setMode] = useState<ViewMode>('split');
  const effective: ViewMode = mode === 'split' && !isWide ? 'tree' : mode;
  return { isWide, mode, effective, setMode };
}
