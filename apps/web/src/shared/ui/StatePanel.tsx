import type { ReactNode } from 'react';
import styled from 'styled-components';

import { Button } from './Button';
import { Spinner } from './Spinner';

const Wrap = styled.div<{ $tone?: 'neutral' | 'danger' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 240px;
  padding: ${({ theme }) => theme.space.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.colors.dangerSoft : theme.colors.surfaceMuted};
`;

const Title = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  margin: 0;
  max-width: 480px;
`;

const Details = styled.details`
  max-width: 640px;
  width: 100%;
  text-align: left;
  font-size: ${({ theme }) => theme.font.size.sm};

  summary {
    cursor: pointer;
    text-align: center;
  }

  pre {
    margin: ${({ theme }) => theme.space.sm} 0 0;
    padding: ${({ theme }) => theme.space.sm};
    overflow: auto;
    max-height: 200px;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.font.size.xs};
    white-space: pre-wrap;
  }
`;

export function LoadingState({ label = 'Загружаем орг-структуру…' }: { label?: string }) {
  return (
    <Wrap role="status" aria-live="polite">
      <Spinner $size={28} />
      <Description>{label}</Description>
    </Wrap>
  );
}

export function EmptyState({
  title = 'Данных пока нет',
  description = 'Сервер вернул пустой список подразделений.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Wrap role="status">
      <Title>{title}</Title>
      <Description>{description}</Description>
      {action}
    </Wrap>
  );
}

export function ErrorState({
  title,
  description,
  details,
  onRetry,
}: {
  title: string;
  description?: string;
  details?: string;
  onRetry?: () => void;
}) {
  return (
    <Wrap role="alert" $tone="danger">
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {details && (
        <Details>
          <summary>Подробности</summary>
          <pre>{details}</pre>
        </Details>
      )}
      {onRetry && (
        <Button type="button" $variant="primary" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </Wrap>
  );
}
