import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { NodeChangeSchema, ServerMessageSchema } from './live';

describe('NodeChangeSchema', () => {
  it('принимает частичный набор метрик', () => {
    const result = z.safeParse(NodeChangeSchema, {
      id: 'team-01',
      fields: { performance: 77 },
      updatedAt: '2026-09-14T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет чужие поля и значения вне диапазона', () => {
    expect(
      z.safeParse(NodeChangeSchema, {
        id: 'team-01',
        fields: { performance: 101 },
        updatedAt: '2026-09-14T10:00:00.000Z',
      }).success,
    ).toBe(false);
    const withName = z.safeParse(NodeChangeSchema, {
      id: 'team-01',
      fields: { name: 'Новое имя' },
      updatedAt: '2026-09-14T10:00:00.000Z',
    });
    // имя не входит в контракт патча: лишний ключ отбрасывается, менять структуру патчем нельзя
    expect(withName.success && withName.data.fields).toEqual({});
  });
});

describe('ServerMessageSchema', () => {
  it.each([
    ['hello', { type: 'hello', serverId: 'abc', seq: 0, heartbeatMs: 10_000 }],
    ['patch', { type: 'patch', seq: 3, changes: [] }],
    ['resync', { type: 'resync', seq: 5, reason: 'server-restarted' }],
    ['ping', { type: 'ping', t: 123 }],
  ])('принимает %s', (_label, message) => {
    expect(z.safeParse(ServerMessageSchema, message).success).toBe(true);
  });

  it('отклоняет неизвестный тип и неверную причину resync', () => {
    expect(z.safeParse(ServerMessageSchema, { type: 'snapshot' }).success).toBe(false);
    expect(
      z.safeParse(ServerMessageSchema, { type: 'resync', seq: 1, reason: 'lol' }).success,
    ).toBe(false);
  });
});
