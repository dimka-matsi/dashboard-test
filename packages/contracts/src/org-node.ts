import * as z from 'zod/mini';

/** Идентификатор узла: непустая строка. */
export const NodeIdSchema = z.string().check(z.minLength(1), z.maxLength(64));

/**
 * Узел орг-структуры в том виде, в котором его отдаёт GET /api/org-tree.
 * Метрики узла — только его собственные (без потомков); агрегаты считает клиент.
 */
export const OrgNodeSchema = z.object({
  id: NodeIdSchema,
  name: z.string().check(z.minLength(1), z.maxLength(200)),
  parentId: z.nullable(NodeIdSchema),
  headcount: z.int().check(z.nonnegative()),
  budget: z.number().check(z.nonnegative()),
  performance: z.number().check(z.gte(0), z.lte(100)),
  updatedAt: z.iso.datetime(),
});

export type OrgNode = z.infer<typeof OrgNodeSchema>;

/** Ответ GET /api/org-tree — плоский массив узлов. */
export const OrgTreeResponseSchema = z.array(OrgNodeSchema);

export type OrgTreeResponse = z.infer<typeof OrgTreeResponseSchema>;

/** Числовые метрики узла, которые могут меняться в live-режиме. */
export const METRIC_FIELDS = ['headcount', 'budget', 'performance'] as const;

export type MetricField = (typeof METRIC_FIELDS)[number];

/** Стандартная форма ошибки API. */
export const ApiErrorResponseSchema = z.object({
  error: z.string(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
