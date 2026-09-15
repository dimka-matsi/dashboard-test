import type { ReactNode } from 'react';
import styled from 'styled-components';

import { Button } from '@/shared/ui/Button';
import { RefreshIcon } from '@/shared/ui/icons';
import { Spinner } from '@/shared/ui/Spinner';

const Bar = styled.header`
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(150px, 2fr) minmax(160px, max-content);
  align-items: center;
  gap: ${({ theme }) => theme.space.lg};
  min-height: ${({ theme }) => theme.layout.topbarHeight}px;
  padding: 0 ${({ theme }) => theme.space.xl};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
    grid-template-areas:
      'brand right'
      'center center';
    padding-block: ${({ theme }) => theme.space.sm};
    row-gap: ${({ theme }) => theme.space.sm};
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'brand'
      'right'
      'center';
  }
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  @media (max-width: 900px) {
    grid-area: brand;
  }
`;

const Title = styled.h1`
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${({ theme }) => theme.font.size.lg};
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

const Center = styled.div`
  display: flex;
  justify-content: center;
  min-width: 0;

  @media (max-width: 900px) {
    grid-area: center;
  }
`;

const Right = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  gap: ${({ theme }) => theme.space.md};

  @media (max-width: 900px) {
    grid-area: right;
  }

  @media (max-width: 560px) {
    justify-content: flex-start;
  }
`;

const RefreshButton = styled(Button)`
  flex: none;

  /* Оптическая коррекция: у иконки обновления «флажок» стрелки смещает
   * визуальный вес вправо-вверх, из-за чего геометрически центрированный
   * контент выглядит сдвинутым. */
  svg {
    margin-left: -1.5px;
  }
`;

export interface TopBarProps {
  search: ReactNode;
  status: ReactNode;
  isFetching: boolean;
  onRefresh?: () => void;
}

export function TopBar({ search, status, isFetching, onRefresh }: TopBarProps) {
  return (
    <Bar>
      <Brand>
        <Title>Staff Pulse</Title>
        <Subtitle>мониторинг орг-структуры</Subtitle>
      </Brand>
      <Center>{search}</Center>
      <Right>
        {status}
        {onRefresh && (
          <RefreshButton
            type="button"
            $size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            title="Перезапросить снимок"
          >
            {isFetching ? <Spinner $size={14} /> : <RefreshIcon size={16} />}
            Обновить
          </RefreshButton>
        )}
      </Right>
    </Bar>
  );
}
