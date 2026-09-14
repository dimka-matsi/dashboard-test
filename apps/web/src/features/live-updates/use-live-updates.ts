import type { ServerMessage } from '@staff-pulse/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useOrgStore } from '@/entities/org/store/OrgStoreProvider';
import type { OrgModelStore } from '@/entities/org/store/org-store';
import { liveUrl } from '@/shared/config/env';

import { LiveClient, type ConnectionStatus } from './live-client';

const IDLE: ConnectionStatus = { state: 'idle' };

export interface LiveUpdates {
  status: ConnectionStatus;
  reconnect: () => void;
}

/** Реакция на сообщения сервера: патчи — в модель, разрывы и рестарты — полный ресинк. */
export function handleServerMessage(store: OrgModelStore, message: ServerMessage): void {
  switch (message.type) {
    case 'hello': {
      const cursor = store.cursor();
      // Снимок снят с другого процесса сервера — его seq несопоставим, перезапрашиваем.
      if (cursor?.serverId && cursor.serverId !== message.serverId) void store.resync();
      break;
    }
    case 'patch': {
      if (store.applyPatch(message) === 'gap') void store.resync();
      break;
    }
    case 'resync':
      void store.resync();
      break;
    case 'ping':
      break;
  }
}

export function useLiveUpdates({
  enabled = true,
  url,
}: { enabled?: boolean; url?: string } = {}): LiveUpdates {
  const store = useOrgStore();
  const [status, setStatus] = useState<ConnectionStatus>(IDLE);
  const clientRef = useRef<LiveClient | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const client = new LiveClient({
      url: url ?? liveUrl(),
      getCursor: () => store.cursor(),
      onStatus: setStatus,
      onMessage: (message) => handleServerMessage(store, message),
    });
    clientRef.current = client;
    // Старт отложен на тик: StrictMode в dev монтирует эффект дважды, и без отсрочки первый
    // сокет закрывался бы ещё в состоянии CONNECTING с предупреждением браузера.
    const startTimer = setTimeout(() => client.start(), 0);

    // Возврат сети или вкладки — повод не ждать таймер backoff.
    const wake = (): void => {
      if (document.visibilityState === 'visible') client.reconnectNow();
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);

    return () => {
      clearTimeout(startTimer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
      client.stop();
      clientRef.current = null;
    };
  }, [enabled, url, store]);

  const reconnect = useCallback(() => clientRef.current?.reconnectNow(), []);

  return { status: enabled ? status : IDLE, reconnect };
}
