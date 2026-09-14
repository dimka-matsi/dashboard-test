import type { NodeChange, OrgNode, PatchMessage } from '@staff-pulse/contracts';

/**
 * Состояние орг-структуры в памяти сервера.
 * `version` (seq) растёт ровно на 1 при каждом применённом патче, поэтому ETag меняется
 * только при реальном изменении данных, а клиент по номеру seq видит пропуски.
 */
export class OrgState {
  private readonly nodes = new Map<string, OrgNode>();
  private seq = 0;
  private snapshotCache: OrgNode[] | null = null;
  /** Кольцевой буфер последних патчей для досылки при переподключении. */
  private readonly patches: PatchMessage[] = [];

  /** Идентификатор процесса: после рестарта сервера меняется, чтобы клиенты не доверяли старым ETag/seq. */
  readonly serverId: string;
  private readonly patchBufferSize: number;

  constructor(
    initial: readonly OrgNode[],
    serverId: string = randomServerId(),
    patchBufferSize = 500,
  ) {
    for (const node of initial) this.nodes.set(node.id, node);
    this.serverId = serverId;
    this.patchBufferSize = patchBufferSize;
  }

  get version(): number {
    return this.seq;
  }

  get size(): number {
    return this.nodes.size;
  }

  get(id: string): OrgNode | undefined {
    return this.nodes.get(id);
  }

  ids(): string[] {
    return [...this.nodes.keys()];
  }

  /** Полный снимок. Массив кэшируется до следующего изменения. */
  snapshot(): OrgNode[] {
    this.snapshotCache ??= [...this.nodes.values()];
    return this.snapshotCache;
  }

  etag(): string {
    return `W/"${this.serverId}-${this.seq}"`;
  }

  /**
   * Применяет изменения одним патчем: seq += 1, узлы заменяются новыми объектами.
   * Изменения неизвестных узлов отбрасываются; если применять нечего — возвращает null.
   */
  applyChanges(changes: readonly NodeChange[]): PatchMessage | null {
    const applied: NodeChange[] = [];
    for (const change of changes) {
      const current = this.nodes.get(change.id);
      if (!current) continue;
      this.nodes.set(change.id, { ...current, ...change.fields, updatedAt: change.updatedAt });
      applied.push(change);
    }
    if (applied.length === 0) return null;

    this.snapshotCache = null;
    this.seq += 1;
    const patch: PatchMessage = { type: 'patch', seq: this.seq, changes: applied };
    this.patches.push(patch);
    if (this.patches.length > this.patchBufferSize) this.patches.shift();
    return patch;
  }

  /**
   * Патчи с seq > since. null — если пропуск больше буфера (клиенту нужен полный снимок).
   * since >= текущего seq даёт пустой массив.
   */
  patchesSince(since: number): PatchMessage[] | null {
    if (since >= this.seq) return [];
    const oldest = this.patches[0];
    if (!oldest || oldest.seq > since + 1) return null;
    return this.patches.filter((patch) => patch.seq > since);
  }
}

function randomServerId(): string {
  return Math.random().toString(36).slice(2, 10);
}
