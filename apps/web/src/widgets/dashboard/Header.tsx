import styled from 'styled-components';

import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.lg};
  height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 ${({ theme }) => theme.space.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Brand = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.md};
  min-width: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`;

export interface HeaderProps {
  isFetching: boolean;
  onRefresh?: () => void;
}

export function Header({ isFetching, onRefresh }: HeaderProps) {
  return (
    <Bar>
      <Brand>
        <Title>Staff Pulse</Title>
        <Subtitle>мониторинг орг-структуры</Subtitle>
      </Brand>
      <Right>
        {onRefresh && (
          <Button type="button" $size="sm" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? <Spinner $size={14} /> : null}
            Обновить
          </Button>
        )}
      </Right>
    </Bar>
  );
}
