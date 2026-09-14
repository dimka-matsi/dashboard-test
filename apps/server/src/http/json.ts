import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: OutgoingHttpHeaders = {},
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

export function sendEmpty(
  res: ServerResponse,
  status: number,
  headers: OutgoingHttpHeaders = {},
): void {
  res.writeHead(status, headers);
  res.end();
}

export class PayloadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PayloadError';
    this.status = status;
  }
}

/** Читает JSON-тело запроса с ограничением по размеру. */
export function readJsonBody(req: IncomingMessage, limitBytes = 64 * 1024): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > limitBytes) {
        reject(new PayloadError(413, `Тело запроса больше ${limitBytes} байт`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new PayloadError(400, 'Тело запроса не является корректным JSON'));
      }
    });
    req.on('error', reject);
  });
}

/** Проверяет заголовок If-None-Match (может содержать список через запятую). */
export function matchesEtag(header: string | string[] | undefined, etag: string): boolean {
  if (!header) return false;
  const raw = Array.isArray(header) ? header.join(',') : header;
  return raw.split(',').some((candidate) => {
    const value = candidate.trim();
    return value === '*' || value === etag || value === etag.replace(/^W\//, '');
  });
}
