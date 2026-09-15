import { describe, expect, it } from 'vitest';

import {
  formatBudget,
  formatCompactBudget,
  formatInteger,
  formatPerformance,
  pluralize,
} from './format';

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

describe('formatCompactBudget', () => {
  it('сжимает крупные суммы до млн/млрд с одним знаком', () => {
    expect(plain(formatCompactBudget(848_770_000))).toBe('848,8 млн ₽');
    expect(plain(formatCompactBudget(1_250_000_000))).toBe('1,3 млрд ₽');
    expect(plain(formatCompactBudget(12_340))).toBe('12,3 тыс. ₽');
    expect(plain(formatCompactBudget(950))).toBe('950 руб.');
  });
});

describe('pluralize', () => {
  it('выбирает форму по правилам русского языка', () => {
    expect(pluralize(1, 'отдел', 'отдела', 'отделов')).toBe('1 отдел');
    expect(pluralize(3, 'отдел', 'отдела', 'отделов')).toBe('3 отдела');
    expect(pluralize(11, 'отдел', 'отдела', 'отделов')).toBe('11 отделов');
    expect(pluralize(22, 'команда', 'команды', 'команд')).toBe('22 команды');
    expect(pluralize(0, 'дивизион', 'дивизиона', 'дивизионов')).toBe('0 дивизионов');
  });
});
