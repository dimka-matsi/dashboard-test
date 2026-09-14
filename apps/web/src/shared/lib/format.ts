const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Плейсхолдер для неопределённого значения (например, средняя эффективность при нуле сотрудников). */
export const EMPTY_VALUE = '—';

/** «12 345 678 руб.». Разряды разделены неразрывным пробелом, чтобы число не переносилось по строкам. */
export function formatBudget(value: number): string {
  return `${integerFormatter.format(Math.round(value))} руб.`;
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

/** Средняя эффективность с одним знаком после запятой; null → «—». */
export function formatPerformance(value: number | null): string {
  return value === null ? EMPTY_VALUE : oneDecimalFormatter.format(value);
}
