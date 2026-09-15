import type { OrgModel } from '@/entities/org/model/org-model';
import type { NodeId } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { AnalyticsTablePanel } from '@/features/analytics-table/AnalyticsTablePanel';
import { SearchBox } from '@/features/search/SearchBox';
import { useSearch } from '@/features/search/use-search';

const NO_FLASHES: FlashMap = new Map();
const noop = (): void => undefined;

/** Таблица вместе со строкой поиска, как в шапке дашборда, но без остального экрана. */
export function TableWithSearch({
  model,
  selectedId = null,
  onSelect = noop,
  flashes = NO_FLASHES,
}: {
  model: OrgModel;
  selectedId?: NodeId | null;
  onSelect?: (id: NodeId) => void;
  flashes?: FlashMap;
}) {
  const search = useSearch();
  return (
    <>
      <SearchBox
        value={search.query}
        onChange={search.setQuery}
        source={search.source}
        isParsing={search.parse.isParsing}
      />
      <AnalyticsTablePanel
        model={model}
        flashes={flashes}
        selectedId={selectedId}
        onSelect={onSelect}
        search={search}
      />
    </>
  );
}
