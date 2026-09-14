import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('отдаёт новое значение только спустя задержку и сбрасывает таймер при новых изменениях', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 250), {
      initialProps: { value: '' },
    });
    expect(result.current).toBe('');

    rerender({ value: 'о' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('');

    rerender({ value: 'от' });
    act(() => vi.advanceTimersByTime(200));
    // с последнего изменения прошло 200 мс < 250 — ещё старое значение
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe('от');
  });
});
