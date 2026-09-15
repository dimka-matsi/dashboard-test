import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOrgModel } from '@/entities/org/model/org-model';
import { jsonResponse, makeOrgFixture } from '@/test/fixtures';
import { TableWithSearch } from '@/test/harness';
import { renderWithProviders } from '@/test/render';

const model = buildOrgModel(makeOrgFixture());

function visibleRowNames(): string[] {
  return [...screen.getByRole('grid').querySelectorAll('tbody tr[data-node-id]')].map(
    (tr) => tr.querySelector('td')?.textContent ?? '',
  );
}

describe('SearchBox + AnalyticsTablePanel', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('фраза на естественном языке уходит на сервер и превращается в структурированный фильтр', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        filter: { levels: [2], performance: { max: 65 } },
        source: 'llm',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<TableWithSearch model={model} />);

    await user.type(screen.getByRole('searchbox'), 'отделы с эффективностью ниже 65');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await screen.findByText('AI-фильтр');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/search/parse');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ query: 'отделы с эффективностью ниже 65' });

    expect(visibleRowNames()).toEqual(['Отдел А2', 'Отдел Б1']);
    const chips = within(screen.getByRole('list', { name: 'Активный фильтр' })).getAllByRole(
      'listitem',
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(['уровень: отдел', 'эффективность ≤ 65']);
  });

  it('если сервер не распознал условия — остаётся текстовый поиск', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ filter: null, source: 'none' })),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<TableWithSearch model={model} />);

    await user.type(screen.getByRole('searchbox'), 'команда а1');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await screen.findByText('текстовый поиск');
    expect(visibleRowNames()).toEqual(['Команда А1-1', 'Команда А1-2']);
  });

  it('ошибка сервера разбора не ломает текстовый поиск', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'down' }, { status: 500 })),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<TableWithSearch model={model} />);
    await user.type(screen.getByRole('searchbox'), 'отдел а');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    await screen.findByText('текстовый поиск');
    expect(visibleRowNames()).toEqual(['Отдел А1', 'Отдел А2']);
  });

  it('одно слово не отправляется на разбор', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<TableWithSearch model={model} />);
    await user.type(screen.getByRole('searchbox'), 'команда');
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(visibleRowNames()).toHaveLength(4);
  });
});
