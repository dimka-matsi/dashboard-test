import type { SearchFilter } from '@staff-pulse/contracts';
import styled from 'styled-components';

import { describeFilter } from './describe-filter';

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Chip = styled.li`
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.accentText};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 500;
  white-space: nowrap;
`;

/** «Чипы» активного структурированного фильтра. */
export function FilterChips({ filter }: { filter: SearchFilter }) {
  const chips = describeFilter(filter);
  if (chips.length === 0) return null;
  return (
    <Chips aria-label="Активный фильтр">
      {chips.map((chip) => (
        <Chip key={chip}>{chip}</Chip>
      ))}
    </Chips>
  );
}
