const LEVEL_LABELS: Record<number, string> = {
  1: 'Дивизион',
  2: 'Отдел',
  3: 'Команда',
};

export function levelLabel(depth: number): string {
  return LEVEL_LABELS[depth] ?? `Уровень ${depth}`;
}
