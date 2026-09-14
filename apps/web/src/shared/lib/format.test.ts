import { describe, expect, it } from 'vitest';

import { formatBudget, formatInteger, formatPerformance } from './format';

/** Intl для ru-RU ставит неразрывный пробел (U+00A0); для сравнения приводим к обычному. */
const plain = (value: string) => value.replace(/\p{Zs}/gu, ' ');

describe('formatBudget', () => {
  it('формат «12 345 678 руб.»', () => {
    expect(plain(formatBudget(12_345_678))).toBe('12 345 678 руб.');
    expect(plain(formatBudget(999))).toBe('999 руб.');
    expect(plain(formatBudget(0))).toBe('0 руб.');
  });

  it('округляет копейки', () => {
    expect(plain(formatBudget(1_000_000.6))).toBe('1 000 001 руб.');
  });

  it('использует неразрывный пробел как разделитель разрядов', () => {
    expect(formatBudget(1_000)).toMatch(/^1\p{Zs}000 руб\.$/u);
    expect(formatBudget(1_000)).not.toContain('1 000');
  });
});

describe('formatInteger', () => {
  it('разделяет разряды', () => {
    expect(plain(formatInteger(1234))).toBe('1 234');
  });
});

describe('formatPerformance', () => {
  it('один знак после запятой в русской записи', () => {
    expect(formatPerformance(72.55)).toBe('72,6');
    expect(formatPerformance(80)).toBe('80,0');
  });

  it('null → прочерк', () => {
    expect(formatPerformance(null)).toBe('—');
  });
});
