import type { ReactNode } from 'react';
import styled from 'styled-components';

import type { ChangedField } from '@/entities/org/model/apply-changes';
import { PERFORMANCE_BUCKET_LABELS, performanceBucket } from '@/entities/org/model/performance';
import type { OrgSummary } from '@/entities/org/model/summary';
import type { NodeId } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { PerformanceDot } from '@/entities/org/ui/PerformanceDot';
import {
  formatBudget,
  formatCompactBudget,
  formatInteger,
  formatPerformance,
  pluralize,
} from '@/shared/lib/format';
import { Flash } from '@/shared/ui/Flash';
import { Panel } from '@/shared/ui/Panel';

import { DivisionChart } from './DivisionChart';

const Strip = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(300px, 1.7fr);
  gap: ${({ theme }) => theme.space.md};

  @media (max-width: 1279px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > section:last-child {
      grid-column: 1 / -1;
    }
  }
`;

const Tile = styled(Panel)`
  justify-content: flex-start;
  gap: 6px;
  padding: 14px 16px;
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
`;

/* Пропорциональные цифры: tabular-nums на крупных числах выглядят разрежённо. */
const Value = styled.span`
  font-size: ${({ theme }) => theme.font.size.hero};
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;

const Sub = styled.span`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 18px;
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.textFaint};
`;

function StatTile({
  kpi,
  label,
  value,
  sub,
  flashAt,
  title,
}: {
  kpi: string;
  label: string;
  value: string;
  sub?: ReactNode;
  flashAt?: number;
  title?: string;
}) {
  return (
    <Tile as="article" data-kpi={kpi} title={title}>
      <Label>{label}</Label>
      <Value>
        <Flash at={flashAt}>{value}</Flash>
      </Value>
      <Sub>{sub}</Sub>
    </Tile>
  );
}

/** Последняя отметка изменения агрегата среди корней: подсветка плиток при live-патчах. */
export function latestRootFlash(
  roots: readonly { id: NodeId }[],
  flashes: FlashMap,
  field: ChangedField,
): number | undefined {
  let latest = 0;
  for (const root of roots) {
    const at = flashes.get(root.id)?.get(field);
    if (at !== undefined && at > latest) latest = at;
  }
  return latest > 0 ? latest : undefined;
}

export interface KpiStripProps {
  summary: OrgSummary;
  flashes: FlashMap;
}

/** Плитки со сводными показателями компании и график по дивизионам. */
export function KpiStrip({ summary, flashes }: KpiStripProps) {
  const bucket = summary.avgPerformance === null ? null : performanceBucket(summary.avgPerformance);
  const totalUnits = [...summary.countsByLevel.values()].reduce((sum, n) => sum + n, 0);
  const counts = [
    pluralize(summary.countsByLevel.get(1) ?? 0, 'дивизион', 'дивизиона', 'дивизионов'),
    pluralize(summary.countsByLevel.get(2) ?? 0, 'отдел', 'отдела', 'отделов'),
    pluralize(summary.countsByLevel.get(3) ?? 0, 'команда', 'команды', 'команд'),
  ].join(' · ');

  return (
    <Strip aria-label="Сводные показатели">
      <StatTile
        kpi="headcount"
        label="Сотрудников"
        value={formatInteger(summary.totalHeadcount)}
        sub="по всем подразделениям"
        flashAt={latestRootFlash(summary.divisions, flashes, 'totalHeadcount')}
      />
      <StatTile
        kpi="budget"
        label="Суммарный бюджет"
        value={formatCompactBudget(summary.totalBudget)}
        sub={formatBudget(summary.totalBudget)}
        title={formatBudget(summary.totalBudget)}
        flashAt={latestRootFlash(summary.divisions, flashes, 'totalBudget')}
      />
      <StatTile
        kpi="performance"
        label="Средняя эффективность"
        value={formatPerformance(summary.avgPerformance)}
        sub={
          bucket && (
            <>
              <PerformanceDot data-bucket={bucket} aria-hidden="true" />
              {PERFORMANCE_BUCKET_LABELS[bucket]}, взвешено по численности
            </>
          )
        }
        flashAt={latestRootFlash(summary.divisions, flashes, 'avgPerformance')}
      />
      <StatTile
        kpi="units"
        label="Подразделений"
        value={formatInteger(totalUnits)}
        sub={counts}
        title={counts}
      />
      <DivisionChart divisions={summary.divisions} />
    </Strip>
  );
}
