import type { OrgNode } from '@staff-pulse/contracts';

/**
 * Состояние орг-структуры в памяти сервера.
 * `version` растёт только при реальном изменении данных, поэтому ETag меняется
 * тоже только тогда — клиент получает 304 и не трогает свой кэш.
 */
export class OrgState {
  private readonly nodes = new Map<string, OrgNode>();
  private seq = 0;
  private snapshotCache: OrgNode[] | null = null;

  /** Идентификатор процесса: после рестарта сервера меняется, чтобы клиенты не доверяли старым ETag/seq. */
  readonly serverId: string;

  constructor(initial: readonly OrgNode[], serverId: string = randomServerId()) {
    for (const node of initial) this.nodes.set(node.id, node);
    this.serverId = serverId;
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

  protected replace(node: OrgNode): void {
    this.nodes.set(node.id, node);
    this.snapshotCache = null;
  }

  protected bump(): number {
    this.seq += 1;
    return this.seq;
  }
}

function randomServerId(): string {
  return Math.random().toString(36).slice(2, 10);
}
