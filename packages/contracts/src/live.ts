import * as z from 'zod/mini';

import { NodeIdSchema, OrgNodeSchema } from './org-node';

/**
 * Изменение одного узла. Поля содержат НОВЫЕ абсолютные значения (не дельты):
 * применение патча идемпотентно, повтор после ресинка ничего не ломает.
 */
export const NodeChangeSchema = z.object({
  id: NodeIdSchema,
  fields: z.partial(z.pick(OrgNodeSchema, { headcount: true, budget: true, performance: true })),
  updatedAt: z.iso.datetime(),
});

export type NodeChange = z.infer<typeof NodeChangeSchema>;

/** Пакет изменений с порядковым номером состояния сервера после применения. */
export const PatchMessageSchema = z.object({
  type: z.literal('patch'),
  seq: z.int().check(z.nonnegative()),
  changes: z.array(NodeChangeSchema),
});

export type PatchMessage = z.infer<typeof PatchMessageSchema>;

export const RESYNC_REASONS = ['server-restarted', 'gap-too-large', 'unknown-cursor'] as const;

/**
 * Сообщения сервера → клиенту.
 * - hello: первое сообщение после подключения — идентификатор процесса, текущий seq, период heartbeat.
 * - patch: изменения узлов; seq строго возрастает на 1 при каждом патче.
 * - resync: сервер не может дослать пропущенные патчи — клиент должен перезапросить снимок.
 * - ping: heartbeat; клиент отвечает pong.
 */
export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    serverId: z.string().check(z.minLength(1)),
    seq: z.int().check(z.nonnegative()),
    heartbeatMs: z.int().check(z.positive()),
  }),
  PatchMessageSchema,
  z.object({
    type: z.literal('resync'),
    seq: z.int().check(z.nonnegative()),
    reason: z.enum(RESYNC_REASONS),
  }),
  z.object({ type: z.literal('ping'), t: z.int() }),
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type ResyncReason = (typeof RESYNC_REASONS)[number];

/** Сообщения клиента → серверу. Курсор возобновления передаётся в query-строке URL, не сообщением. */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pong'), t: z.int() }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/** Параметры query-строки при подключении к /ws для возобновления с известного места. */
export const RESUME_QUERY_PARAMS = { serverId: 'serverId', since: 'since' } as const;
