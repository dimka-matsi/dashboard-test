import type { PatchMessage } from '@staff-pulse/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { fetchOrgTree, type OrgSnapshot, type OrgTreeQueryKey } from '../api/org-tree-query';
import { applyNodeChanges, type ChangedField } from '../model/apply-changes';
import { buildOrgModel, type OrgModel } from '../model/org-model';
import type { NodeId } from '../model/types';

/** Отметки времени последнего изменения ячеек — источник fade-out анимации. */
export type FlashMap = ReadonlyMap<NodeId, ReadonlyMap<ChangedField, number>>;

export type ApplyPatchResult = 'applied' | 'noop' | 'stale' | 'gap' | 'no-snapshot';

export interface LiveCursor {
  serverId: string | null;
  since: number | null;
}

/** Сколько держать отметку «недавно изменилось» — с запасом относительно 1,5 с анимации. */
export const FLASH_TTL_MS = 3_000;

/**
 * Связывает кэш запроса и доменную модель.
 *
 * - `modelFor(snapshot)` строит модель один раз на ссылку снимка. Ссылка меняется только при
 *   реальном изменении данных (structural sharing в TanStack Query), поэтому пересборка — редкость.
 * - `applyPatch()` обновляет модель инкрементально (только затронутый узел и предки) и записывает
 *   новый снимок в кэш запроса. Следующий фоновый refetch, вернувший то же состояние, не меняет
 *   ссылку — модель не пересобирается. Если состояние разошлось (пропущенный патч), refetch даёт
 *   новую ссылку, и модель честно перестраивается из снимка: патчи ради скорости, снимки — ради
 *   корректности.
 */
export class OrgModelStore {
  private snapshot: OrgSnapshot | null = null;
  private model: OrgModel | null = null;
  private flashMap = new Map<NodeId, ReadonlyMap<ChangedField, number>>();
  private readonly queryClient: QueryClient;
  private readonly now: () => number;
  readonly queryKey: OrgTreeQueryKey;

  constructor(queryClient: QueryClient, queryKey: OrgTreeQueryKey, now: () => number = Date.now) {
    this.queryClient = queryClient;
    this.queryKey = queryKey;
    this.now = now;
  }

  /** Модель для снимка из кэша: кэшированная, если снимок — результат нашего же патча. */
  modelFor(snapshot: OrgSnapshot): OrgModel {
    if (snapshot === this.snapshot && this.model) return this.model;
    this.model = buildOrgModel(snapshot.nodes);
    this.snapshot = snapshot;
    return this.model;
  }

  get flashes(): FlashMap {
    return this.flashMap;
  }

  /** Курсор для возобновления live-канала: с какого места досылать патчи. */
  cursor(): LiveCursor | null {
    if (!this.snapshot) return null;
    return { serverId: this.snapshot.serverId, since: this.snapshot.version };
  }

  applyPatch(patch: PatchMessage): ApplyPatchResult {
    if (!this.snapshot || !this.model) return 'no-snapshot';

    const version = this.snapshot.version;
    if (version !== null) {
      if (patch.seq <= version) return 'stale';
      if (patch.seq > version + 1) return 'gap';
    }

    const { model, changed } = applyNodeChanges(this.model, patch.changes);
    const nextSnapshot: OrgSnapshot = {
      nodes:
        model === this.model
          ? this.snapshot.nodes
          : this.snapshot.nodes.map((node) => model.tree.nodes.get(node.id) ?? node),
      version: patch.seq,
      serverId: this.snapshot.serverId,
    };

    if (changed.size > 0) this.recordFlashes(changed);

    // Сначала обновляем себя, затем кэш: подписчики кэша при ререндере уже увидят новую модель.
    this.model = model;
    this.queryClient.setQueryData<OrgSnapshot>(this.queryKey, nextSnapshot);
    // В кэш попадает структурно разделённая копия — запоминаем именно её ссылку.
    this.snapshot = this.queryClient.getQueryData<OrgSnapshot>(this.queryKey) ?? nextSnapshot;

    return model === this.model && changed.size === 0 ? 'noop' : 'applied';
  }

  /** Полный перезапрос снимка: разрыв в seq, рестарт сервера, явный resync. */
  async resync(): Promise<void> {
    await this.queryClient.invalidateQueries({ queryKey: this.queryKey });
  }

  /** Предзагрузка снимка, чтобы патчи можно было применять сразу. */
  async ensureSnapshot(): Promise<void> {
    await this.queryClient.ensureQueryData({
      queryKey: this.queryKey,
      queryFn: ({ signal }) => fetchOrgTree(this.queryKey[1].scenario, signal),
    });
  }

  private recordFlashes(changed: ReadonlyMap<NodeId, ReadonlySet<ChangedField>>): void {
    const now = this.now();
    const next = new Map<NodeId, ReadonlyMap<ChangedField, number>>();
    // Старые отметки отбрасываем, чтобы карта не росла бесконечно. Узел, которого этот патч
    // не коснулся и у которого ничего не истекло, переносится той же ссылкой на Map — иначе
    // строки таблицы/дерева теряют мемоизацию на все ~FLASH_TTL_MS после каждого чужого патча.
    for (const [id, fields] of this.flashMap) {
      if (changed.has(id)) continue;
      const expired = [...fields.values()].some((at) => now - at >= FLASH_TTL_MS);
      if (!expired) {
        next.set(id, fields);
        continue;
      }
      const fresh = new Map([...fields].filter(([, at]) => now - at < FLASH_TTL_MS));
      if (fresh.size > 0) next.set(id, fresh);
    }
    for (const [id, fields] of changed) {
      const merged = new Map(this.flashMap.get(id) ?? []);
      for (const field of fields) merged.set(field, now);
      next.set(id, merged);
    }
    this.flashMap = next;
  }
}
