import {
  RESUME_QUERY_PARAMS,
  ServerMessageSchema,
  type ClientMessage,
  type ServerMessage,
} from '@staff-pulse/contracts';
import * as z from 'zod/mini';

export type ConnectionStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'connecting'; readonly attempt: number }
  | {
      readonly state: 'online';
      readonly since: number;
      readonly serverId: string;
      readonly seq: number;
    }
  | {
      readonly state: 'reconnecting';
      readonly attempt: number;
      readonly retryAt: number;
      readonly reason: string;
    }
  | { readonly state: 'offline' };

export interface BackoffOptions {
  baseMs: number;
  maxMs: number;
  factor: number;
  /** Доля разброса: 0.3 → задержка в пределах ±30 % от расчётной. */
  jitter: number;
}

export const DEFAULT_BACKOFF: BackoffOptions = {
  baseMs: 500,
  maxMs: 30_000,
  factor: 2,
  jitter: 0.3,
};

/** Экспоненциальная задержка с джиттером: 500 мс, 1 с, 2 с, … до 30 с. */
export function backoffDelay(
  attempt: number,
  options: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const base = Math.min(options.maxMs, options.baseMs * options.factor ** Math.max(0, attempt - 1));
  const spread = base * options.jitter;
  return Math.round(base - spread + random() * 2 * spread);
}

export interface LiveCursor {
  serverId: string | null;
  since: number | null;
}

export interface LiveClientOptions {
  url: string;
  /** Откуда возобновлять: сервер дошлёт патчи после `since` или попросит ресинк. */
  getCursor: () => LiveCursor | null;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  backoff?: Partial<BackoffOptions>;
  /** Сколько heartbeat-периодов тишины считать обрывом. */
  heartbeatTimeoutFactor?: number;
  WebSocketImpl?: typeof WebSocket;
  now?: () => number;
  random?: () => number;
}

const OPEN = 1;

/**
 * Клиент live-канала: подключение, heartbeat-watchdog, экспоненциальный backoff с джиттером,
 * валидация сообщений контрактом. Интерпретация патчей — снаружи (`onMessage`).
 */
export class LiveClient {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatMs = 10_000;
  private stopped = true;
  private status: ConnectionStatus = { state: 'idle' };

  private readonly backoff: BackoffOptions;
  private readonly heartbeatTimeoutFactor: number;
  private readonly WebSocketImpl: typeof WebSocket;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly options: LiveClientOptions;

  constructor(options: LiveClientOptions) {
    this.options = options;
    this.backoff = { ...DEFAULT_BACKOFF, ...options.backoff };
    this.heartbeatTimeoutFactor = options.heartbeatTimeoutFactor ?? 2.5;
    this.WebSocketImpl = options.WebSocketImpl ?? WebSocket;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.attempt = 0;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearReconnectTimer();
    this.clearWatchdog();
    this.detach(1000, 'client stop');
    this.setStatus({ state: 'offline' });
  }

  /** Немедленная попытка: кнопка в индикаторе, событие `online`, возврат на вкладку. */
  reconnectNow(): void {
    if (this.stopped) {
      this.start();
      return;
    }
    if (this.status.state === 'reconnecting') {
      this.clearReconnectTimer();
      this.connect();
    }
  }

  private connect(): void {
    const url = buildUrl(this.options.url, this.options.getCursor());
    this.setStatus({ state: 'connecting', attempt: this.attempt });

    let socket: WebSocket;
    try {
      socket = new this.WebSocketImpl(url);
    } catch (error) {
      this.scheduleReconnect(error instanceof Error ? error.message : 'не удалось открыть сокет');
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket === socket) this.resetWatchdog();
    };
    socket.onmessage = (event: MessageEvent<unknown>) => {
      if (this.socket === socket) this.handleRaw(event.data);
    };
    socket.onclose = (event: CloseEvent) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearWatchdog();
      if (!this.stopped)
        this.scheduleReconnect(event.reason || `соединение закрыто (код ${event.code})`);
    };
    socket.onerror = () => {
      // за ошибкой всегда следует close — реагируем там
    };
  }

  private handleRaw(data: unknown): void {
    this.resetWatchdog();
    let json: unknown;
    try {
      json = JSON.parse(typeof data === 'string' ? data : String(data));
    } catch {
      return;
    }
    const parsed = z.safeParse(ServerMessageSchema, json);
    if (!parsed.success) return;

    const message = parsed.data;
    switch (message.type) {
      case 'hello':
        this.heartbeatMs = message.heartbeatMs;
        this.attempt = 0;
        this.setStatus({
          state: 'online',
          since: this.now(),
          serverId: message.serverId,
          seq: message.seq,
        });
        this.resetWatchdog();
        break;
      case 'ping':
        this.send({ type: 'pong', t: message.t });
        return;
      case 'patch':
        if (this.status.state === 'online') this.setStatus({ ...this.status, seq: message.seq });
        break;
      case 'resync':
        if (this.status.state === 'online') this.setStatus({ ...this.status, seq: message.seq });
        break;
    }
    this.options.onMessage(message);
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === OPEN) this.socket.send(JSON.stringify(message));
  }

  private scheduleReconnect(reason: string): void {
    this.attempt += 1;
    const delay = backoffDelay(this.attempt, this.backoff, this.random);
    this.setStatus({
      state: 'reconnecting',
      attempt: this.attempt,
      retryAt: this.now() + delay,
      reason,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private resetWatchdog(): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(
      () => this.onWatchdog(),
      this.heartbeatMs * this.heartbeatTimeoutFactor,
    );
  }

  private onWatchdog(): void {
    this.watchdogTimer = null;
    this.detach(4000, 'heartbeat timeout');
    if (!this.stopped) this.scheduleReconnect('сервер не отвечает на heartbeat');
  }

  /** Отвязывает текущий сокет: дальнейшие его события игнорируются. */
  private detach(code: number, reason: string): void {
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try {
      socket.close(code, reason);
    } catch {
      // сокет уже закрыт
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = null;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatus(status);
  }
}

export function buildUrl(base: string, cursor: LiveCursor | null): string {
  if (!cursor || cursor.serverId === null || cursor.since === null) return base;
  const url = new URL(base);
  url.searchParams.set(RESUME_QUERY_PARAMS.serverId, cursor.serverId);
  url.searchParams.set(RESUME_QUERY_PARAMS.since, String(cursor.since));
  return url.toString();
}
