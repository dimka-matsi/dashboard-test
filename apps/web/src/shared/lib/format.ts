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

/** Компактная сумма для плиток: «848,8 млн ₽», «12,3 тыс. ₽», «950 руб.». */
export function formatCompactBudget(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${oneDecimalFormatter.format(value / 1_000_000_000)} млрд ₽`;
  if (abs >= 1_000_000) return `${oneDecimalFormatter.format(value / 1_000_000)} млн ₽`;
  if (abs >= 10_000) return `${oneDecimalFormatter.format(value / 1_000)} тыс. ₽`;
  return formatBudget(value);
}

/** Русские формы множественного числа: pluralize(5, 'отдел', 'отдела', 'отделов') → «5 отделов». */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const form =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;
  return `${formatInteger(count)} ${form}`;
}
