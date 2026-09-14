import { useCallback, useState } from 'react';

import type { SortColumn, SortState } from './rows';

export interface SortControls {
  sort: SortState | null;
  /** Клик по заголовку: новый столбец — сортировка по возрастанию; тот же столбец — без изменений. */
  sortBy: (column: SortColumn) => void;
  /** Двойной клик: обратное направление текущей сортировки. */
  reverse: () => void;
  reset: () => void;
}

/*
 * Двойной клик приходит после двух одиночных, поэтому клик по уже выбранному столбцу
 * намеренно ничего не меняет: иначе два клика «перевернули» бы сортировку дважды, а третье
 * событие dblclick — ещё раз, и результат зависел бы от скорости клика.
 */
export function useSort(): SortControls {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortBy = useCallback((column: SortColumn) => {
    setSort((prev) => (prev?.column === column ? prev : { column, direction: 'asc' }));
  }, []);

  const reverse = useCallback(() => {
    setSort((prev) =>
      prev ? { column: prev.column, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : null,
    );
  }, []);

  const reset = useCallback(() => setSort(null), []);

  return { sort, sortBy, reverse, reset };
}
