import styled from 'styled-components';

import { PERFORMANCE_BUCKET_LABELS, performanceBucket } from '@/entities/org/model/performance';
import { PerformanceDot } from '@/entities/org/ui/PerformanceDot';
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export function PerformanceIndicator({ value }: { value: number }) {
  const bucket = performanceBucket(value);
  const rounded = Math.round(value);
  return (
    <Wrap title={`Эффективность: ${rounded} из 100 (${PERFORMANCE_BUCKET_LABELS[bucket]})`}>
      <PerformanceDot data-bucket={bucket} aria-hidden="true" />
      <span aria-hidden="true">{rounded}</span>
      <VisuallyHidden>
        эффективность {rounded} из 100, {PERFORMANCE_BUCKET_LABELS[bucket]}
      </VisuallyHidden>
    </Wrap>
  );
}
