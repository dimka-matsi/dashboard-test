import * as z from 'zod/mini';

// Сообщения валидации на русском: попадают в блок «Подробности» состояния ошибки.
z.config(z.locales.ru());

export type ApiErrorKind = 'network' | 'http' | 'invalid-response' | 'aborted';

export interface ApiErrorOptions {
  status?: number;
  details?: string;
  cause?: unknown;
}

/** Типизированная ошибка API: по `kind` UI решает, что показать и стоит ли повторять запрос. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly details: string | undefined;

  constructor(kind: ApiErrorKind, message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.details = options.details;
  }
}

export interface FetchJsonOptions {
  signal?: AbortSignal;
  method?: 'GET' | 'POST';
  body?: unknown;
}

export interface FetchJsonResult<T> {
  data: T;
  response: Response;
}

/** То же, что `fetchJson`, но с доступом к ответу (заголовки версии снимка и т. п.). */
export async function fetchJsonDetailed<T>(
  url: string,
  schema: z.ZodMiniType<T>,
  { signal, method = 'GET', body }: FetchJsonOptions = {},
): Promise<FetchJsonResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (signal?.aborted) throw new ApiError('aborted', 'Запрос отменён', { cause });
    throw new ApiError('network', 'Не удалось связаться с сервером', { cause });
  }

  if (!response.ok) {
    throw new ApiError('http', `Сервер ответил ошибкой ${response.status}`, {
      status: response.status,
      details: await readErrorDetails(response),
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError('invalid-response', 'Ответ сервера не является корректным JSON', { cause });
  }

  const parsed = z.safeParse(schema, payload);
  if (!parsed.success) {
    throw new ApiError('invalid-response', 'Ответ сервера не соответствует схеме API', {
      details: z.prettifyError(parsed.error),
    });
  }
  return { data: parsed.data, response };
}

/**
 * Единственная точка обращения к API: fetch + проверка статуса + валидация схемой.
 * Невалидный ответ — это ошибка (`invalid-response`), а не «как-нибудь отрендерим».
 */
export async function fetchJson<T>(
  url: string,
  schema: z.ZodMiniType<T>,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { data } = await fetchJsonDetailed(url, schema, options);
  return data;
}

async function readErrorDetails(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    try {
      const json: unknown = JSON.parse(text);
      if (json && typeof json === 'object' && 'error' in json && typeof json.error === 'string') {
        return json.error;
      }
    } catch {
      // не JSON — вернём как есть
    }
    return text.slice(0, 500);
  } catch {
    return undefined;
  }
}
