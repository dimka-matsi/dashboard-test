import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

import type { NodeId } from '@/entities/org/model/types';

import type { TableRow } from './rows';

export interface GridFocus {
  rowId: NodeId;
  col: number;
}

export interface GridNavigation {
  bodyRef: React.RefObject<HTMLTableSectionElement | null>;
  /** Индексы активной ячейки (единственной с tabIndex=0 — roving tabindex). */
  activeRow: number;
  activeCol: number;
  onKeyDown: (event: KeyboardEvent<HTMLTableSectionElement>) => void;
  onCellFocus: (rowId: NodeId, col: number) => void;
}

const PAGE_SIZE = 10;

/**
 * Клавиатурная навигация по паттерну WAI-ARIA grid: стрелки — по ячейкам, Home/End — начало и
 * конец строки, Ctrl+Home/End — первая и последняя строка, PageUp/PageDown — на 10 строк,
 * Enter или пробел — выбрать строку. Фокус хранится по id строки и переживает пересортировку.
 */
export function useGridNavigation({
  rows,
  columnCount,
  onActivate,
}: {
  rows: readonly TableRow[];
  columnCount: number;
  onActivate: (rowId: NodeId) => void;
}): GridNavigation {
  const [focus, setFocus] = useState<GridFocus | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const focusedIndex = focus ? rows.findIndex((row) => row.id === focus.rowId) : -1;
  const activeRow = focusedIndex >= 0 ? focusedIndex : 0;
  const activeCol = focusedIndex >= 0 && focus ? focus.col : 0;

  const onCellFocus = useCallback((rowId: NodeId, col: number) => {
    setFocus((prev) => (prev?.rowId === rowId && prev.col === col ? prev : { rowId, col }));
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableSectionElement>) => {
      if (rows.length === 0) return;
      const lastRow = rows.length - 1;
      const lastCol = columnCount - 1;
      let row = activeRow;
      let col = activeCol;

      switch (event.key) {
        case 'ArrowDown':
          row = Math.min(lastRow, row + 1);
          break;
        case 'ArrowUp':
          row = Math.max(0, row - 1);
          break;
        case 'ArrowRight':
          col = Math.min(lastCol, col + 1);
          break;
        case 'ArrowLeft':
          col = Math.max(0, col - 1);
          break;
        case 'Home':
          if (event.ctrlKey) row = 0;
          col = 0;
          break;
        case 'End':
          if (event.ctrlKey) row = lastRow;
          col = lastCol;
          break;
        case 'PageDown':
          row = Math.min(lastRow, row + PAGE_SIZE);
          break;
        case 'PageUp':
          row = Math.max(0, row - PAGE_SIZE);
          break;
        case 'Enter':
        case ' ': {
          const current = rows[activeRow];
          if (current) onActivate(current.id);
          event.preventDefault();
          return;
        }
        default:
          return;
      }

      event.preventDefault();
      const target = rows[row];
      if (!target) return;
      setFocus({ rowId: target.id, col });
      bodyRef.current
        ?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)
        ?.focus();
    },
    [rows, columnCount, activeRow, activeCol, onActivate],
  );

  return { bodyRef, activeRow, activeCol, onKeyDown, onCellFocus };
}
