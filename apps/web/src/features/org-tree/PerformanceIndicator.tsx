import styled from 'styled-components';

import { PERFORMANCE_BUCKET_LABELS, performanceBucket } from '@/entities/org/model/performance';
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

/*
 * Цвет задаётся через data-атрибут, а не через проп в CSS-функции:
 * три бакета → три класса, вместо класса на каждое из 101 значения.
 */
const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;

  &[data-bucket='low'] {
    background: ${({ theme }) => theme.colors.performance.low};
  }

  &[data-bucket='medium'] {
    background: ${({ theme }) => theme.colors.performance.medium};
  }

  &[data-bucket='high'] {
    background: ${({ theme }) => theme.colors.performance.high};
  }
`;

export function PerformanceIndicator({ value }: { value: number }) {
  const bucket = performanceBucket(value);
  const rounded = Math.round(value);
  return (
    <Wrap title={`Эффективность: ${rounded} из 100 (${PERFORMANCE_BUCKET_LABELS[bucket]})`}>
      <Dot data-bucket={bucket} aria-hidden="true" />
      <span aria-hidden="true">{rounded}</span>
      <VisuallyHidden>
        эффективность {rounded} из 100, {PERFORMANCE_BUCKET_LABELS[bucket]}
      </VisuallyHidden>
    </Wrap>
  );
}
