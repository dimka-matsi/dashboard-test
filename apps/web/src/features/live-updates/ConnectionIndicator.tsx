import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { Button } from '@/shared/ui/Button';

import type { ConnectionStatus } from './live-client';

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Dot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.border};

  &[data-tone='online'] {
    background: ${({ theme }) => theme.colors.connection.online};
    box-shadow: 0 0 0 3px rgba(31, 157, 85, 0.18);
  }

  &[data-tone='connecting'] {
    background: ${({ theme }) => theme.colors.connection.connecting};
  }

  &[data-tone='offline'] {
    background: ${({ theme }) => theme.colors.connection.offline};
  }
`;

const Label = styled.span`
  white-space: nowrap;
`;

type Tone = 'online' | 'connecting' | 'offline' | 'idle';

function useCountdown(target: number | null): number | null {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [target]);
  if (target === null || now === 0) return null;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

function describe(
  status: ConnectionStatus,
  secondsLeft: number | null,
): { tone: Tone; label: string; detail: string } {
  switch (status.state) {
    case 'idle':
      return {
        tone: 'idle',
        label: 'Live выключен',
        detail: 'Обновления в реальном времени отключены',
      };
    case 'connecting':
      return {
        tone: 'connecting',
        label: status.attempt > 0 ? `Подключение… (попытка ${status.attempt + 1})` : 'Подключение…',
        detail: 'Устанавливаем WebSocket-соединение',
      };
    case 'online':
      return {
        tone: 'online',
        label: 'Онлайн',
        detail: `Live-обновления активны · состояние #${status.seq} · сервер ${status.serverId}`,
      };
    case 'reconnecting':
      return {
        tone: 'connecting',
        label:
          secondsLeft === null
            ? `Переподключение… (попытка ${status.attempt})`
            : `Переподключение через ${secondsLeft} с (попытка ${status.attempt})`,
        detail: `Соединение потеряно: ${status.reason}. Экспоненциальный backoff.`,
      };
    case 'offline':
      return { tone: 'offline', label: 'Не в сети', detail: 'Live-канал остановлен' };
  }
}

export interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onReconnect: () => void;
}

export function ConnectionIndicator({ status, onReconnect }: ConnectionIndicatorProps) {
  const secondsLeft = useCountdown(status.state === 'reconnecting' ? status.retryAt : null);
  const { tone, label, detail } = describe(status, secondsLeft);
  const canReconnect = status.state === 'reconnecting' || status.state === 'offline';

  return (
    <Wrap role="status" aria-live="polite" title={detail} data-connection={status.state}>
      <Dot data-tone={tone} aria-hidden="true" />
      <Label>{label}</Label>
      {canReconnect && (
        <Button type="button" $size="sm" $variant="ghost" onClick={onReconnect}>
          Подключиться
        </Button>
      )}
    </Wrap>
  );
}
