import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { Button } from '@/shared/ui/Button';

import type { ConnectionStatus } from './live-client';

const Wrap = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  row-gap: 2px;
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
  flex: 1 1 auto;
  min-width: 60px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Meta = styled.span`
  flex: none;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const ReconnectButton = styled(Button)`
  flex: none;
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

/**
 * `label` — описательная фраза, может обрезаться многоточием на узких экранах.
 * `meta` — короткий суффикс (секунды/номер попытки), всегда показывается целиком.
 */
function describe(
  status: ConnectionStatus,
  secondsLeft: number | null,
): { tone: Tone; label: string; meta: string; detail: string } {
  switch (status.state) {
    case 'idle':
      return {
        tone: 'idle',
        label: 'Live выключен',
        meta: '',
        detail: 'Обновления в реальном времени отключены',
      };
    case 'connecting':
      return {
        tone: 'connecting',
        label: 'Подключение…',
        meta: status.attempt > 0 ? `попытка ${status.attempt + 1}` : '',
        detail: 'Устанавливаем WebSocket-соединение',
      };
    case 'online':
      return {
        tone: 'online',
        label: 'Онлайн',
        meta: '',
        detail: `Live-обновления активны · состояние #${status.seq} · сервер ${status.serverId}`,
      };
    case 'reconnecting':
      return {
        tone: 'connecting',
        label: 'Переподключение',
        meta:
          secondsLeft === null
            ? `попытка ${status.attempt}`
            : `${secondsLeft} с · попытка ${status.attempt}`,
        detail: `Соединение потеряно: ${status.reason}. Экспоненциальный backoff.`,
      };
    case 'offline':
      return { tone: 'offline', label: 'Не в сети', meta: '', detail: 'Live-канал остановлен' };
  }
}

export interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onReconnect: () => void;
}

export function ConnectionIndicator({ status, onReconnect }: ConnectionIndicatorProps) {
  const secondsLeft = useCountdown(status.state === 'reconnecting' ? status.retryAt : null);
  const { tone, label, meta, detail } = describe(status, secondsLeft);
  const canReconnect = status.state === 'reconnecting' || status.state === 'offline';
  const fullText = meta ? `${label} (${meta})` : label;

  return (
    <Wrap
      role="status"
      aria-live="polite"
      title={`${fullText} — ${detail}`}
      data-connection={status.state}
    >
      <Dot data-tone={tone} aria-hidden="true" />
      <Label>{label}</Label>
      {meta && <Meta>{meta}</Meta>}
      {canReconnect && (
        <ReconnectButton type="button" $size="sm" $variant="ghost" onClick={onReconnect}>
          Подключиться
        </ReconnectButton>
      )}
    </Wrap>
  );
}
