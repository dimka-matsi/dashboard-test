import type { NodeChange, OrgNode, PatchMessage } from '@staff-pulse/contracts';

import { createPrng, type Prng } from '../data/prng';
import type { OrgState } from '../state';

const roundTo = (value: number, step: number): number => Math.round(value / step) * step;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Случайное изменение метрик узла. В патч попадают НОВЫЕ абсолютные значения
 * в пределах контракта: performance 0..100, headcount >= 0 (у команд >= 1), budget >= 0.
 */
export function mutateNode(node: OrgNode, isLeaf: boolean, rnd: Prng, now: number): NodeChange {
  const fields: NodeChange['fields'] = {};
  // 0..2 — только эффективность, 3..4 — бюджет, 5 — численность, 6 — всё сразу
  const kind = rnd.int(0, 6);

  if (kind <= 2 || kind === 6) {
    const delta = rnd.int(-6, 6) || 1;
    fields.performance = clamp(node.performance + delta, 0, 100);
  }
  if (kind === 3 || kind === 4 || kind === 6) {
    const percent = rnd.int(-4, 4) || 1;
    fields.budget = Math.max(0, roundTo(node.budget * (1 + percent / 100), 10_000));
  }
  if (kind === 5 || kind === 6) {
    const delta = rnd.pick([-2, -1, 1, 1, 2]);
    fields.headcount = Math.max(isLeaf ? 1 : 0, node.headcount + delta);
  }

  return { id: node.id, fields, updatedAt: new Date(now).toISOString() };
}

/** Один «тик»: 1..batchMax различных узлов, листья выбираются чаще (≈70 %). */
export function generateTick(
  state: OrgState,
  rnd: Prng,
  batchMax: number,
  now: number,
): NodeChange[] {
  const nodes = state.snapshot();
  if (nodes.length === 0) return [];
  const parents = new Set(nodes.map((node) => node.parentId));
  const leaves = nodes.filter((node) => !parents.has(node.id));

  const count = rnd.int(1, Math.max(1, batchMax));
  const picked = new Map<string, OrgNode>();
  for (let i = 0; i < count * 3 && picked.size < count; i += 1) {
    const pool = rnd.next() < 0.7 && leaves.length > 0 ? leaves : nodes;
    const node = rnd.pick(pool);
    picked.set(node.id, node);
  }

  return [...picked.values()].map((node) => mutateNode(node, !parents.has(node.id), rnd, now));
}

export interface TickerOptions {
  state: OrgState;
  intervalMs: number;
  batchMax: number;
  seed?: number;
  onPatch: (patch: PatchMessage) => void;
  now?: () => number;
}

/** Запускает генерацию live-изменений с джиттером ±30 %. Возвращает функцию остановки. */
export function startTicker({
  state,
  intervalMs,
  batchMax,
  seed = Date.now(),
  onPatch,
  now = Date.now,
}: TickerOptions): () => void {
  if (intervalMs <= 0) return () => undefined;
  const rnd = createPrng(seed);
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const schedule = (): void => {
    if (stopped) return;
    const jitter = 1 + (rnd.next() - 0.5) * 0.6;
    timer = setTimeout(tick, Math.round(intervalMs * jitter));
  };

  const tick = (): void => {
    const patch = state.applyChanges(generateTick(state, rnd, batchMax, now()));
    if (patch) onPatch(patch);
    schedule();
  };

  schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
