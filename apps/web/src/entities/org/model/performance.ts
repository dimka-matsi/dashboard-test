export type PerformanceBucket = 'low' | 'medium' | 'high';

/** Пороги цветового индикатора: < 50 — низкая, 50–74 — средняя, ≥ 75 — высокая. */
export const PERFORMANCE_THRESHOLDS = { medium: 50, high: 75 } as const;

export function performanceBucket(value: number): PerformanceBucket {
  if (value < PERFORMANCE_THRESHOLDS.medium) return 'low';
  if (value < PERFORMANCE_THRESHOLDS.high) return 'medium';
  return 'high';
}

export const PERFORMANCE_BUCKET_LABELS: Record<PerformanceBucket, string> = {
  low: 'низкая',
  medium: 'средняя',
  high: 'высокая',
};
