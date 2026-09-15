import styled from 'styled-components';

import type { DivisionSummary } from '@/entities/org/model/summary';
import { formatInteger, formatPerformance } from '@/shared/lib/format';
import { Panel } from '@/shared/ui/Panel';

const Card = styled(Panel)`
  gap: 10px;
  padding: 14px 16px 12px;
`;

const Head = styled.header`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Note = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textFaint};
`;

const Plot = styled.ol`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  align-items: end;
  gap: 12px;
  height: 96px;
  margin: 0;
  padding: 0 0 0;
  list-style: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.chart.axis};
`;

/* Колонка ≤ 24px, скруглённый торец у данных, прямой у базовой линии; значение на торце. */
const Column = styled.li`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  min-width: 0;
`;

/* Высота — процент через transient-проп: класс на целое значение, без inline-стилей. */
const Bar = styled.div<{ $pct: number }>`
  width: 24px;
  height: ${({ $pct }) => Math.max(2, Math.min(100, $pct))}%;
  border-radius: 4px 4px 0 0;
  background: ${({ theme }) => theme.colors.chart.series};
  transition: height ${({ theme }) => theme.motion.base} ease;

  li:hover > &,
  li:focus-visible > & {
    filter: brightness(1.12);
  }
`;

const Value = styled.span`
  margin-bottom: 4px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

/*
 * По умолчанию подсказка центрируется над столбцом. У крайних столбцов такое
 * центрирование выталкивает её за пределы прокручиваемой области `<main>`, и подсказка
 * обрезается — поэтому у первого/последнего столбца подсказка прижимается к краю колонки,
 * а не к её центру.
 */
const Tooltip = styled.span`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  z-index: 5;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.font.size.xs};
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity ${({ theme }) => theme.motion.fast} ease;

  li:hover > &,
  li:focus-visible > & {
    opacity: 1;
  }

  &[data-align='start'] {
    left: 0;
    transform: none;
  }

  &[data-align='end'] {
    left: auto;
    right: 0;
    transform: none;
  }

  b {
    font-weight: 600;
  }
`;

const Labels = styled.ol`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Label = styled.li`
  min-width: 0;
  text-align: center;
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/** «Дивизион «Продукты»» → «Продукты» — короткая подпись оси. */
export function shortDivisionName(name: string): string {
  const quoted = /[«"]([^»"]+)[»"]/.exec(name);
  if (quoted?.[1]) return quoted[1];
  return name.replace(/^дивизион\s+/iu, '');
}

export interface DivisionChartProps {
  divisions: readonly DivisionSummary[];
}

/**
 * Одна серия — один цвет: сравнение средней эффективности дивизионов (0–100).
 * Значения подписаны на торцах, поэтому шкала не нужна; подробности — в подсказке и в таблице.
 */
export function DivisionChart({ divisions }: DivisionChartProps) {
  return (
    <Card aria-label="Средняя эффективность по дивизионам">
      <Head>
        <Title>Средняя эффективность по дивизионам</Title>
        <Note>0–100, взвешено по численности</Note>
      </Head>
      <Plot>
        {divisions.map((division, index) => {
          const value = division.avgPerformance ?? 0;
          const align = index === 0 ? 'start' : index === divisions.length - 1 ? 'end' : 'center';
          return (
            <Column
              key={division.id}
              tabIndex={0}
              aria-label={`${division.name}: ${formatPerformance(division.avgPerformance)}`}
            >
              <Tooltip role="tooltip" data-align={align}>
                <b>{formatPerformance(division.avgPerformance)}</b> · {division.name} ·{' '}
                {formatInteger(division.totalHeadcount)} чел.
              </Tooltip>
              <Value aria-hidden="true">{formatPerformance(division.avgPerformance)}</Value>
              <Bar $pct={Math.round(value)} data-value={Math.round(value)} />
            </Column>
          );
        })}
      </Plot>
      <Labels aria-hidden="true">
        {divisions.map((division) => (
          <Label key={division.id} title={division.name}>
            {shortDivisionName(division.name)}
          </Label>
        ))}
      </Labels>
    </Card>
  );
}
